"""
Production-ready GitHub routes.

NOTE:
- Replace localhost by setting FRONTEND_URL in your environment.
- Configure GitHub OAuth credentials through environment variables.
"""

import logging
import os
from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from app.core.database import get_database
from app.core.github_config import github_config
from app.models.github import GitHubConnectionStatus
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.github_oauth import github_oauth_service
from app.services.github_service import github_service

logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(prefix="/github", tags=["GitHub Integration"])

oauth_states: dict = {}
STATE_TTL_MINUTES = 10


def cleanup_states():
    now = datetime.utcnow()
    expired = [
        k for k, v in oauth_states.items()
        if now - v["created_at"] > timedelta(minutes=STATE_TTL_MINUTES)
    ]
    for key in expired:
        oauth_states.pop(key, None)


@router.get("/login")
async def github_login(current_user: User = Depends(get_current_user)):
    """
    Initiate GitHub OAuth flow

    Redirects user to GitHub authorization page
    """
    cleanup_states()

    if not github_config.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured."
        )

    state = github_oauth_service.generate_state()

    oauth_states[state] = {
        "user_id": current_user.id,
        "created_at": datetime.utcnow()
    }

    return {
        "authorization_url": github_oauth_service.get_authorization_url(state)
    }


@router.get("/callback")
async def github_callback(code: str, state: str):
    """
    GitHub OAuth callback endpoint

    Exchanges code for access token and stores GitHub data
    """
    cleanup_states()

    if state not in oauth_states:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state."
        )

    user_id = oauth_states.pop(state)["user_id"]

    try:
        token = await github_oauth_service.exchange_code_for_token(code)
        github_user = await github_oauth_service.get_user_info(token)

        db = get_database()

        github_data = {
            "github_id": github_user["id"],
            "username": github_user["login"],
            "email": github_user.get("email"),
            "name": github_user.get("name"),
            "avatar_url": github_user.get("avatar_url"),
            "bio": github_user.get("bio"),
            "public_repos": github_user.get("public_repos", 0),
            "followers": github_user.get("followers", 0),
            "following": github_user.get("following", 0),
            "profile_url": github_user["html_url"],
            "access_token": token,
            "connected_at": datetime.utcnow(),
            "last_sync": datetime.utcnow(),
        }

        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"github_data": github_data}}
        )

        logger.info("GitHub connected for user %s", user_id)

        return RedirectResponse(
            url=f"{FRONTEND_URL}/github?connected=true"
        )

    except Exception:
        logger.exception("GitHub OAuth failed")

        return RedirectResponse(
            url=f"{FRONTEND_URL}/github?error=connection_failed"
        )


@router.get("/status", response_model=GitHubConnectionStatus)
async def github_status(current_user: User = Depends(get_current_user)):
    """
    Get GitHub connection status for current user
    """
    db = get_database()

    user = await db.users.find_one(
        {"_id": ObjectId(current_user.id)}
    )

    if not user or "github_data" not in user:
        return GitHubConnectionStatus(connected=False)

    data = user["github_data"]

    return GitHubConnectionStatus(
        connected=True,
        username=data.get("username"),
        avatar_url=data.get("avatar_url"),
        connected_at=data.get("connected_at"),
        repos_count=data.get("public_repos", 0),
    )


@router.delete("/disconnect")
async def disconnect(current_user: User = Depends(get_current_user)):
    """
    Disconnect GitHub account from user profile
    """
    db = get_database()

    result = await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$unset": {"github_data": ""}},
    )

    if not result.modified_count:
        raise HTTPException(404, "GitHub account not connected.")

    return {"message": "GitHub disconnected successfully."}


async def _access_token(user_id: str):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})

    if not user or "github_data" not in user:
        raise HTTPException(400, "GitHub account not connected.")

    token = user["github_data"].get("access_token")

    if not token:
        raise HTTPException(401, "GitHub access token missing.")

    return token, db


@router.get("/repositories")
async def repositories(
    sort: str = Query(
        default="updated",
        pattern="^(created|updated|pushed|full_name)$"
    ),
    per_page: int = Query(default=30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """
    Get user's GitHub repositories
    """
    token, _ = await _access_token(current_user.id)

    try:
        repos = await github_service.get_repositories(
            access_token=token,
            sort=sort,
            per_page=per_page,
        )

        return {"count": len(repos), "repositories": repos}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching repositories")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch repositories"
        )


@router.get("/repositories/{owner}/{repo}/commits")
async def get_repo_commits(
    owner: str,
    repo: str,
    per_page: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """
    Get commits from a specific repository
    """
    token, _ = await _access_token(current_user.id)

    try:
        commits = await github_service.get_commits(
            access_token=token,
            owner=owner,
            repo=repo,
            per_page=per_page,
        )

        return {"commits": commits, "count": len(commits)}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching commits")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch commits"
        )


@router.post("/repositories/{owner}/{repo}/commits/{sha}/analyze")
async def analyze_commit(
    owner: str,
    repo: str,
    sha: str,
    current_user: User = Depends(get_current_user),
):
    """
    Analyze a specific commit using AI
    """
    token, db = await _access_token(current_user.id)

    try:
        analysis = await github_service.analyze_commit(
            access_token=token,
            owner=owner,
            repo=repo,
            sha=sha,
        )

        review_data = {
            "user_id": current_user.id,
            "source": "github_commit",
            "repository": f"{owner}/{repo}",
            "commit_sha": sha,
            "commit_message": analysis.get("commit_message", ""),
            "files_changed": analysis.get("files_changed", 0),
            "language": "multiple",
            "scores": {
                "overall_score": analysis.get("overall_score", 0)
            },
            "ai_feedback": {
                "summary": analysis.get("feedback", ""),
                "suggestions": analysis.get("suggestions", []),
            },
            "created_at": datetime.utcnow(),
        }

        result = await db.reviews.insert_one(review_data)

        return {
            "review_id": str(result.inserted_id),
            "analysis": analysis,
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error analyzing commit")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze commit"
        )


@router.get("/profile")
async def get_github_profile(current_user: User = Depends(get_current_user)):
    """
    Get connected GitHub profile information
    """
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})

    if not user or "github_data" not in user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub account not connected"
        )

    github_data = user["github_data"]

    # Remove sensitive data
    profile = {
        "github_id": github_data.get("github_id"),
        "username": github_data.get("username"),
        "name": github_data.get("name"),
        "email": github_data.get("email"),
        "avatar_url": github_data.get("avatar_url"),
        "bio": github_data.get("bio"),
        "public_repos": github_data.get("public_repos", 0),
        "followers": github_data.get("followers", 0),
        "following": github_data.get("following", 0),
        "profile_url": github_data.get("profile_url"),
        "connected_at": github_data.get("connected_at"),
    }

    return profile

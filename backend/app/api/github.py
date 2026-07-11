from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import RedirectResponse
from app.models.user import User
from app.models.github import GitHubConnectionStatus
from app.services.auth_service import get_current_user, AuthService
from app.services.github_oauth import github_oauth_service
from app.services.github_service import github_service
from app.core.database import get_database
from app.core.github_config import github_config
from bson import ObjectId
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/github", tags=["GitHub Integration"])

# Store OAuth states temporarily (in production, use Redis)
oauth_states = {}


@router.get("/login")
async def github_login(current_user: User = Depends(get_current_user)):
    """
    Initiate GitHub OAuth flow
    
    Redirects user to GitHub authorization page
    """
    if not github_config.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured. Please contact administrator."
        )
    
    # Generate state for CSRF protection
    state = github_oauth_service.generate_state()
    
    # Store state with user ID
    oauth_states[state] = {
        "user_id": current_user.id,
        "created_at": datetime.utcnow()
    }
    
    # Get authorization URL
    auth_url = github_oauth_service.get_authorization_url(state)
    
    return {"authorization_url": auth_url}


@router.get("/callback")
async def github_callback(code: str, state: str):
    """
    GitHub OAuth callback endpoint
    
    Exchanges code for access token and stores GitHub data
    """
    # Verify state
    if state not in oauth_states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter. Please try again."
        )
    
    oauth_data = oauth_states.pop(state)
    user_id = oauth_data["user_id"]
    
    try:
        # Exchange code for access token
        access_token = await github_oauth_service.exchange_code_for_token(code)
        
        # Get GitHub user info
        github_user = await github_oauth_service.get_user_info(access_token)
        
        # Store in database
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
            "access_token": access_token,
            "connected_at": datetime.utcnow(),
            "last_sync": datetime.utcnow()
        }
        
        # Update user with GitHub data
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"github_data": github_data}}
        )
        
        logger.info(f"User {user_id} connected GitHub account: {github_user['login']}")
        
        # Redirect to frontend
        frontend_url = "http://localhost:5173/github?connected=true"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        logger.error(f"Error in GitHub callback: {str(e)}")
        # Redirect to frontend with error
        frontend_url = "http://localhost:5173/github?error=connection_failed"
        return RedirectResponse(url=frontend_url)


@router.get("/status", response_model=GitHubConnectionStatus)
async def get_github_status(current_user: User = Depends(get_current_user)):
    """
    Get GitHub connection status for current user
    """
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    
    if not user or "github_data" not in user:
        return GitHubConnectionStatus(connected=False)
    
    github_data = user["github_data"]
    
    return GitHubConnectionStatus(
        connected=True,
        username=github_data.get("username"),
        avatar_url=github_data.get("avatar_url"),
        connected_at=github_data.get("connected_at"),
        repos_count=github_data.get("public_repos", 0)
    )


@router.delete("/disconnect")
async def disconnect_github(current_user: User = Depends(get_current_user)):
    """
    Disconnect GitHub account from user profile
    """
    db = get_database()
    
    result = await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$unset": {"github_data": ""}}
    )
    
    if result.modified_count > 0:
        logger.info(f"User {current_user.id} disconnected GitHub account")
        return {"message": "GitHub account disconnected successfully"}
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No GitHub connection found"
    )


@router.get("/repositories")
async def get_repositories(
    sort: str = Query(default="updated", regex="^(created|updated|pushed|full_name)$"),
    per_page: int = Query(default=30, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's GitHub repositories
    """
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    
    if not user or "github_data" not in user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub account not connected. Please connect your GitHub account first."
        )
    
    access_token = user["github_data"].get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub access token not found. Please reconnect your account."
        )
    
    try:
        repositories = await github_service.get_repositories(
            access_token=access_token,
            sort=sort,
            per_page=per_page
        )
        
        return {"repositories": repositories, "count": len(repositories)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching repositories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch repositories"
        )


@router.get("/repositories/{owner}/{repo}/commits")
async def get_repo_commits(
    owner: str,
    repo: str,
    per_page: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """
    Get commits from a specific repository
    """
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    
    if not user or "github_data" not in user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub account not connected"
        )
    
    access_token = user["github_data"].get("access_token")
    
    try:
        commits = await github_service.get_commits(
            access_token=access_token,
            owner=owner,
            repo=repo,
            per_page=per_page
        )
        
        return {"commits": commits, "count": len(commits)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching commits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch commits"
        )


@router.post("/repositories/{owner}/{repo}/commits/{sha}/analyze")
async def analyze_commit(
    owner: str,
    repo: str,
    sha: str,
    current_user: User = Depends(get_current_user)
):
    """
    Analyze a specific commit using AI
    """
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    
    if not user or "github_data" not in user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub account not connected"
        )
    
    access_token = user["github_data"].get("access_token")
    
    try:
        # Analyze the commit
        analysis = await github_service.analyze_commit(
            access_token=access_token,
            owner=owner,
            repo=repo,
            sha=sha
        )
        
        # Store the analysis
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
                "suggestions": analysis.get("suggestions", [])
            },
            "created_at": datetime.utcnow()
        }
        
        result = await db.reviews.insert_one(review_data)
        
        return {
            "review_id": str(result.inserted_id),
            "analysis": analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing commit: {str(e)}")
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
        "connected_at": github_data.get("connected_at")
    }
    
    return profile
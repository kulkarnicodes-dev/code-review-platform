import requests
import base64
import logging
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from datetime import datetime

from app.core.github_config import github_config
from app.models.github import GitHubRepository, GitHubCommit, GitHubFile
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)


class GitHubService:
    """Service for interacting with GitHub API"""

    def __init__(self):
        self.api_base = github_config.API_BASE_URL

    def _get_headers(self, access_token: str) -> Dict[str, str]:
        """Get headers for GitHub API requests"""
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json"
        }

    def _handle_rate_limit(self, response: requests.Response):
        """Check and handle GitHub API rate limits"""
        remaining = int(response.headers.get("X-RateLimit-Remaining", 0))
        if remaining < github_config.RATE_LIMIT_BUFFER:
            logger.warning(f"GitHub API rate limit low: {remaining} requests remaining")

    async def get_repositories(
        self,
        access_token: str,
        sort: str = "updated",
        per_page: int = 30
    ) -> List[GitHubRepository]:
        """
        Get user's repositories from GitHub

        Args:
            access_token: GitHub access token
            sort: Sort by (created, updated, pushed, full_name)
            per_page: Results per page

        Returns:
            List of repositories
        """
        try:
            headers = self._get_headers(access_token)
            params = {
                "sort": sort,
                "per_page": per_page,
                "affiliation": "owner,collaborator"
            }

            response = requests.get(
                github_config.REPOS_API_URL,
                headers=headers,
                params=params
            )

            self._handle_rate_limit(response)

            if response.status_code != 200:
                logger.error(f"Failed to fetch repositories: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch repositories from GitHub"
                )

            repos_data = response.json()

            repositories = []
            for repo in repos_data:
                repositories.append(GitHubRepository(
                    id=repo["id"],
                    name=repo["name"],
                    full_name=repo["full_name"],
                    description=repo.get("description"),
                    html_url=repo["html_url"],
                    language=repo.get("language"),
                    stargazers_count=repo["stargazers_count"],
                    forks_count=repo["forks_count"],
                    open_issues_count=repo["open_issues_count"],
                    default_branch=repo.get("default_branch", "main"),
                    private=repo["private"],
                    updated_at=datetime.fromisoformat(repo["updated_at"].replace("Z", "+00:00"))
                ))

            return repositories

        except requests.RequestException as e:
            logger.error(f"Request error fetching repositories: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to connect to GitHub"
            )

    async def get_commits(
        self,
        access_token: str,
        owner: str,
        repo: str,
        per_page: int = 10
    ) -> List[GitHubCommit]:
        """
        Get commits from a repository

        Args:
            access_token: GitHub access token
            owner: Repository owner
            repo: Repository name
            per_page: Number of commits to fetch

        Returns:
            List of commits
        """
        try:
            headers = self._get_headers(access_token)
            url = f"{self.api_base}/repos/{owner}/{repo}/commits"

            response = requests.get(
                url,
                headers=headers,
                params={"per_page": per_page}
            )

            self._handle_rate_limit(response)

            if response.status_code != 200:
                logger.error(f"Failed to fetch commits: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch commits for {owner}/{repo}"
                )

            commits_data = response.json()

            commits = []
            for commit in commits_data:
                commit_info = commit["commit"]
                commits.append(GitHubCommit(
                    sha=commit["sha"],
                    message=commit_info["message"],
                    author_name=commit_info["author"]["name"],
                    author_email=commit_info["author"]["email"],
                    date=datetime.fromisoformat(commit_info["author"]["date"].replace("Z", "+00:00")),
                    url=commit["html_url"],
                    additions=0,
                    deletions=0,
                    total_changes=0
                ))

            return commits

        except requests.RequestException as e:
            logger.error(f"Request error fetching commits: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to fetch commits from GitHub"
            )

    async def get_commit_details(
        self,
        access_token: str,
        owner: str,
        repo: str,
        sha: str
    ) -> Dict[str, Any]:
        """
        Get detailed commit information including file changes

        Args:
            access_token: GitHub access token
            owner: Repository owner
            repo: Repository name
            sha: Commit SHA

        Returns:
            Detailed commit data
        """
        try:
            headers = self._get_headers(access_token)
            url = f"{self.api_base}/repos/{owner}/{repo}/commits/{sha}"

            response = requests.get(url, headers=headers)

            self._handle_rate_limit(response)

            if response.status_code != 200:
                logger.error(f"Failed to fetch commit details: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch commit {sha}"
                )

            commit_data = response.json()

            files = []
            for file in commit_data.get("files", []):
                files.append(GitHubFile(
                    filename=file["filename"],
                    status=file["status"],
                    additions=file["additions"],
                    deletions=file["deletions"],
                    changes=file["changes"],
                    patch=file.get("patch")
                ))

            return {
                "sha": commit_data["sha"],
                "message": commit_data["commit"]["message"],
                "author": commit_data["commit"]["author"]["name"],
                "date": commit_data["commit"]["author"]["date"],
                "url": commit_data["html_url"],
                "stats": commit_data.get("stats", {}),
                "files": files
            }

        except requests.RequestException as e:
            logger.error(f"Request error fetching commit details: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to fetch commit details from GitHub"
            )

    async def analyze_commit(
        self,
        access_token: str,
        owner: str,
        repo: str,
        sha: str
    ) -> Dict[str, Any]:
        """
        Analyze a commit using AI

        Args:
            access_token: GitHub access token
            owner: Repository owner
            repo: Repository name
            sha: Commit SHA

        Returns:
            AI analysis of the commit
        """
        # Get commit details
        commit_details = await self.get_commit_details(access_token, owner, repo, sha)

        # Prepare code for AI analysis
        code_changes = []
        for file in commit_details["files"]:
            if file.patch:
                code_changes.append({
                    "filename": file.filename,
                    "status": file.status,
                    "patch": file.patch,
                    "additions": file.additions,
                    "deletions": file.deletions
                })

        if not code_changes:
            return {
                "overall_score": 0,
                "feedback": "No code changes found in this commit.",
                "suggestions": [],
                "file_reviews": []
            }

        # Build diff text for AI
        files_text = "\n\n".join([
            f"File: {change['filename']} ({change['status']})\n"
            f"Changes: +{change['additions']} -{change['deletions']}\n\n"
            f"Diff:\n{change['patch']}"
            for change in code_changes
        ])

        # FIX: call analyze_code with only (code, language) — no filename param
        ai_response = await ai_service.analyze_code(
            code=files_text,
            language="diff"
        )

        # FIX: use the correct keys returned by analyze_code
        return {
            "commit_sha": sha,
            "repository": f"{owner}/{repo}",
            "commit_message": commit_details["message"],
            "files_changed": len(code_changes),
            "overall_score": ai_response.get("overall_score", 0),
            "feedback": ai_response.get("feedback", ""),
            "suggestions": ai_response.get("suggestions", []),
            "security_issues": [],
            "file_reviews": code_changes
        }

    async def get_file_content(
        self,
        access_token: str,
        owner: str,
        repo: str,
        path: str,
        ref: str = "main"
    ) -> str:
        """
        Get content of a file from repository

        Args:
            access_token: GitHub access token
            owner: Repository owner
            repo: Repository name
            path: File path in repository
            ref: Branch/commit reference

        Returns:
            File content as string
        """
        try:
            headers = self._get_headers(access_token)
            url = f"{self.api_base}/repos/{owner}/{repo}/contents/{path}"

            response = requests.get(
                url,
                headers=headers,
                params={"ref": ref}
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch file {path}"
                )

            file_data = response.json()

            # Decode base64 content
            content = base64.b64decode(file_data["content"]).decode("utf-8")

            return content

        except Exception as e:
            logger.error(f"Error fetching file content: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch file content"
            )


# ---------------------------------------------------------
# Utility function for fetching public GitHub repo code
# Used by review.py
# ---------------------------------------------------------

def fetch_repo_code(repo_url: str) -> str:
    """
    Fetch raw code files from a public GitHub repository.
    This is a simple implementation for demo purposes.
    """

    if "github.com" not in repo_url:
        raise ValueError("Invalid GitHub URL")

    try:
        parts = repo_url.rstrip("/").split("/")
        owner = parts[-2]
        repo = parts[-1]

        api_url = f"https://api.github.com/repos/{owner}/{repo}/contents"

        response = requests.get(api_url)

        if response.status_code != 200:
            raise Exception("Failed to fetch repository contents")

        files = response.json()

        code_data = ""

        for file in files:
            if file["type"] == "file":
                raw_file = requests.get(file["download_url"])
                if raw_file.status_code == 200:
                    code_data += f"\n\n# File: {file['name']}\n"
                    code_data += raw_file.text

        return code_data

    except Exception as e:
        raise Exception(f"Error fetching repo code: {str(e)}")


github_service = GitHubService()
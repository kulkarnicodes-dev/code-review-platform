import secrets
import requests
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from app.core.github_config import github_config
import logging

logger = logging.getLogger(__name__)

class GitHubOAuthService:
    """Handle GitHub OAuth 2.0 flow"""
    
    def __init__(self):
        self.client_id = github_config.CLIENT_ID
        self.client_secret = github_config.CLIENT_SECRET
        self.callback_url = github_config.CALLBACK_URL
        
        if not github_config.is_configured:
            logger.warning("GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.")
    
    def generate_state(self) -> str:
        """Generate random state for CSRF protection"""
        return secrets.token_urlsafe(32)
    
    def get_authorization_url(self, state: str) -> str:
        """Get GitHub OAuth authorization URL"""
        return github_config.get_authorize_url(state)
    
    async def exchange_code_for_token(self, code: str) -> str:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from GitHub
            
        Returns:
            GitHub access token
            
        Raises:
            HTTPException: If token exchange fails
        """
        try:
            response = requests.post(
                github_config.TOKEN_URL,
                headers={"Accept": "application/json"},
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": self.callback_url,
                }
            )
            
            if response.status_code != 200:
                logger.error(f"GitHub token exchange failed: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange code for token"
                )
            
            data = response.json()
            
            if "error" in data:
                logger.error(f"GitHub OAuth error: {data.get('error_description', data['error'])}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=data.get("error_description", "OAuth error")
                )
            
            access_token = data.get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No access token in response"
                )
            
            return access_token
            
        except requests.RequestException as e:
            logger.error(f"Request error during token exchange: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to connect to GitHub"
            )
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get GitHub user information using access token
        
        Args:
            access_token: GitHub access token
            
        Returns:
            User info dictionary
            
        Raises:
            HTTPException: If request fails
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            # Get user profile
            response = requests.get(github_config.USER_API_URL, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch GitHub user: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch user information"
                )
            
            user_data = response.json()
            
            # Get user emails if email is null in profile
            if not user_data.get("email"):
                email_response = requests.get(
                    f"{github_config.API_BASE_URL}/user/emails",
                    headers=headers
                )
                if email_response.status_code == 200:
                    emails = email_response.json()
                    primary_email = next(
                        (e["email"] for e in emails if e["primary"]),
                        None
                    )
                    if primary_email:
                        user_data["email"] = primary_email
            
            return user_data
            
        except requests.RequestException as e:
            logger.error(f"Request error fetching user info: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to fetch user information from GitHub"
            )
    
    def verify_state(self, received_state: str, stored_state: str) -> bool:
        """Verify state parameter to prevent CSRF attacks"""
        return secrets.compare_digest(received_state, stored_state)

github_oauth_service = GitHubOAuthService()
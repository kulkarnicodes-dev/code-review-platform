from app.core.config import settings


class GitHubConfig:
    """GitHub OAuth and API configuration"""

    RATE_LIMIT_BUFFER = 100   # ← ADD THIS BACK

    @property
    def CLIENT_ID(self):
        return settings.GITHUB_CLIENT_ID

    @property
    def CLIENT_SECRET(self):
        return settings.GITHUB_CLIENT_SECRET

    @property
    def CALLBACK_URL(self):
        return settings.GITHUB_REDIRECT_URI

    AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"

    API_BASE_URL = "https://api.github.com"
    USER_API_URL = f"{API_BASE_URL}/user"
    REPOS_API_URL = f"{API_BASE_URL}/user/repos"

    SCOPES = "user:email repo"

    @property
    def is_configured(self) -> bool:
        return bool(self.CLIENT_ID and self.CLIENT_SECRET)

    def get_authorize_url(self, state: str) -> str:
        return (
            f"{self.AUTHORIZE_URL}"
            f"?client_id={self.CLIENT_ID}"
            f"&redirect_uri={self.CALLBACK_URL}"
            f"&scope={self.SCOPES}"
            f"&state={state}"
        )


github_config = GitHubConfig()
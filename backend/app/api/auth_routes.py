from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
import os

router = APIRouter()

# Frontend URL (Render/Vercel)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Google OAuth Credentials
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# Initialize OAuth
oauth = OAuth()

oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    },
)


@router.get("/google/login")
async def google_login(request: Request):
    """
    Redirect user to Google Login
    """

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth credentials are not configured."
        )

    redirect_uri = request.url_for("google_callback")

    return await oauth.google.authorize_redirect(
        request,
        str(redirect_uri)
    )


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request):
    """
    Handle Google OAuth Callback
    """

    try:
        token = await oauth.google.authorize_access_token(request)

        user = token.get("userinfo")

        if not user:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/login?error=auth_failed"
            )

        request.session["user"] = {
            "email": user.get("email"),
            "name": user.get("name"),
            "picture": user.get("picture"),
        }

        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard"
        )

    except Exception as e:
        print(f"Google OAuth Error: {e}")

        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=google_oauth_failed"
        )

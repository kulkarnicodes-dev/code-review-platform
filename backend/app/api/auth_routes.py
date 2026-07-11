from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
import os

router = APIRouter()

# Initialize OAuth
oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

@router.get("/google/login")
async def google_login(request: Request):
    # Use absolute URL for redirect_uri
    redirect_uri = str(request.url_for("google_callback"))
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user = token.get("userinfo")
        
        if not user:
            return RedirectResponse("http://localhost:5173/login?error=auth_failed")
        
        email = user.get("email")
        
        # Store user info in session (more secure than URL params)
        request.session["user"] = {
            "email": email,
            "name": user.get("name"),
        }
        
        return RedirectResponse("http://localhost:5173/dashboard")
        
    except Exception as e:
        print(f"OAuth error: {e}")
        return RedirectResponse("http://localhost:5173/login?error=auth_failed")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection

from app.api import auth, review, analytics
from app.api.auth_routes import router as google_auth_router
from app.api import admin, gamification, mentor
from app.api.github import router as github_router

app = FastAPI(
    title="Code Review Platform API",
    version="1.0.0"
)

# -----------------------------
# Session Middleware
# -----------------------------
app.add_middleware(
    SessionMiddleware,
    secret_key="25102004589"
)

# -----------------------------
# CORS Middleware
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://code-review-platform-sooty.vercel.app",
        "https://code-review-platform-git-main-yashkulkarni052s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# API Routes
# -----------------------------
app.include_router(google_auth_router, prefix="/api/v1/auth", tags=["Google OAuth"])

app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(review.router, prefix="/api/v1", tags=["Review"])
app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])
app.include_router(gamification.router, prefix="/api/v1", tags=["Gamification"])
app.include_router(mentor.router, prefix="/api/v1", tags=["AI Mentor"])
app.include_router(github_router, prefix="/api/v1", tags=["GitHub"])

# -----------------------------
# Startup
# -----------------------------
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

# -----------------------------
# Shutdown
# -----------------------------
@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

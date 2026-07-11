from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection

from app.api import auth, review, analytics
from app.api.auth_routes import router as google_auth_router
from app.api import admin, gamification, mentor
from app.api.github import router as github_router


app = FastAPI()

# ✅ Session middleware FIRST
app.add_middleware(
    SessionMiddleware,
    secret_key="25102004589"
)

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(google_auth_router, prefix="/api/v1/auth")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(review.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(gamification.router, prefix="/api/v1")
app.include_router(mentor.router, prefix="/api/v1")
app.include_router(github_router,    prefix="/api/v1")



@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

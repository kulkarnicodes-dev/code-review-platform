from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserCreate, UserLogin, Token, User
from app.services.auth_service import AuthService, get_current_user
from app.core.database import get_database
from app.core.security import create_access_token
from datetime import timedelta
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """Register a new user"""
    db = get_database()
    auth_service = AuthService(db)
    return await auth_service.create_user(user)

@router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    """Login user and return access token"""
    db = get_database()
    auth_service = AuthService(db)
    
    user = await auth_service.authenticate_user(user_login.email, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

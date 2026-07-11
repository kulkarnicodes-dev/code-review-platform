from datetime import datetime
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.database import get_database
from app.core.security import verify_password, get_password_hash, decode_access_token
from app.models.user import User, UserCreate, UserInDB
from bson import ObjectId
from app.services.email_service import send_welcome_email

security = HTTPBearer()

class AuthService:
    def __init__(self, db):
        self.db = db
        self.users_collection = db.users
    
    async def create_user(self, user: UserCreate) -> User:
        """Create a new user"""
        existing_user = await self.users_collection.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        password_hash = get_password_hash(user.password)
        
        user_doc = {
            "email": user.email,
            "name": user.name,
            "password_hash": password_hash,
            "github_id": None,
            "profile_pic": None,
            "role": "developer",
            "created_at": datetime.utcnow()
        }
        
        result = await self.users_collection.insert_one(user_doc)
        user_doc["_id"] = str(result.inserted_id)
        
        try:
            send_welcome_email(user.email, user.name)
        except Exception as e:
            print("Email send failed:", e)
        
        return User(**user_doc)

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user = await self.users_collection.find_one({"email": email})
        if not user:
            return None
        
        if not verify_password(password, user["password_hash"]):
            return None
        
        user["_id"] = str(user["_id"])
        return User(**user)
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        user = await self.users_collection.find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
            return User(**user)
        return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        try:
            user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                user["_id"] = str(user["_id"])
                return User(**user)
        except Exception:
            pass
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current authenticated user from token"""

    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    db = get_database()  # ✅ keep as-is if your function is sync
    # db = await get_database()  # ✅ use this if get_database is async
    
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_email(email)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

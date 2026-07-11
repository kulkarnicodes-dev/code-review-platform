from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_database
from app.core.security import (
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User, UserCreate
from app.services.email_service import send_welcome_email

security = HTTPBearer()


class AuthService:
    def __init__(self, db):
        self.db = db
        self.users_collection = db.users

    async def create_user(self, user: UserCreate) -> User:
        """Create a new user"""

        existing_user = await self.users_collection.find_one(
            {"email": user.email}
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # ---------------- DEBUG ----------------
        print("========== REGISTER DEBUG ==========")
        print("Email:", user.email)
        print("Password:", repr(user.password))
        print("Password Length:", len(user.password))
        print("Password Type:", type(user.password))
        print("====================================")
        # ---------------------------------------

        try:
            password_hash = get_password_hash(user.password)
        except Exception as e:
            print("Password Hash Error:", e)
            raise HTTPException(
                status_code=500,
                detail=f"Password hashing failed: {str(e)}",
            )

        user_doc = {
            "email": user.email,
            "name": user.name,
            "password_hash": password_hash,
            "github_id": None,
            "profile_pic": None,
            "role": "developer",
            "created_at": datetime.utcnow(),
        }

        result = await self.users_collection.insert_one(user_doc)

        return_user = {
            "_id": str(result.inserted_id),
            "email": user_doc["email"],
            "name": user_doc["name"],
            "github_id": user_doc["github_id"],
            "profile_pic": user_doc["profile_pic"],
            "role": user_doc["role"],
            "created_at": user_doc["created_at"],
        }

        try:
            send_welcome_email(user.email, user.name)
        except Exception as e:
            print("Email send failed:", e)

        return User(**return_user)

    async def authenticate_user(
        self,
        email: str,
        password: str,
    ) -> Optional[User]:

        user = await self.users_collection.find_one(
            {"email": email}
        )

        if not user:
            return None

        if not verify_password(password, user["password_hash"]):
            return None

        user["_id"] = str(user["_id"])

        return User(
            **{
                "_id": user["_id"],
                "email": user["email"],
                "name": user["name"],
                "github_id": user.get("github_id"),
                "profile_pic": user.get("profile_pic"),
                "role": user.get("role", "developer"),
                "created_at": user.get("created_at"),
            }
        )

    async def get_user_by_email(self, email: str) -> Optional[User]:

        user = await self.users_collection.find_one(
            {"email": email}
        )

        if not user:
            return None

        user["_id"] = str(user["_id"])

        return User(
            **{
                "_id": user["_id"],
                "email": user["email"],
                "name": user["name"],
                "github_id": user.get("github_id"),
                "profile_pic": user.get("profile_pic"),
                "role": user.get("role", "developer"),
                "created_at": user.get("created_at"),
            }
        )

    async def get_user_by_id(
        self,
        user_id: str,
    ) -> Optional[User]:

        try:
            user = await self.users_collection.find_one(
                {"_id": ObjectId(user_id)}
            )

            if not user:
                return None

            user["_id"] = str(user["_id"])

            return User(
                **{
                    "_id": user["_id"],
                    "email": user["email"],
                    "name": user["name"],
                    "github_id": user.get("github_id"),
                    "profile_pic": user.get("profile_pic"),
                    "role": user.get("role", "developer"),
                    "created_at": user.get("created_at"),
                }
            )

        except Exception:
            return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:

    token = credentials.credentials

    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    email = payload.get("sub")

    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    db = get_database()

    auth_service = AuthService(db)

    user = await auth_service.get_user_by_email(email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user

from fastapi import APIRouter, Depends
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.review_service import ReviewService
from app.core.database import get_database

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/stats")
async def get_user_stats(current_user: User = Depends(get_current_user)):
    """Get user statistics and analytics"""
    db = get_database()
    review_service = ReviewService(db)
    return await review_service.get_user_stats(current_user.id)

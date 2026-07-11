from fastapi import APIRouter, Depends
from app.models.user import User
from app.models.mentor import MentorRequest
from app.services.auth_service import get_current_user
from app.services.mentor_service import mentor_service
from app.core.database import get_database
from datetime import datetime

router = APIRouter(prefix="/mentor", tags=["AI Mentor"])


@router.post("/analyze")
async def get_mentor_feedback(
    request: MentorRequest,
    current_user: User = Depends(get_current_user)
):
    """Get personalized AI mentor feedback for code"""
    db = get_database()
    
    # Get mentor feedback
    feedback = await mentor_service.get_mentor_feedback(request)
    
    # Save mentor session to DB
    session_doc = {
        "user_id": current_user.id,
        "language": request.language,
        "code_snippet": request.code,
        "expertise_level": request.expertise_level.value,
        "mentor_feedback": {
            "overall_assessment": feedback.overall_assessment,
            "mistakes_explained": [m.dict() for m in feedback.mistakes_explained],
            "learning_resources": [r.dict() for r in feedback.learning_resources],
            "personalized_tips": feedback.personalized_tips,
            "next_steps": feedback.next_steps,
            "encouragement": feedback.encouragement,
            "skill_areas_to_improve": feedback.skill_areas_to_improve,
            "strengths_identified": feedback.strengths_identified,
        },
        "created_at": datetime.utcnow()
    }
    
    mentor_sessions = db.mentor_sessions
    result = await mentor_sessions.insert_one(session_doc)
    
    return {
        "session_id": str(result.inserted_id),
        "feedback": feedback.dict()
    }


@router.get("/history")
async def get_mentor_history(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Get user's mentor session history"""
    db = get_database()
    mentor_sessions = db.mentor_sessions
    
    sessions = []
    cursor = mentor_sessions.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).limit(limit)
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        sessions.append(doc)
    
    return {"sessions": sessions, "total": len(sessions)}


@router.get("/expertise-levels")
async def get_expertise_levels():
    """Get available expertise levels with descriptions"""
    return {
        "levels": [
            {
                "id": "beginner",
                "name": "Beginner",
                "emoji": "🌱",
                "description": "Just starting out, learning the basics",
                "ideal_for": "Students, self-taught developers in first 0-1 years"
            },
            {
                "id": "intermediate",
                "name": "Intermediate",
                "emoji": "⚡",
                "description": "Comfortable with basics, learning patterns and best practices",
                "ideal_for": "Developers with 1-3 years of experience"
            },
            {
                "id": "expert",
                "name": "Expert",
                "emoji": "🔥",
                "description": "Senior developer, focused on advanced optimization and architecture",
                "ideal_for": "Experienced developers with 3+ years"
            }
        ]
    }

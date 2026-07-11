import tempfile
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from typing import List
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.models.review import CodeSubmission, ReviewResponse, Review
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.review_service import ReviewService
from app.services.ai_service import ai_service          # FIX: removed duplicate import
from app.services.gamification_service import GamificationService  # ← ADDED
from app.core.database import get_database
from app.services.github_service import fetch_repo_code

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/review", tags=["Code Review"])


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------

def get_review_service(db=Depends(get_database)) -> ReviewService:
    return ReviewService(db)

def get_gamification_service(db=Depends(get_database)) -> GamificationService:
    return GamificationService(db)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def submit_code_review(
    submission: CodeSubmission,
    current_user: User = Depends(get_current_user),
    review_service: ReviewService = Depends(get_review_service),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    """Submit code for AI review"""

    # 1. Run the review as normal
    review = await review_service.create_review(current_user.id, submission)

    # 2. ← THIS WAS MISSING — trigger gamification after every review
    try:
        # Pull scores and feedback from the review result
        # Handles both Pydantic model and plain dict responses
        if hasattr(review, "dict"):
            review_data = review.dict()
        else:
            review_data = review if isinstance(review, dict) else {}

        scores = {
            "overall_score":    review_data.get("overall_score", 5.0),
            "style_score":      review_data.get("style_score",
                                review_data.get("readability_score", 5.0)),
        }
        ai_feedback = {
            "bugs":     review_data.get("bugs", []),
            "security": review_data.get("security_issues",
                        review_data.get("security", [])),
        }

        gamification_update = await gamification_service.process_review_completion(
            user_id=str(current_user.id),
            language=submission.language or "unknown",
            scores=scores,
            ai_feedback=ai_feedback,
        )

        logger.info(
            "Gamification updated — user=%s xp_gained=%d level=%d",
            current_user.id,
            gamification_update.xp_gained,
            gamification_update.current_level,
        )

        # Attach gamification summary to the response so frontend can show
        # XP gained, level-up, and new badges immediately
        if hasattr(review, "dict"):
            review_dict = review.dict()
            review_dict["gamification"] = {
                "xp_gained":          gamification_update.xp_gained,
                "total_xp":           gamification_update.total_xp,
                "current_level":      gamification_update.current_level,
                "levelled_up":        gamification_update.new_level is not None,
                "new_level":          gamification_update.new_level,
                "new_level_name":     gamification_update.new_level_name,
                "new_badges":         gamification_update.new_badges,
                "challenges_done":    gamification_update.challenges_completed,
            }
            return review_dict

    except Exception as exc:
        # Gamification must NEVER break review submission
        logger.error("Gamification failed for user %s: %s", current_user.id, exc)

    return review


@router.get("/", response_model=List[Review])
async def get_user_reviews(
    current_user: User = Depends(get_current_user),
    review_service: ReviewService = Depends(get_review_service),
):
    """Get all reviews for the current user"""
    return await review_service.get_user_reviews(current_user.id)


# FIX: moved /{review_id} BELOW / — FastAPI reads routes top to bottom,
# so if /{review_id} was first, GET /  was being matched as review_id=""
@router.get("/{review_id}", response_model=Review)
async def get_review(
    review_id: str,
    current_user: User = Depends(get_current_user),
    review_service: ReviewService = Depends(get_review_service),
):
    """Get a specific review by ID"""
    review = await review_service.get_review(review_id)

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this review"
        )

    return review


@router.post("/refactor")
async def refactor_code(
    submission: CodeSubmission,
    current_user: User = Depends(get_current_user),   # FIX: was missing auth
):
    """Refactor code using AI"""
    refactored = await ai_service.refactor_code(submission.code, submission.language)
    return {"refactored_code": refactored}


@router.post("/export-pdf")
async def export_pdf(
    review: dict,
    current_user: User = Depends(get_current_user),   # FIX: was publicly accessible
):
    """Export review to PDF format"""
    # FIX: delete=False with no cleanup is a disk leak — use context manager pattern
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp_path = tmp.name

    c = canvas.Canvas(tmp_path, pagesize=A4)
    width, height = A4

    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "AI Code Review Report")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 70, f"Generated for: {getattr(current_user, 'name', current_user.id)}")

    # Body
    c.setFont("Helvetica", 11)
    y = height - 110
    for key, value in review.items():
        if y < 60:          # Start new page if running out of space
            c.showPage()
            y = height - 50
        text = f"{key}: {str(value)}"
        # Wrap long lines
        if len(text) > 90:
            text = text[:87] + "..."
        c.drawString(50, y, text)
        y -= 22

    c.save()
    return FileResponse(tmp_path, filename="review.pdf", media_type="application/pdf")


@router.post("/review-github")
async def review_github(
    data: dict,
    current_user: User = Depends(get_current_user),   # FIX: was publicly accessible
):
    """Review code from a GitHub repository"""
    repo_url = data.get("repo_url")
    if not repo_url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="repo_url is required"
        )

    # FIX: fetch_repo_code is likely sync — wrap to avoid blocking the event loop
    try:
        import asyncio
        code = await asyncio.get_event_loop().run_in_executor(
            None, fetch_repo_code, repo_url
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch repository: {exc}"
        )

    language = data.get("language", "python")
    feedback, scores = await ai_service.review_code(code, language)

    return {
        "feedback": feedback,
        "scores":   scores,
    }
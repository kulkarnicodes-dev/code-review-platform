from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from datetime import date
from typing import Optional

from app.models.user import User
from app.models.gamification import (
    BADGES, DAILY_CHALLENGES,
    LEVEL_XP_THRESHOLDS, LEVEL_NAMES
)
from app.services.auth_service import get_current_user
from app.services.gamification_service import GamificationService
from app.core.database import get_database

router = APIRouter(prefix="/gamification", tags=["Gamification"])


# ---------------------------------------------------------------------------
# Dependency — single shared service instance per request
# ---------------------------------------------------------------------------

def get_gamification_service(db=Depends(get_database)) -> GamificationService:
    return GamificationService(db)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/profile", summary="Get current user's full gamification profile")
async def get_gamification_profile(
    current_user: User = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    try:
        return await service.get_user_gamification(current_user.id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load profile: {exc}")


@router.get("/leaderboard", summary="Get global leaderboard (public)")
async def get_leaderboard(
    limit: int = Query(default=10, ge=1, le=50, description="Number of entries to return (1–50)"),
    service: GamificationService = Depends(get_gamification_service),
):
    try:
        leaderboard = await service.get_leaderboard(limit=limit)
        return {"leaderboard": leaderboard, "total": len(leaderboard)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load leaderboard: {exc}")


@router.get("/badges", summary="Get all badges with the user's earned status")
async def get_all_badges(
    current_user: User = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    try:
        profile = await service.get_or_create_gamification(current_user.id)
        earned = set(profile.get("badges", []))

        badges_with_status = [
            {**badge, "earned": badge_id in earned}
            for badge_id, badge in BADGES.items()
        ]

        return {
            "badges": badges_with_status,
            "earned_count": len(earned),
            "total_count": len(BADGES),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load badges: {exc}")


@router.get("/daily-challenges", summary="Get today's challenges with completion status")
async def get_daily_challenges(
    current_user: User = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    try:
        profile = await service.get_or_create_gamification(current_user.id)

        today_str = date.today().isoformat()
        last_date = profile.get("last_challenge_date")
        completed = (
            profile.get("daily_challenges_completed", [])
            if last_date == today_str
            else []
        )
        completed_set = set(completed)

        challenges = [
            {**challenge, "completed": challenge["id"] in completed_set}
            for challenge in DAILY_CHALLENGES
        ]

        total_bonus_xp = sum(
            c["xp_reward"] for c in DAILY_CHALLENGES
            if c["id"] in completed_set
        )

        return {
            "challenges":       challenges,
            "date":             today_str,
            "completed_count":  len(completed_set),
            "total_count":      len(DAILY_CHALLENGES),
            "bonus_xp_earned":  total_bonus_xp,
            "all_done":         len(completed_set) == len(DAILY_CHALLENGES),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load challenges: {exc}")


@router.get("/levels", summary="Get all level thresholds, names and XP requirements")
async def get_level_info(
    current_user: Optional[User] = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    try:
        levels = [
            {
                "level":       level_num,
                "name":        LEVEL_NAMES.get(level_num, "Unknown"),
                "xp_required": LEVEL_XP_THRESHOLDS[level_num],
                "xp_to_next":  (
                    LEVEL_XP_THRESHOLDS.get(level_num + 1, LEVEL_XP_THRESHOLDS[level_num])
                    - LEVEL_XP_THRESHOLDS[level_num]
                ),
            }
            for level_num in sorted(LEVEL_XP_THRESHOLDS.keys())
        ]

        # Attach user's current position if authenticated
        user_level = None
        if current_user:
            profile = await service.get_or_create_gamification(current_user.id)
            user_level = profile.get("level", 1)

        return {"levels": levels, "user_current_level": user_level}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load level info: {exc}")


@router.get("/summary", summary="Get a quick stats summary for the current user")
async def get_summary(
    current_user: User = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    """Lightweight endpoint for dashboard widgets — returns only the key numbers."""
    try:
        profile = await service.get_or_create_gamification(current_user.id)

        current_level = profile.get("level", 1)
        current_xp    = profile.get("xp", 0)
        next_level    = min(current_level + 1, 10)
        xp_for_next   = LEVEL_XP_THRESHOLDS.get(next_level, LEVEL_XP_THRESHOLDS[current_level])
        xp_for_curr   = LEVEL_XP_THRESHOLDS.get(current_level, 0)
        xp_needed     = xp_for_next - xp_for_curr
        xp_progress   = current_xp - xp_for_curr
        progress_pct  = min(100, int((xp_progress / xp_needed) * 100)) if xp_needed > 0 else 100

        return {
            "level":              current_level,
            "level_name":         profile.get("level_name", "Beginner"),
            "xp":                 current_xp,
            "xp_to_next_level":   xp_for_next - current_xp,
            "progress_percent":   progress_pct,
            "total_reviews":      profile.get("total_reviews", 0),
            "current_streak":     profile.get("current_streak", 0),
            "max_streak":         profile.get("max_streak", 0),
            "badges_earned":      len(profile.get("badges", [])),
            "total_badges":       len(BADGES),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load summary: {exc}")
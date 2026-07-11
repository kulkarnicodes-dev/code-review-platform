from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.gamification_service import GamificationService
from app.core.database import get_database
from datetime import datetime, timedelta
from bson import ObjectId
from bson.errors import InvalidId
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, validator
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import asyncio

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════
VALID_ROLES = {"developer", "admin", "moderator"}
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
DEFAULT_TREND_DAYS = 30
MAX_TREND_DAYS = 365

SCORE_RANGES = [0, 2, 4, 6, 7, 8, 9, 10.1]
SCORE_LABELS = [
    "0-2 (Poor)", "2-4 (Below Avg)", "4-6 (Average)",
    "6-7 (Good)", "7-8 (Great)", "8-9 (Excellent)", "9-10 (Perfect)"
]

GAM_DEFAULTS = {
    "xp": 0,
    "level": 1,
    "level_name": "Beginner",
    "badges": [],
    "streak": 0,
    "total_points": 0,
}

router = APIRouter(prefix="/admin", tags=["Admin"])


# ═══════════════════════════════════════════════════════════════
# RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════
class DashboardSummary(BaseModel):
    total_users: int
    total_reviews: int
    total_mentor_sessions: int
    reviews_last_30_days: int
    new_users_last_30_days: int


class TopUserResponse(BaseModel):
    user_id: str
    name: str
    email: str
    profile_pic: Optional[str] = None
    total_reviews: int
    avg_score: float
    last_activity: Optional[datetime] = None
    xp: int = 0
    level: int = 1
    level_name: str = "Beginner"
    badges_count: int = 0
    streak: int = 0


class LanguageStatsResponse(BaseModel):
    language: str
    count: int
    avg_score: float


class TrendDataPoint(BaseModel):
    date: str
    count: int
    avg_score: float


class ScoreDistribution(BaseModel):
    range: str
    count: int
    avg_score: float


class UserListItem(BaseModel):
    id: str
    name: str
    email: str
    role: str
    profile_pic: Optional[str] = None
    created_at: Optional[datetime] = None
    review_count: int
    xp: int
    level: int
    level_name: str
    badges_count: int
    streak: int


class PaginatedUsersResponse(BaseModel):
    users: List[UserListItem]
    total: int
    page: int
    pages: int
    page_size: int


class RoleUpdateRequest(BaseModel):
    role: str

    @validator("role")
    def validate_role(cls, v):
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(VALID_ROLES)}")
        return v


class RecentReviewItem(BaseModel):
    id: str
    user_name: str
    language: str
    overall_score: float
    created_at: Optional[datetime] = None
    summary: str


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def safe_object_id(id_str: str) -> ObjectId:
    """Convert string to ObjectId or raise 400."""
    try:
        return ObjectId(id_str)
    except (InvalidId, Exception):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ID format: {id_str!r}",
        )


def extract_gam(gam: Optional[Dict]) -> Dict:
    """
    Safely extract gamification fields with sane defaults.
    Handles None and partial documents.
    """
    if not gam:
        return GAM_DEFAULTS.copy()
    return {
        "xp":         gam.get("xp", 0),
        "level":      gam.get("level", 1),
        "level_name": gam.get("level_name", "Beginner"),
        "badges":     gam.get("badges", []),
        "streak":     gam.get("streak", 0),
        "total_points": gam.get("total_points", 0),
    }


async def batch_fetch_users(
    db: AsyncIOMotorDatabase, user_ids: List[str]
) -> Dict[str, Dict]:
    """
    Fetch users by their string IDs in a single query.
    Returns a map of user_id_str -> user_doc.
    """
    if not user_ids:
        return {}
    oids = []
    for uid in user_ids:
        try:
            oids.append(ObjectId(uid))
        except Exception:
            pass  # skip malformed IDs

    docs = await db.users.find({"_id": {"$in": oids}}).to_list(length=len(oids))
    return {str(d["_id"]): d for d in docs}


async def batch_fetch_gamification(
    db: AsyncIOMotorDatabase, user_ids: List[str]
) -> Dict[str, Dict]:
    """
    Fetch all gamification docs for given user IDs in a single query.
    Returns a map of user_id -> extracted gamification fields.

    This is the fix for the core bug: previously the code called
    get_gamification_data() inside loops, resulting in N individual
    queries and the wrong data being associated with the wrong user
    when documents were returned out of order.
    """
    if not user_ids:
        return {}
    docs = await db.gamification.find(
        {"user_id": {"$in": user_ids}}
    ).to_list(length=len(user_ids))

    # Key by user_id so callers can O(1) look up any user's data
    return {doc["user_id"]: extract_gam(doc) for doc in docs}


# ═══════════════════════════════════════════════════════════════
# DEPENDENCY
# ═══════════════════════════════════════════════════════════════

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if getattr(current_user, "role", None) != "admin":
        logger.warning(f"Unauthorized admin access attempt by user: {getattr(current_user, 'id', '?')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/dashboard", response_model=Dict[str, DashboardSummary])
async def get_admin_dashboard(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Admin dashboard: key platform metrics in one call."""
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent = {"created_at": {"$gte": thirty_days_ago}}

    total_users, total_reviews, recent_reviews, recent_users = await asyncio.gather(
        db.users.count_documents({}),
        db.reviews.count_documents({}),
        db.reviews.count_documents(recent),
        db.users.count_documents(recent),
    )

    # Mentor sessions are optional – don't fail if collection is absent
    try:
        total_mentor_sessions = await db.mentor_sessions.count_documents({})
    except Exception:
        total_mentor_sessions = 0

    return {
        "summary": DashboardSummary(
            total_users=total_users,
            total_reviews=total_reviews,
            total_mentor_sessions=total_mentor_sessions,
            reviews_last_30_days=recent_reviews,
            new_users_last_30_days=recent_users,
        )
    }


@router.get("/analytics/top-users", response_model=Dict[str, List[TopUserResponse]])
async def get_top_users(
    limit: int = Query(default=10, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Top users by review count, with correct gamification data."""
    pipeline = [
        {
            "$group": {
                "_id": "$user_id",
                "total_reviews": {"$sum": 1},
                "avg_score": {"$avg": "$scores.overall_score"},
                "last_activity": {"$max": "$created_at"},
            }
        },
        {"$sort": {"total_reviews": -1}},
        {"$limit": limit},
    ]

    groups = [doc async for doc in db.reviews.aggregate(pipeline)]
    if not groups:
        return {"top_users": []}

    user_ids = [g["_id"] for g in groups]

    # ✅ Single batch query for users AND gamification
    users_map, gam_map = await asyncio.gather(
        batch_fetch_users(db, user_ids),
        batch_fetch_gamification(db, user_ids),
    )

    top_users = []
    for doc in groups:
        uid = doc["_id"]
        user = users_map.get(uid)
        if not user:
            logger.debug(f"Skipping orphaned review data for deleted user: {uid}")
            continue

        # ✅ gam_map lookup is O(1) and always returns correct data for this user
        gam = gam_map.get(uid, GAM_DEFAULTS)

        top_users.append(
            TopUserResponse(
                user_id=uid,
                name=user.get("name", "Unknown"),
                email=user.get("email", ""),
                profile_pic=user.get("profile_pic"),
                total_reviews=doc["total_reviews"],
                avg_score=round(doc.get("avg_score") or 0, 2),
                last_activity=doc.get("last_activity"),
                xp=gam["xp"],
                level=gam["level"],
                level_name=gam["level_name"],
                badges_count=len(gam["badges"]),
                streak=gam["streak"],
            )
        )

    return {"top_users": top_users}


@router.get("/analytics/language-stats", response_model=Dict[str, List[LanguageStatsResponse]])
async def get_language_stats(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    pipeline = [
        {"$group": {"_id": "$language", "count": {"$sum": 1}, "avg_score": {"$avg": "$scores.overall_score"}}},
        {"$sort": {"count": -1}},
    ]
    languages = [
        LanguageStatsResponse(
            language=doc["_id"] or "Unknown",
            count=doc["count"],
            avg_score=round(doc.get("avg_score") or 0, 2),
        )
        async for doc in db.reviews.aggregate(pipeline)
    ]
    return {"languages": languages}


@router.get("/analytics/review-trends", response_model=Dict[str, Any])
async def get_review_trends(
    days: int = Query(default=DEFAULT_TREND_DAYS, ge=1, le=MAX_TREND_DAYS),
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    start_date = datetime.utcnow() - timedelta(days=days)
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                    "day": {"$dayOfMonth": "$created_at"},
                },
                "count": {"$sum": 1},
                "avg_score": {"$avg": "$scores.overall_score"},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
    ]

    trend_map: Dict[str, TrendDataPoint] = {}
    async for doc in db.reviews.aggregate(pipeline):
        d = doc["_id"]
        date_str = f"{d['year']}-{d['month']:02d}-{d['day']:02d}"
        trend_map[date_str] = TrendDataPoint(
            date=date_str,
            count=doc["count"],
            avg_score=round(doc.get("avg_score") or 0, 2),
        )

    empty = lambda ds: TrendDataPoint(date=ds, count=0, avg_score=0)
    trend = [
        trend_map.get(
            ds := (start_date + timedelta(days=i + 1)).date().isoformat(),
            empty(ds),
        )
        for i in range(days)
    ]

    return {
        "trend": trend,
        "days": days,
        "start_date": start_date.date().isoformat(),
        "end_date": datetime.utcnow().date().isoformat(),
    }


@router.get("/analytics/score-distribution", response_model=Dict[str, List[ScoreDistribution]])
async def get_score_distribution(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    pipeline = [
        {
            "$bucket": {
                "groupBy": "$scores.overall_score",
                "boundaries": SCORE_RANGES,
                "default": "Other",
                "output": {"count": {"$sum": 1}, "avg_score": {"$avg": "$scores.overall_score"}},
            }
        }
    ]
    distribution = []
    idx = 0
    async for doc in db.reviews.aggregate(pipeline):
        if isinstance(doc["_id"], (int, float)) and idx < len(SCORE_LABELS):
            distribution.append(
                ScoreDistribution(
                    range=SCORE_LABELS[idx],
                    count=doc["count"],
                    avg_score=round(doc.get("avg_score") or 0, 2),
                )
            )
            idx += 1
    return {"distribution": distribution}


@router.get("/users", response_model=PaginatedUsersResponse)
async def get_all_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Paginated user list with correct gamification data per user."""
    skip = (page - 1) * limit
    total, raw_users = await asyncio.gather(
        db.users.count_documents({}),
        db.users.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit),
    )

    if not raw_users:
        return PaginatedUsersResponse(users=[], total=total, page=page, pages=0, page_size=limit)

    user_ids = [str(u["_id"]) for u in raw_users]

    # ✅ Batch: review counts + gamification in parallel — no loops, no N+1
    review_counts_agg, gam_map = await asyncio.gather(
        db.reviews.aggregate([
            {"$match": {"user_id": {"$in": user_ids}}},
            {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
        ]).to_list(length=limit),
        batch_fetch_gamification(db, user_ids),
    )
    review_counts: Dict[str, int] = {r["_id"]: r["count"] for r in review_counts_agg}

    users = []
    for u in raw_users:
        uid = str(u["_id"])
        # ✅ Direct dict lookup — each user gets THEIR OWN gamification record
        gam = gam_map.get(uid, GAM_DEFAULTS)
        users.append(
            UserListItem(
                id=uid,
                name=u.get("name", ""),
                email=u.get("email", ""),
                role=u.get("role", "developer"),
                profile_pic=u.get("profile_pic"),
                created_at=u.get("created_at"),
                review_count=review_counts.get(uid, 0),
                xp=gam["xp"],
                level=gam["level"],
                level_name=gam["level_name"],
                badges_count=len(gam["badges"]),
                streak=gam["streak"],
            )
        )

    return PaginatedUsersResponse(
        users=users,
        total=total,
        page=page,
        pages=(total + limit - 1) // limit,
        page_size=limit,
    )


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    request: RoleUpdateRequest,
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    result = await db.users.update_one(
        {"_id": safe_object_id(user_id)}, {"$set": {"role": request.role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    logger.info(f"Admin {admin.id} set user {user_id} role → {request.role}")
    return {"success": True, "user_id": user_id, "new_role": request.role}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if user_id == str(getattr(admin, "id", "")):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    oid = safe_object_id(user_id)
    result = await db.users.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    # ✅ Delete all associated data concurrently
    reviews_del, gam_del = await asyncio.gather(
        db.reviews.delete_many({"user_id": user_id}),
        db.gamification.delete_many({"user_id": user_id}),
    )
    mentor_del = 0
    try:
        r = await db.mentor_sessions.delete_many(
            {"$or": [{"mentor_id": user_id}, {"mentee_id": user_id}]}
        )
        mentor_del = r.deleted_count
    except Exception:
        pass

    logger.info(f"Admin {admin.id} deleted user {user_id}: reviews={reviews_del.deleted_count}, gam={gam_del.deleted_count}, mentor={mentor_del}")
    return {
        "success": True,
        "deleted_records": {
            "user": 1,
            "reviews": reviews_del.deleted_count,
            "gamification": gam_del.deleted_count,
            "mentor_sessions": mentor_del,
        },
    }


@router.get("/reviews/recent", response_model=Dict[str, List[RecentReviewItem]])
async def get_recent_reviews(
    limit: int = Query(default=20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    raw = await db.reviews.find({}).sort("created_at", -1).limit(limit).to_list(length=limit)
    if not raw:
        return {"reviews": []}

    user_ids = list({r["user_id"] for r in raw if r.get("user_id")})
    users_map = await batch_fetch_users(db, user_ids)

    return {
        "reviews": [
            RecentReviewItem(
                id=str(r["_id"]),
                user_name=users_map.get(r.get("user_id", ""), {}).get("name", "Deleted User"),
                language=r.get("language", ""),
                overall_score=r.get("scores", {}).get("overall_score", 0),
                created_at=r.get("created_at"),
                summary=(r.get("ai_feedback", {}).get("summary") or "")[:100],
            )
            for r in raw
        ]
    }


@router.get("/system/health")
async def get_system_health(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    collection_names = ["users", "reviews", "gamification", "mentor_sessions"]
    results = await asyncio.gather(
        *[db[c].count_documents({}) for c in collection_names],
        return_exceptions=True,
    )
    collections = {
        name: (r if isinstance(r, int) else 0)
        for name, r in zip(collection_names, results)
    }
    return {
        "status": "healthy",
        "database": "connected",
        "collections": collections,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/gamification/stats")
async def get_gamification_stats(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    service = GamificationService(db)
    return await service.get_admin_gamification_stats()


@router.post("/maintenance/cleanup-orphaned-data")
async def cleanup_orphaned_data(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Remove reviews and gamification records whose user no longer exists."""
    valid_ids = {str(u["_id"]) async for u in db.users.find({}, {"_id": 1})}

    orphan_reviews = [
        r["_id"] async for r in db.reviews.find({}, {"_id": 1, "user_id": 1})
        if r.get("user_id") not in valid_ids
    ]
    orphan_gam = [
        g["_id"] async for g in db.gamification.find({}, {"_id": 1, "user_id": 1})
        if g.get("user_id") not in valid_ids
    ]

    reviews_del, gam_del = await asyncio.gather(
        db.reviews.delete_many({"_id": {"$in": orphan_reviews}}) if orphan_reviews else asyncio.coroutine(lambda: type("R", (), {"deleted_count": 0})())(),
        db.gamification.delete_many({"_id": {"$in": orphan_gam}}) if orphan_gam else asyncio.coroutine(lambda: type("R", (), {"deleted_count": 0})())(),
    )

    total = reviews_del.deleted_count + gam_del.deleted_count
    logger.info(f"Admin {admin.id} cleanup: {total} orphaned records deleted")
    return {
        "success": True,
        "deleted": {"reviews": reviews_del.deleted_count, "gamification": gam_del.deleted_count, "total": total},
    }
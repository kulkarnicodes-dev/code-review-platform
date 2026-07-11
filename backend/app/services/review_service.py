from datetime import datetime
from typing import List, Optional
from bson import ObjectId

from app.models.review import Review, CodeSubmission, ReviewResponse
from app.services.ai_service import ai_service
from app.services.gamification_service import GamificationService


class ReviewService:
    def __init__(self, db):
        self.db = db
        self.reviews_collection = db.reviews

    async def create_review(self, user_id: str, submission: CodeSubmission) -> ReviewResponse:
        feedback, scores = await ai_service.review_code(
            submission.code,
            submission.language
        )

        review_doc = {
            "user_id": user_id,
            "language": submission.language,
            "code_snippet": submission.code,
            "filename": submission.filename,
            "ai_feedback": feedback.dict(),
            "scores": scores.dict(),
            "created_at": datetime.utcnow()
        }

        result = await self.reviews_collection.insert_one(review_doc)
        review_id = str(result.inserted_id)
        review_doc["_id"] = review_id

        try:
            gamification_service = GamificationService(self.db)
            await gamification_service.process_review_completion(
                user_id=user_id,
                language=submission.language,
                scores=scores.dict(),
                ai_feedback=feedback.dict()
            )
        except Exception as e:
            print(f"Gamification error: {e}")

        return ReviewResponse(
            id=review_id,
            language=review_doc["language"],
            ai_feedback=feedback,
            scores=scores,
            created_at=review_doc["created_at"]
        )

    async def get_review(self, review_id: str) -> Optional[Review]:
        try:
            review = await self.reviews_collection.find_one(
                {"_id": ObjectId(review_id)}
            )
            if review:
                review["_id"] = str(review["_id"])
                review = self._normalize_review(review)
                return Review(**review)
        except Exception as e:
            print(f"Error fetching review: {e}")
        return None

    async def get_user_reviews(self, user_id: str, limit: int = 0) -> List[Review]:
        """
        Get all reviews for a user.
        limit=0 means no limit — Motor/PyMongo treats 0 as unlimited.
        Previously hardcoded to 50, which caused the count to stop at 50.
        """
        reviews = []
        cursor = (
            self.reviews_collection
            .find({"user_id": user_id})
            .sort("created_at", -1)
            .limit(limit)  # 0 = no cap
        )
        async for review in cursor:
            review["_id"] = str(review["_id"])
            review = self._normalize_review(review)
            reviews.append(Review(**review))
        return reviews

    def _normalize_review(self, review: dict) -> dict:
        review.setdefault("code_snippet", review.get("code", ""))
        scores = review.get("scores", {})
        overall = scores.get("overall_score", 0.0)
        review["scores"] = {
            "quality_score":     scores.get("quality_score",     overall),
            "readability_score": scores.get("readability_score", overall),
            "performance_score": scores.get("performance_score", overall),
            "security_score":    scores.get("security_score",    overall),
            "overall_score":     overall,
        }
        return review

    async def get_user_stats(self, user_id: str) -> dict:
        """
        FIX: Use count_documents for the real total — this is a direct DB count
        and is never affected by any fetch limit.
        """
        total_reviews = await self.reviews_collection.count_documents(
            {"user_id": user_id}
        )

        if total_reviews == 0:
            return {
                "total_reviews": 0,
                "avg_score": 0.0,
                "languages": {},
                "recent_trend": []
            }

        reviews = await self.get_user_reviews(user_id)

        total_score = sum(r.scores.overall_score for r in reviews)
        avg_score = total_score / len(reviews) if reviews else 0.0

        languages = {}
        for review in reviews:
            lang = review.language
            languages[lang] = languages.get(lang, 0) + 1

        recent_trend = [
            {
                "date": r.created_at.isoformat(),
                "score": r.scores.overall_score
            }
            for r in reviews[:10]
        ]

        return {
            "total_reviews": total_reviews,  # real count from MongoDB
            "avg_score": round(avg_score, 1),
            "languages": languages,
            "recent_trend": recent_trend
        }
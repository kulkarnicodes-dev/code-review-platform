"""
app/services/gamification_service.py

Full gamification engine with certificate generation on Level 10 completion.
"""

import logging
from datetime import datetime, date
from typing import List, Optional
from bson import ObjectId

from app.utils.email import send_level_up_email, send_certificate_email
from app.services.certificate_service import generate_completion_certificate
from app.models.gamification import (
    UserGamification, GamificationUpdate, LeaderboardEntry,
    BADGES, DAILY_CHALLENGES, calculate_level, calculate_xp_for_review,
    LEVEL_XP_THRESHOLDS
)

logger = logging.getLogger(__name__)

MAX_LEVEL = 10


class GamificationService:
    def __init__(self, db):
        self.db = db
        self.gamification_collection = db.gamification
        self.users_collection = db.users

    # ───────────────────────────────────────────────────────────────────────
    # INTERNAL HELPERS
    # ───────────────────────────────────────────────────────────────────────

    @staticmethod
    def _str_id(user_id) -> str:
        """Always normalise user_id to a plain string to prevent ObjectId/string mismatch."""
        return str(user_id)

    async def _get_user(self, user_id: str) -> Optional[dict]:
        """Fetch user document; tries ObjectId first, then string fallback."""
        try:
            user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                return user
        except Exception:
            pass
        return await self.users_collection.find_one({"_id": user_id})

    # ───────────────────────────────────────────────────────────────────────
    # CORE PROFILE
    # ───────────────────────────────────────────────────────────────────────

    async def get_or_create_gamification(self, user_id) -> dict:
        """Get or create gamification profile for a user."""
        user_id = self._str_id(user_id)

        profile = await self.gamification_collection.find_one({"user_id": user_id})
        if not profile:
            new_profile = {
                "user_id":                    user_id,
                "xp":                         0,
                "level":                      1,
                "level_name":                 "Beginner",
                "badges":                     [],
                "total_reviews":              0,
                "bugs_found":                 0,
                "security_issues_found":      0,
                "perfect_style_count":        0,
                "unique_languages":           [],
                "max_score":                  0.0,
                "current_streak":             0,
                "max_streak":                 0,
                "last_review_date":           None,
                "daily_reviews_today":        0,
                "daily_challenges_completed": [],
                "last_challenge_date":        None,
                # Certificate tracking
                "certificate_issued":         False,
                "certificate_issued_at":      None,
                "created_at":                 datetime.utcnow(),
                "updated_at":                 datetime.utcnow(),
            }
            result = await self.gamification_collection.insert_one(new_profile)
            new_profile["_id"] = str(result.inserted_id)
            logger.info("Created new gamification profile for user %s", user_id)
            return new_profile

        profile["_id"] = str(profile["_id"])
        return profile

    # ───────────────────────────────────────────────────────────────────────
    # REVIEW PROCESSING
    # ───────────────────────────────────────────────────────────────────────

    async def process_review_completion(
        self,
        user_id,
        language: str,
        scores: dict,
        ai_feedback: dict,
    ) -> GamificationUpdate:
        """Process XP, badges, level-up and certificate after a review."""
        user_id = self._str_id(user_id)
        profile  = await self.get_or_create_gamification(user_id)
        old_level = profile.get("level", 1)

        # ── Stats from this review ────────────────────────────────────────
        bugs_found       = len(ai_feedback.get("bugs", []))
        security_issues  = len(ai_feedback.get("security", []))
        style_score      = scores.get("style_score", scores.get("readability_score", 5.0))
        overall_score    = scores.get("overall_score", 5.0)

        xp_gained = calculate_xp_for_review(scores, bugs_found, security_issues)

        # ── Running totals ────────────────────────────────────────────────
        new_xp              = profile.get("xp", 0) + xp_gained
        new_total_reviews   = profile.get("total_reviews", 0) + 1
        new_bugs_found      = profile.get("bugs_found", 0) + bugs_found
        new_security_found  = profile.get("security_issues_found", 0) + security_issues

        unique_langs = list(profile.get("unique_languages", []))
        if language and language not in unique_langs:
            unique_langs.append(language)

        new_max_score    = max(profile.get("max_score", 0.0), overall_score)
        new_perfect_style = profile.get("perfect_style_count", 0) + (1 if style_score >= 9.0 else 0)

        # ── Streak ───────────────────────────────────────────────────────
        today         = date.today()
        current_streak = profile.get("current_streak", 0)
        max_streak     = profile.get("max_streak", 0)
        last_review_date = profile.get("last_review_date")

        if last_review_date:
            last_date = (
                last_review_date.date()
                if isinstance(last_review_date, datetime)
                else last_review_date
            )
            days_diff = (today - last_date).days
            if days_diff == 1:
                current_streak += 1
            elif days_diff > 1:
                current_streak = 1
            # days_diff == 0 → same day, keep streak unchanged
        else:
            current_streak = 1

        max_streak = max(max_streak, current_streak)

        # ── Daily challenges ─────────────────────────────────────────────
        today_str            = today.isoformat()
        last_challenge_date  = profile.get("last_challenge_date")
        daily_reviews_today  = profile.get("daily_reviews_today", 0)

        if last_challenge_date != today_str:
            daily_reviews_today       = 1
            daily_challenges_completed = []
        else:
            daily_reviews_today       += 1
            daily_challenges_completed = list(profile.get("daily_challenges_completed", []))

        challenges_completed_today: List[str] = []
        for challenge in DAILY_CHALLENGES:
            if challenge["id"] in daily_challenges_completed:
                continue
            rt, rv = challenge["requirement_type"], challenge["requirement_value"]
            if (
                (rt == "daily_reviews"  and daily_reviews_today >= rv)
                or (rt == "language_review" and language.lower() == rv)
                or (rt == "score_above"     and overall_score >= rv)
                or (rt == "bugs_found"      and bugs_found >= rv)
            ):
                challenges_completed_today.append(challenge["id"])
                bonus = challenge["xp_reward"]
                xp_gained += bonus
                new_xp    += bonus

        daily_challenges_completed = list(
            set(daily_challenges_completed + challenges_completed_today)
        )

        # ── Badge checks ─────────────────────────────────────────────────
        new_badges: List[dict] = []
        existing_badges = set(profile.get("badges", []))

        badge_checks = {
            "first_review":      new_total_reviews >= 1,
            "bug_hunter":        new_bugs_found >= 10,
            "clean_code_master": new_perfect_style >= 5,
            "refactoring_pro":   new_total_reviews >= 20,
            "polyglot":          len(unique_langs) >= 5,
            "streak_master":     max_streak >= 7,
            "security_expert":   new_security_found >= 5,
            "speed_reviewer":    daily_reviews_today >= 5,
            "high_scorer":       new_max_score >= 9.0,
            "centurion":         new_total_reviews >= 100,
        }

        for badge_id, condition in badge_checks.items():
            if condition and badge_id not in existing_badges:
                new_badges.append(BADGES[badge_id])
                existing_badges.add(badge_id)

        # ── Final level ───────────────────────────────────────────────────
        new_level, new_level_name = calculate_level(new_xp)
        leveled_up = new_level > old_level

        all_current_badge_dicts = [
            BADGES[bid] for bid in existing_badges if bid in BADGES
        ]

        logger.info(
            "Review processed — user=%s xp_gained=%d new_xp=%d old_level=%d new_level=%d",
            user_id, xp_gained, new_xp, old_level, new_level,
        )

        # ── Emails (level-up and/or certificate) ─────────────────────────
        if leveled_up:
            await self._handle_level_up_notifications(
                user_id=user_id,
                old_level=old_level,
                new_level=new_level,
                new_level_name=new_level_name,
                all_current_badge_dicts=all_current_badge_dicts,
                profile=profile,
                new_total_reviews=new_total_reviews,
                total_xp=new_xp,
                existing_badges=existing_badges,
            )

        # ── Persist ───────────────────────────────────────────────────────
        update_fields = {
            "xp":                         new_xp,
            "level":                      new_level,
            "level_name":                 new_level_name,
            "badges":                     list(existing_badges),
            "total_reviews":              new_total_reviews,
            "bugs_found":                 new_bugs_found,
            "security_issues_found":      new_security_found,
            "perfect_style_count":        new_perfect_style,
            "unique_languages":           unique_langs,
            "max_score":                  new_max_score,
            "current_streak":             current_streak,
            "max_streak":                 max_streak,
            "last_review_date":           datetime.utcnow(),
            "daily_reviews_today":        daily_reviews_today,
            "daily_challenges_completed": daily_challenges_completed,
            "last_challenge_date":        today_str,
            "updated_at":                 datetime.utcnow(),
        }

        # Mark certificate as issued the first time we hit level 10
        if new_level >= MAX_LEVEL and not profile.get("certificate_issued"):
            update_fields["certificate_issued"]    = True
            update_fields["certificate_issued_at"] = datetime.utcnow()

        result = await self.gamification_collection.update_one(
            {"user_id": user_id},
            {"$set": update_fields},
        )

        if result.matched_count == 0:
            logger.error(
                "CRITICAL: update_one matched 0 documents for user_id=%s", user_id
            )

        return GamificationUpdate(
            xp_gained=xp_gained,
            new_level=new_level if leveled_up else None,
            new_level_name=new_level_name if leveled_up else None,
            new_badges=new_badges,
            challenges_completed=challenges_completed_today,
            total_xp=new_xp,
            current_level=new_level,
        )

    # ───────────────────────────────────────────────────────────────────────
    # NOTIFICATION HELPERS
    # ───────────────────────────────────────────────────────────────────────

    async def _handle_level_up_notifications(
        self,
        user_id: str,
        old_level: int,
        new_level: int,
        new_level_name: str,
        all_current_badge_dicts: List[dict],
        profile: dict,
        new_total_reviews: int,
        total_xp: int,
        existing_badges: set,
    ) -> None:
        """
        Send appropriate emails when a user levels up.

        - Always send the standard level-up email.
        - Additionally, if the user just reached Level 10 for the first time,
          generate a certificate PDF and send it as an attachment.
        """
        user = await self._get_user(user_id)
        if not user or not user.get("email"):
            logger.warning("Level-up notifications skipped — user %s has no email", user_id)
            return

        email      = user["email"]
        name       = user.get("name", "Developer")
        is_level_10 = new_level >= MAX_LEVEL
        already_certified = profile.get("certificate_issued", False)

        # ── Standard level-up email ───────────────────────────────────────
        # Skip the plain level-up email when we're about to send the grander
        # certificate email for level 10 — avoid inbox duplication.
        if not (is_level_10 and not already_certified):
            try:
                await send_level_up_email(
                    to_email=email,
                    name=name,
                    level=new_level,
                    level_name=new_level_name,
                    badges=all_current_badge_dicts,
                )
                logger.info("Level-up email sent → %s (level %d)", email, new_level)
            except Exception as exc:
                logger.error("Failed to send level-up email for user %s: %s", user_id, exc)

        # ── Level 10 certificate (send only once) ─────────────────────────
        if is_level_10 and not already_certified:
            await self._send_completion_certificate(
                user_id=user_id,
                email=email,
                name=name,
                new_level_name=new_level_name,
                new_total_reviews=new_total_reviews,
                badges_count=len(existing_badges),
                total_xp=total_xp,
            )

    async def _send_completion_certificate(
        self,
        user_id: str,
        email: str,
        name: str,
        new_level_name: str,
        new_total_reviews: int,
        badges_count: int,
        total_xp: int,
    ) -> None:
        """Generate PDF certificate and email it to the user."""
        try:
            logger.info("Generating completion certificate for user %s (%s)", user_id, email)

            pdf_bytes = generate_completion_certificate(
                user_name=name,
                user_email=email,
                total_reviews=new_total_reviews,
                badges_count=badges_count,
                total_xp=total_xp,
                completion_date=datetime.utcnow(),
            )

            await send_certificate_email(
                to_email=email,
                name=name,
                level_name=new_level_name,
                certificate_pdf=pdf_bytes,
            )

            logger.info(
                "🏆 Certificate email sent to %s — %d reviews, %d badges, %d XP",
                email, new_total_reviews, badges_count, total_xp,
            )

        except Exception as exc:
            # Never crash review processing because of email failure
            logger.error(
                "Failed to generate/send certificate for user %s: %s",
                user_id, exc, exc_info=True,
            )

    # ───────────────────────────────────────────────────────────────────────
    # READ-ONLY QUERIES
    # ───────────────────────────────────────────────────────────────────────

    async def get_leaderboard(self, limit: int = 10) -> list:
        """Get global leaderboard — batch-fetches users to avoid N+1."""
        pipeline = [{"$sort": {"xp": -1}}, {"$limit": limit}]
        docs = [doc async for doc in self.gamification_collection.aggregate(pipeline)]

        if not docs:
            return []

        # Batch-fetch all users in one query
        user_ids = [doc["user_id"] for doc in docs]
        raw_users = []
        try:
            raw_users = await self.users_collection.find(
                {"_id": {"$in": [ObjectId(uid) for uid in user_ids]}}
            ).to_list(length=limit)
        except Exception:
            pass
        users_map = {str(u["_id"]): u for u in raw_users}

        leaderboard = []
        for rank, doc in enumerate(docs, start=1):
            uid  = doc["user_id"]
            user = users_map.get(uid)
            leaderboard.append({
                "rank":          rank,
                "user_id":       uid,
                "name":          user.get("name", "Anonymous") if user else "Anonymous",
                "profile_pic":   user.get("profile_pic") if user else None,
                "xp":            doc.get("xp", 0),
                "level":         doc.get("level", 1),
                "level_name":    doc.get("level_name", "Beginner"),
                "badges_count":  len(doc.get("badges", [])),
                "total_reviews": doc.get("total_reviews", 0),
                "certificate_issued": doc.get("certificate_issued", False),
            })

        return leaderboard

    async def get_user_gamification(self, user_id) -> dict:
        """Get full gamification profile including progress and daily challenges."""
        user_id = self._str_id(user_id)
        profile = await self.get_or_create_gamification(user_id)

        badge_details = [
            BADGES[bid] for bid in profile.get("badges", []) if bid in BADGES
        ]

        current_level   = profile.get("level", 1)
        current_xp      = profile.get("xp", 0)
        next_level      = min(current_level + 1, MAX_LEVEL)
        xp_for_next     = LEVEL_XP_THRESHOLDS.get(next_level, LEVEL_XP_THRESHOLDS.get(MAX_LEVEL, 5500))
        xp_for_current  = LEVEL_XP_THRESHOLDS.get(current_level, 0)
        xp_progress     = current_xp - xp_for_current
        xp_needed       = xp_for_next - xp_for_current
        progress_percent = (
            100 if current_level >= MAX_LEVEL
            else min(100, int((xp_progress / xp_needed) * 100)) if xp_needed > 0 else 100
        )

        today_str = date.today().isoformat()
        last_challenge_date = profile.get("last_challenge_date")
        daily_completed = (
            profile.get("daily_challenges_completed", [])
            if last_challenge_date == today_str
            else []
        )

        challenges_with_status = [
            {**challenge, "completed": challenge["id"] in daily_completed}
            for challenge in DAILY_CHALLENGES
        ]

        return {
            **profile,
            "badge_details":         badge_details,
            "xp_to_next_level":      max(0, xp_for_next - current_xp),
            "xp_progress_percent":   progress_percent,
            "daily_challenges":      challenges_with_status,
            "all_badges":            list(BADGES.values()),
            "is_max_level":          current_level >= MAX_LEVEL,
            "certificate_issued":    profile.get("certificate_issued", False),
            "certificate_issued_at": profile.get("certificate_issued_at"),
        }

    async def get_admin_gamification_stats(self) -> dict:
        """Gamification statistics for the admin dashboard."""
        total_users, level_docs, badge_docs, avg_docs = await _gather_admin_pipelines(
            self.gamification_collection
        )

        level_dist = {str(d["_id"]): d["count"] for d in level_docs}
        top_badges = [
            {"badge": BADGES[d["_id"]], "count": d["count"]}
            for d in badge_docs if d["_id"] in BADGES
        ]
        avg_xp   = round(avg_docs[0].get("avg_xp", 0), 1) if avg_docs else 0
        total_xp = avg_docs[0].get("total_xp", 0) if avg_docs else 0

        # Level-10 master count
        level_10_count = await self.gamification_collection.count_documents(
            {"level": {"$gte": MAX_LEVEL}}
        )

        return {
            "total_users_with_xp":   total_users,
            "level_distribution":    level_dist,
            "top_earners":           await self.get_leaderboard(5),
            "most_common_badges":    top_badges,
            "average_xp":            avg_xp,
            "total_xp_distributed":  total_xp,
            "level_10_masters":      level_10_count,
        }


# ── Module-level helper (keeps class methods clean) ──────────────────────────

async def _gather_admin_pipelines(collection):
    """Run all admin aggregation pipelines concurrently."""
    import asyncio

    async def _count():
        return await collection.count_documents({})

    async def _levels():
        return [d async for d in collection.aggregate([
            {"$group": {"_id": "$level", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ])]

    async def _badges():
        return [d async for d in collection.aggregate([
            {"$unwind": "$badges"},
            {"$group": {"_id": "$badges", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5},
        ])]

    async def _avg():
        return [d async for d in collection.aggregate([
            {"$group": {"_id": None, "avg_xp": {"$avg": "$xp"}, "total_xp": {"$sum": "$xp"}}},
        ])]

    return await asyncio.gather(_count(), _levels(), _badges(), _avg())
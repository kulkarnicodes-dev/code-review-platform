from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Tuple
from datetime import datetime
from bson import ObjectId

# ---------------------------------------------------------------------------
# XP Thresholds & Level Names
# ---------------------------------------------------------------------------

LEVEL_XP_THRESHOLDS = {
    1: 0,
    2: 100,
    3: 300,
    4: 600,
    5: 1000,
    6: 1500,
    7: 2200,
    8: 3000,
    9: 4000,
    10: 5500,
}

LEVEL_NAMES = {
    1:  "Beginner",
    2:  "Novice",
    3:  "Apprentice",
    4:  "Developer",
    5:  "Intermediate",
    6:  "Advanced",
    7:  "Expert",
    8:  "Senior",
    9:  "Master",
    10: "Grandmaster",
}

# Pre-sorted list used by calculate_level — built once at import time
_SORTED_LEVELS = sorted(LEVEL_XP_THRESHOLDS.items(), reverse=True)


# ---------------------------------------------------------------------------
# Badge Definitions
# FIX: every badge now has its own unique, meaningful emoji
# FIX: added `xp_reward` so earning a badge also grants bonus XP
# ---------------------------------------------------------------------------

BADGES = {
    "first_review": {
        "id":          "first_review",
        "name":        "First Step",
        "emoji":       "⭐",
        "description": "Completed your first code review",
        "requirement": "total_reviews >= 1",
        "xp_reward":   25,
    },
    "bug_hunter": {
        "id":          "bug_hunter",
        "name":        "Bug Hunter",
        "emoji":       "🐛",
        "description": "Found bugs in 10 code reviews",
        "requirement": "bugs_found >= 10",
        "xp_reward":   50,
    },
    "clean_code_master": {
        "id":          "clean_code_master",
        "name":        "Clean Code Master",
        "emoji":       "✨",
        "description": "Achieved perfect style score in 5 reviews",
        "requirement": "perfect_style_count >= 5",
        "xp_reward":   50,
    },
    "refactoring_pro": {
        "id":          "refactoring_pro",
        "name":        "Refactoring Pro",
        "emoji":       "🔧",
        "description": "Submitted 20 code reviews",
        "requirement": "total_reviews >= 20",
        "xp_reward":   75,
    },
    "polyglot": {
        "id":          "polyglot",
        "name":        "Polyglot",
        "emoji":       "🌍",
        "description": "Used 5 different programming languages",
        "requirement": "unique_languages >= 5",
        "xp_reward":   60,
    },
    "streak_master": {
        "id":          "streak_master",
        "name":        "Streak Master",
        "emoji":       "🔥",
        "description": "Maintained a 7-day review streak",
        "requirement": "max_streak >= 7",
        "xp_reward":   80,
    },
    "security_expert": {
        "id":          "security_expert",
        "name":        "Security Expert",
        "emoji":       "🛡️",
        "description": "Identified security issues in 5 reviews",
        "requirement": "security_issues_found >= 5",
        "xp_reward":   75,
    },
    "speed_reviewer": {
        "id":          "speed_reviewer",
        "name":        "Speed Reviewer",
        "emoji":       "⚡",
        "description": "Submitted 5 reviews in a single day",
        "requirement": "daily_reviews >= 5",
        "xp_reward":   60,
    },
    "high_scorer": {
        "id":          "high_scorer",
        "name":        "High Scorer",
        "emoji":       "💎",
        "description": "Achieved a score of 9.0+ in any review",
        "requirement": "max_score >= 9.0",
        "xp_reward":   50,
    },
    "centurion": {
        "id":          "centurion",
        "name":        "Centurion",
        "emoji":       "💯",
        "description": "Completed 100 code reviews",
        "requirement": "total_reviews >= 100",
        "xp_reward":   200,
    },
}


# ---------------------------------------------------------------------------
# Daily Challenges
# FIX: added `emoji` to each challenge for richer frontend display
# ---------------------------------------------------------------------------

DAILY_CHALLENGES = [
    {
        "id":                "review_3_today",
        "name":              "Triple Review",
        "emoji":             "🔁",
        "description":       "Complete 3 code reviews today",
        "xp_reward":         50,
        "requirement_type":  "daily_reviews",
        "requirement_value": 3,
    },
    {
        "id":                "python_review",
        "name":              "Python Day",
        "emoji":             "🐍",
        "description":       "Review a Python code snippet",
        "xp_reward":         30,
        "requirement_type":  "language_review",
        "requirement_value": "python",
    },
    {
        "id":                "javascript_review",
        "name":              "JS Master",
        "emoji":             "🟨",
        "description":       "Review a JavaScript code snippet",
        "xp_reward":         30,
        "requirement_type":  "language_review",
        "requirement_value": "javascript",
    },
    {
        "id":                "high_score_review",
        "name":              "Quality First",
        "emoji":             "🏆",
        "description":       "Get a review score above 8.0",
        "xp_reward":         60,
        "requirement_type":  "score_above",
        "requirement_value": 8.0,
    },
    {
        "id":                "review_with_bugs",
        "name":              "Bug Finder",
        "emoji":             "🐞",
        "description":       "Get a review that identifies at least 3 bugs",
        "xp_reward":         40,
        "requirement_type":  "bugs_found",
        "requirement_value": 3,
    },
]


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class UserGamification(BaseModel):
    user_id:                    str
    xp:                         int = 0
    level:                      int = 1
    level_name:                 str = "Beginner"
    badges:                     List[str] = []
    total_reviews:              int = 0
    bugs_found:                 int = 0
    security_issues_found:      int = 0
    perfect_style_count:        int = 0
    unique_languages:           List[str] = []
    max_score:                  float = 0.0
    current_streak:             int = 0
    max_streak:                 int = 0
    last_review_date:           Optional[datetime] = None
    daily_reviews_today:        int = 0
    daily_challenges_completed: List[str] = []
    last_challenge_date:        Optional[str] = None
    created_at:                 datetime = Field(default_factory=datetime.utcnow)
    updated_at:                 datetime = Field(default_factory=datetime.utcnow)


class GamificationUpdate(BaseModel):
    xp_gained:           int
    new_level:           Optional[int] = None
    new_level_name:      Optional[str] = None
    new_badges:          List[dict] = []
    challenges_completed: List[str] = []
    total_xp:            int
    current_level:       int
    # NEW: tells the frontend exactly what badge XP bonuses were applied
    badge_xp_bonus:      int = 0


class LeaderboardEntry(BaseModel):
    rank:         int
    user_id:      str
    name:         str
    profile_pic:  Optional[str] = None
    xp:           int
    level:        int
    level_name:   str
    badges_count: int
    total_reviews: int


class DailyChallenge(BaseModel):
    id:                str
    name:              str
    emoji:             str = "🎯"
    description:       str
    xp_reward:         int
    completed:         bool = False
    # FIX: `progress` is now actually populated — value 0.0–1.0
    progress:          float = Field(default=0.0, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Core Functions
# ---------------------------------------------------------------------------

def calculate_level(xp: int) -> Tuple[int, str]:
    """
    Calculate level and level name from total XP.
    Uses pre-sorted list so this is O(n) with no repeated sorting.
    """
    for lvl, threshold in _SORTED_LEVELS:
        if xp >= threshold:
            return lvl, LEVEL_NAMES.get(lvl, "Grandmaster")
    return 1, "Beginner"


def calculate_xp_for_review(scores: dict, bugs_found: int, security_issues: int) -> int:
    """
    Calculate XP earned for a single code review.

    Breakdown:
        Base XP:          20   (guaranteed for completing any review)
        Score bonus:      overall_score × 2    (0–20 XP)
        Style bonus:      if style >= 9.0 → +5 XP bonus  [NEW]
        Bug bonus:        bugs_found × 3
        Security bonus:   security_issues × 4
        Cap:              100 XP per review

    Maximum possible (before cap):
        20 + 20 + 5 + (unlimited bugs) + (unlimited security)
        Practically capped at 100.

    Minimum possible:
        20 XP (score=0, no bugs, no security)
    """
    overall_score = scores.get("overall_score", 5.0)
    style_score   = scores.get("style_score", scores.get("readability_score", 0.0))

    base_xp      = 20
    score_bonus  = int(overall_score * 2)
    # FIX: style score was tracked for badges but never rewarded with XP
    style_bonus  = 5 if style_score >= 9.0 else 0
    bug_bonus    = bugs_found * 3
    security_bonus = security_issues * 4

    total = base_xp + score_bonus + style_bonus + bug_bonus + security_bonus
    return min(total, 100)


def calculate_badge_xp_bonus(new_badge_ids: List[str]) -> int:
    """
    NEW: Sum up xp_reward for all newly earned badges.
    Called in the service after badge checks so bonus XP is applied.
    """
    return sum(BADGES[bid]["xp_reward"] for bid in new_badge_ids if bid in BADGES)


def get_xp_breakdown(scores: dict, bugs_found: int, security_issues: int) -> dict:
    """
    NEW: Returns a detailed breakdown of how XP was calculated.
    Useful for showing users exactly why they earned a given XP amount.
    """
    overall_score  = scores.get("overall_score", 5.0)
    style_score    = scores.get("style_score", scores.get("readability_score", 0.0))

    base_xp        = 20
    score_bonus    = int(overall_score * 2)
    style_bonus    = 5 if style_score >= 9.0 else 0
    bug_bonus      = bugs_found * 3
    security_bonus = security_issues * 4
    subtotal       = base_xp + score_bonus + style_bonus + bug_bonus + security_bonus
    capped         = subtotal > 100

    return {
        "base_xp":        base_xp,
        "score_bonus":    score_bonus,
        "style_bonus":    style_bonus,
        "bug_bonus":      bug_bonus,
        "security_bonus": security_bonus,
        "subtotal":       subtotal,
        "capped":         capped,
        "total_xp":       min(subtotal, 100),
    }
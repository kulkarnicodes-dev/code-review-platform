from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

class ExpertiseLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    EXPERT = "expert"

class LearningResource(BaseModel):
    title: str
    url: str
    type: str  # "article", "video", "documentation", "course"
    description: str

class MistakeExplanation(BaseModel):
    category: str  # "bug", "performance", "style", "security", "best_practice"
    issue: str
    explanation: str  # Teacher-style explanation
    why_it_matters: str
    how_to_fix: str
    example_fix: Optional[str] = None

class MentorFeedback(BaseModel):
    expertise_level: ExpertiseLevel
    overall_assessment: str  # Personalized opening
    mistakes_explained: List[MistakeExplanation]
    learning_resources: List[LearningResource]
    personalized_tips: List[str]
    next_steps: List[str]
    encouragement: str
    skill_areas_to_improve: List[str]
    strengths_identified: List[str]

class MentorRequest(BaseModel):
    language: str
    code: str
    expertise_level: ExpertiseLevel = ExpertiseLevel.BEGINNER
    focus_areas: Optional[List[str]] = None  # e.g., ["security", "performance"]
    specific_question: Optional[str] = None

class MentorSession(BaseModel):
    id: str
    user_id: str
    language: str
    code_snippet: str
    expertise_level: ExpertiseLevel
    mentor_feedback: MentorFeedback
    created_at: datetime

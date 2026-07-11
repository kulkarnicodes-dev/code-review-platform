from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

class CodeSubmission(BaseModel):
    language: str
    code: str
    filename: Optional[str] = None

class AIFeedback(BaseModel):
    bugs: List[str] = []
    performance: List[str] = []
    style: List[str] = []
    security: List[str] = []
    summary: str
    refactored_code: Optional[str] = None

class ScoreBreakdown(BaseModel):
    quality_score: float
    readability_score: float
    performance_score: float
    security_score: float
    overall_score: float

class Review(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    language: str
    code_snippet: str
    filename: Optional[str] = None
    ai_feedback: AIFeedback
    scores: ScoreBreakdown
    created_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ReviewResponse(BaseModel):
    id: str
    language: str
    ai_feedback: AIFeedback
    scores: ScoreBreakdown
    created_at: datetime

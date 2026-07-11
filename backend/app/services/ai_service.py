from openai import OpenAI
from app.core.config import settings
from app.models.review import AIFeedback, ScoreBreakdown
import json
import re

class AIService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )

    async def review_code(self, code: str, language: str) -> tuple[AIFeedback, ScoreBreakdown]:
        """Review code using Groq AI and return feedback with scores"""
        
        prompt = f"""You are an expert code reviewer. Analyze the following {language} code and provide a comprehensive review.

Code:
```{language}
{code}
```

Provide your analysis in the following JSON format:
{{
"bugs": ["list of potential bugs or errors"],
"performance": ["list of performance improvement suggestions"],
"style": ["list of code style and best practice suggestions"],
"security": ["list of security concerns"],
"summary": "brief overall summary of the code quality",
"scores": {{
"quality_score": 0-10,
"readability_score": 0-10,
"performance_score": 0-10,
"security_score": 0-10
}}
}}

Only respond with valid JSON, no additional text."""

        try:
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a strict code reviewer. Output only JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )

            response_text = completion.choices[0].message.content

            # Extract JSON safely
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                response_data = json.loads(json_match.group())
            else:
                response_data = json.loads(response_text)

            feedback = AIFeedback(
                bugs=response_data.get("bugs", []),
                performance=response_data.get("performance", []),
                style=response_data.get("style", []),
                security=response_data.get("security", []),
                summary=response_data.get("summary", "")
            )

            scores_data = response_data.get("scores", {})

            overall = (
                scores_data.get("quality_score", 5) +
                scores_data.get("readability_score", 5) +
                scores_data.get("performance_score", 5) +
                scores_data.get("security_score", 5)
            ) / 4

            scores = ScoreBreakdown(
                quality_score=scores_data.get("quality_score", 5.0),
                readability_score=scores_data.get("readability_score", 5.0),
                performance_score=scores_data.get("performance_score", 5.0),
                security_score=scores_data.get("security_score", 5.0),
                overall_score=round(overall, 1)
            )

            return feedback, scores

        except Exception as e:
            print(f"Error in AI review: {str(e)}")

            feedback = AIFeedback(
                bugs=["Error analyzing code"],
                performance=[],
                style=[],
                security=[],
                summary="Unable to analyze code at this time"
            )

            scores = ScoreBreakdown(
                quality_score=0.0,
                readability_score=0.0,
                performance_score=0.0,
                security_score=0.0,
                overall_score=0.0
            )

            return feedback, scores

    async def analyze_code(self, code: str, language: str = "diff"):
        """
        Wrapper for GitHub commit analysis.
        Default language is 'diff'.
        Returns structured dictionary compatible with github_service.
        """

        feedback, scores = await self.review_code(code, language)

        return {
            "feedback": feedback.summary,
            "suggestions": (
                feedback.bugs +
                feedback.performance +
                feedback.style +
                feedback.security
            ),
            "overall_score": scores.overall_score,
            "commit_message": "GitHub Commit Analysis",
            "files_changed": 0
        }

    async def refactor_code(self, code: str, language: str) -> str:
        """Refactor code to improve quality"""

        prompt = f"""Refactor this {language} code for better quality and performance.
Return ONLY the improved code.

```{language}
{code}
```"""

        try:
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You refactor code and return only code."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )

            return completion.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error in refactoring: {str(e)}")
            return code


ai_service = AIService()
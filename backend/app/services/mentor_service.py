from openai import OpenAI
from app.core.config import settings
from app.models.mentor import MentorFeedback, MentorRequest, ExpertiseLevel, MistakeExplanation, LearningResource
import json
import re


class MentorService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )

    def _get_level_instructions(self, level: ExpertiseLevel) -> str:
        if level == ExpertiseLevel.BEGINNER:
            return """You are teaching a BEGINNER programmer. Use these guidelines:
- Explain concepts as if they've never heard of them before
- Use simple analogies and real-world examples
- Avoid jargon; if you must use technical terms, explain them
- Be extra encouraging and patient
- Focus on 2-3 key improvements max (don't overwhelm)
- Explain WHY something is wrong before HOW to fix it
- Suggest beginner-friendly resources (like freeCodeCamp, MDN basics)"""
        elif level == ExpertiseLevel.INTERMEDIATE:
            return """You are teaching an INTERMEDIATE programmer. Use these guidelines:
- Assume familiarity with basic concepts but explain advanced ones
- Reference design patterns, SOLID principles where applicable
- Include performance considerations
- Suggest multiple approaches and explain trade-offs
- Use technical terminology appropriately
- Point to official documentation and intermediate tutorials"""
        else:  # EXPERT
            return """You are mentoring an EXPERT programmer. Use these guidelines:
- Discuss advanced architectural and design concerns
- Reference industry best practices, patterns, and anti-patterns
- Focus on performance optimization, edge cases, security hardening
- Engage as a peer, using full technical terminology
- Suggest papers, advanced books, or expert-level resources
- Discuss systemic implications of code decisions"""

    async def get_mentor_feedback(self, request: MentorRequest) -> MentorFeedback:
        """Get AI mentor feedback tailored to expertise level"""

        level_instructions = self._get_level_instructions(request.expertise_level)
        focus_areas = ", ".join(request.focus_areas) if request.focus_areas else "all areas"
        specific_q = f"\nThe student has a specific question: {request.specific_question}" if request.specific_question else ""

        prompt = f"""{level_instructions}

You are reviewing the following {request.language} code:
```{request.language}
{request.code}
```
{specific_q}

Focus areas: {focus_areas}

Provide comprehensive MENTORING feedback (not just code review) in this EXACT JSON format:
{{
  "overall_assessment": "Personalized, warm opening that acknowledges what they attempted (2-3 sentences)",
  "mistakes_explained": [
    {{
      "category": "bug|performance|style|security|best_practice",
      "issue": "Brief issue title",
      "explanation": "Teacher-style explanation of what's wrong and why, using appropriate language for their level",
      "why_it_matters": "Real-world impact of this mistake",
      "how_to_fix": "Step-by-step guidance to fix it",
      "example_fix": "Optional: corrected code snippet for this specific issue"
    }}
  ],
  "learning_resources": [
    {{
      "title": "Resource name",
      "url": "https://actual-url.com",
      "type": "article|video|documentation|course",
      "description": "Why this resource is helpful for their level"
    }}
  ],
  "personalized_tips": ["Tip tailored to their level and the issues found"],
  "next_steps": ["Concrete next action they should take to improve"],
  "encouragement": "Specific encouraging message about what they did well or their progress",
  "skill_areas_to_improve": ["skill1", "skill2"],
  "strengths_identified": ["What they did well in this code"]
}}

Only output valid JSON. Make it genuinely helpful and educational."""

        try:
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert programming mentor and teacher. Output only valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=2000
            )

            response_text = completion.choices[0].message.content
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = json.loads(response_text)

            # Parse mistakes
            mistakes = []
            for m in data.get("mistakes_explained", []):
                mistakes.append(MistakeExplanation(
                    category=m.get("category", "best_practice"),
                    issue=m.get("issue", ""),
                    explanation=m.get("explanation", ""),
                    why_it_matters=m.get("why_it_matters", ""),
                    how_to_fix=m.get("how_to_fix", ""),
                    example_fix=m.get("example_fix")
                ))

            # Parse resources
            resources = []
            for r in data.get("learning_resources", []):
                resources.append(LearningResource(
                    title=r.get("title", ""),
                    url=r.get("url", "#"),
                    type=r.get("type", "article"),
                    description=r.get("description", "")
                ))

            return MentorFeedback(
                expertise_level=request.expertise_level,
                overall_assessment=data.get("overall_assessment", ""),
                mistakes_explained=mistakes,
                learning_resources=resources,
                personalized_tips=data.get("personalized_tips", []),
                next_steps=data.get("next_steps", []),
                encouragement=data.get("encouragement", "Keep up the great work!"),
                skill_areas_to_improve=data.get("skill_areas_to_improve", []),
                strengths_identified=data.get("strengths_identified", [])
            )

        except Exception as e:
            # Fallback response
            return MentorFeedback(
                expertise_level=request.expertise_level,
                overall_assessment="I've reviewed your code and have some feedback for you.",
                mistakes_explained=[],
                learning_resources=[
                    LearningResource(
                        title="Python Documentation",
                        url="https://docs.python.org/3/",
                        type="documentation",
                        description="Official Python documentation"
                    )
                ],
                personalized_tips=["Practice writing code with clear variable names"],
                next_steps=["Review the code and apply the suggested improvements"],
                encouragement="Keep coding and learning! Every expert was once a beginner.",
                skill_areas_to_improve=[],
                strengths_identified=[]
            )


mentor_service = MentorService()

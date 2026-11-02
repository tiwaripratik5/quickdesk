import logging
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

VALID_CATEGORIES = {"IT", "HR", "Finance", "Admin", "Other"}
VALID_PRIORITIES = {"Low", "Medium", "High"}


async def suggest_category_and_priority(title: str, description: str) -> tuple[str, str, float]:
    """Use Groq LLM to suggest category, priority and confidence score for a ticket."""
    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        prompt = f"""You are an IT helpdesk assistant. Analyze the following support ticket and return ONLY a JSON object with 'category', 'priority', and 'confidence' fields.

Category must be exactly one of: IT, HR, Finance, Admin, Other
Priority must be exactly one of: Low, Medium, High
Confidence must be a float between 0.0 and 1.0 indicating your certainty.

Ticket Title: {title}
Ticket Description: {description}

Return ONLY valid JSON like: {{"category": "IT", "priority": "High", "confidence": 0.95}}
Do not include any explanation or additional text."""

        response = await client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=100,
        )
        content = response.choices[0].message.content.strip()

        # Parse the JSON response
        import json
        start = content.find("{")
        end = content.rfind("}") + 1
        if start != -1 and end > start:
            json_str = content[start:end]
            data = json.loads(json_str)
            category = data.get("category", "Other")
            priority = data.get("priority", "Medium")
            confidence = float(data.get("confidence", 0.85))
        else:
            category = "Other"
            priority = "Medium"
            confidence = 0.50

        # Validate values
        if category not in VALID_CATEGORIES:
            category = "Other"
            confidence = 0.50
        if priority not in VALID_PRIORITIES:
            priority = "Medium"
        confidence = max(0.0, min(1.0, round(confidence, 2)))

        return category, priority, confidence
    except Exception as e:
        logger.error(f"LLM service error: {e}")
        return "Other", "Medium", 0.50

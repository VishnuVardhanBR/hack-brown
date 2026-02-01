import google.generativeai as genai
from typing import List, Dict, Any
import json
import os
import asyncio


class GeminiService:
    """Service for AI-powered itinerary planning using Google Gemini"""

    def __init__(self, api_key: str = None, model_name: str = "gemini-2.0-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = model_name
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)

    async def plan_itinerary(
        self,
        events: List[Dict[str, Any]],
        date: str,
        city: str,
        budget: str,
        preferences: str = ""
    ) -> List[Dict[str, Any]]:
        """
        Generate an optimized itinerary from available events using Gemini.
        
        Args:
            events: List of event data from SerpAPI
            date: Target date (YYYY-MM-DD)
            city: City name
            budget: Budget tier
            preferences: User preferences
            
        Returns:
            List of itinerary items with structured data
        """
        pref_instruction = ""
        if preferences:
            pref_instruction = f"""
IMPORTANT - User's Interests: {preferences}
Prioritize events that match these interests! Only include events that align with what the user wants to do.
"""

        prompt = f"""You are an expert itinerary planner. Create a fun, optimized day plan for {date} in {city}.

Budget: {budget}
{pref_instruction}
Available events in the city:
{json.dumps(events, indent=2)}

YOUR TASK:
1. SELECT 3-5 events that best match the user's interests and budget
2. SCHEDULE them in a logical order with realistic timing
3. Consider travel time between venues (15-30 min)
4. Include breaks for meals if needed
5. Start around 10am, end by 10-11pm

Return ONLY a JSON array with this exact structure:
[
    {{
        "title": "Event name",
        "start_time": "HH:MM",
        "end_time": "HH:MM",
        "location": "Full address",
        "description": "Brief fun description of why this is great",
        "ticket_info": "Price info or 'Free'",
        "estimated_cost": 0.00
    }}
]
"""

        try:
            # Run blocking call in thread pool to avoid blocking the event loop
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except json.JSONDecodeError as e:
            print(f"Gemini JSON parse error: {e}")
            raise ValueError("Failed to parse itinerary from AI response")
        except Exception as e:
            print(f"Gemini API error: {e}")
            raise

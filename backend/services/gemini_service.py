import google.generativeai as genai
from typing import List, Dict, Any
import json
import os
import asyncio
import logging

logger = logging.getLogger(__name__)


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
        dates: List[str],
        city: str,
        budget: str,
        preferences: str = ""
    ) -> List[Dict[str, Any]]:
        """
        Generate an optimized itinerary from available events using Gemini.
        
        Args:
            events: List of event data from SerpAPI
            dates: List of target dates (YYYY-MM-DD format)
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
        
        # Format dates for the prompt
        num_days = len(dates)
        dates_str = ", ".join(dates)
        
        if num_days == 1:
            day_planning = f"Create a fun, optimized day plan for {dates[0]} in {city}."
            event_count = "3-5 events"
        else:
            day_planning = f"Create a fun, optimized {num_days}-day plan for {city} covering these dates: {dates_str}."
            event_count = f"3-5 events PER DAY"

        # Define budget limits for each tier (total budget, per-event max)
        budget_limits = {
            "$0": (0, 0, "ONLY include FREE events. estimated_cost must be 0 for all events. Total must be $0."),
            "$1-$50": (50, 20, "TOTAL cost must be under $50. Each event should cost $20 or less. Prioritize FREE events."),
            "$50-$150": (150, 40, "TOTAL cost must be under $150. Each event should cost $40 or less."),
            "$150-$300": (300, 75, "TOTAL cost must be under $300. Each event should cost $75 or less."),
            "$300-$500": (500, 125, "TOTAL cost must be under $500. Each event should cost $125 or less."),
            "$500+": (1000, 250, "Higher budget available for premium experiences. Total under $1000.")
        }
        total_max, per_event_max, budget_instruction = budget_limits.get(budget, (150, 50, "Be cost-conscious."))

        prompt = f"""You are an expert itinerary planner. {day_planning}

ACTIVITIES TO CHOOSE FROM:
{json.dumps(events, indent=2)}

BUDGET: ${total_max} total maximum
{pref_instruction}
Create a day itinerary with 3-5 activities where the TOTAL cost stays under ${total_max}.

Rules:
- Pick 3-5 activities and schedule them from 10am to 10pm
- The SUM of all estimated_cost must be under ${total_max}
- Use realistic costs based on ticket prices shown
- If an event is free, set estimated_cost to 0

Return a JSON array:
[
    {{"title": "Name", "date": "{dates[0]}", "start_time": "10:00", "end_time": "12:00", "location": "Address", "description": "Fun description", "ticket_info": "Price or Free", "estimated_cost": 0.00}}
]

Return 3-5 events. Total cost under ${total_max}.
"""

        logger.info(f"[Gemini] Sending {len(events)} events to plan {event_count}")
        logger.debug(f"[Gemini] Prompt length: {len(prompt)} chars")

        try:
            # Run blocking call in thread pool to avoid blocking the event loop
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            result = json.loads(response.text)
            logger.info(f"[Gemini] Generated {len(result)} itinerary items")
            return result
        except json.JSONDecodeError as e:
            logger.error(f"[Gemini] JSON parse error: {e}")
            logger.error(f"[Gemini] Raw response: {response.text[:500]}")
            raise ValueError("Failed to parse itinerary from AI response")
        except Exception as e:
            logger.error(f"[Gemini] API error: {e}")
            raise

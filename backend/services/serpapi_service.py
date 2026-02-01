from serpapi import GoogleSearch
from typing import List, Dict, Any
import os
import asyncio


class SerpAPIService:
    """Service for searching events using SerpAPI Google Events"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("SERPAPI_KEY")

    async def search_events(
        self,
        city: str,
        state: str,
        date: str,
        budget: str,
        preferences: str = ""
    ) -> List[Dict[str, Any]]:
        """
        Search for events using SerpAPI Google Events engine.
        Keep query simple - Gemini will filter by preferences.
        """
        # Simple query only - complex queries fail
        query = f"Events in {city}, {state}"
        print(f"[SerpAPI] Searching: {query}")

        params = {
            "api_key": self.api_key,
            "engine": "google_events",
            "q": query,
            "hl": "en",
            "gl": "us"
        }

        try:
            search = GoogleSearch(params)
            results = await asyncio.to_thread(search.get_dict)

            # Check for API errors
            if "error" in results:
                print(f"[SerpAPI] API error: {results['error']}")
                return self._get_fallback_events(city, date)

            events = results.get("events_results", [])
            print(f"[SerpAPI] Found {len(events)} events")

            if not events:
                return self._get_fallback_events(city, date)

            # Return all events - Gemini will filter by budget and preferences
            return events[:15]

        except Exception as e:
            print(f"[SerpAPI] Error: {e}")
            return self._get_fallback_events(city, date)

    def _get_fallback_events(self, city: str, date: str) -> List[Dict[str, Any]]:
        """Return fallback mock events when SerpAPI fails"""
        print(f"[SerpAPI] Using fallback events for {city}")
        return [
            {
                "title": f"Local Art Gallery Opening",
                "date": {"start_date": date, "when": "10:00 AM - 2:00 PM"},
                "address": [f"Downtown {city}"],
                "description": "Explore works by local artists in this community gallery showcase.",
                "ticket_info": [{"price": "Free"}]
            },
            {
                "title": f"Farmers Market",
                "date": {"start_date": date, "when": "9:00 AM - 1:00 PM"},
                "address": [f"City Center, {city}"],
                "description": "Fresh local produce, artisan goods, and live music.",
                "ticket_info": [{"price": "Free"}]
            },
            {
                "title": f"Live Jazz Night",
                "date": {"start_date": date, "when": "7:00 PM - 10:00 PM"},
                "address": [f"Jazz Club, {city}"],
                "description": "Enjoy an evening of smooth jazz with local musicians.",
                "ticket_info": [{"price": "$15"}]
            },
            {
                "title": f"Food Truck Festival",
                "date": {"start_date": date, "when": "11:00 AM - 8:00 PM"},
                "address": [f"Waterfront Park, {city}"],
                "description": "Sample delicious cuisine from the city's best food trucks.",
                "ticket_info": [{"price": "Free entry"}]
            },
            {
                "title": f"Comedy Show",
                "date": {"start_date": date, "when": "8:00 PM - 10:00 PM"},
                "address": [f"Laugh Factory, {city}"],
                "description": "Stand-up comedy featuring rising stars and local favorites.",
                "ticket_info": [{"price": "$20"}]
            }
        ]

    def _filter_by_budget(self, events: List[Dict], budget: str) -> List[Dict]:
        """Filter events based on budget tier"""
        if budget == "$0":
            return [e for e in events if self._is_free_event(e)][:10]
        elif budget == "$1-$20":
            return [e for e in events if self._get_event_cost(e) <= 20][:10]
        elif budget == "$20-$50":
            return [e for e in events if self._get_event_cost(e) <= 50][:10]
        return events[:10]

    def _is_free_event(self, event: Dict) -> bool:
        """Check if event is free"""
        ticket_info = event.get("ticket_info", [])
        if isinstance(ticket_info, list):
            for info in ticket_info:
                if isinstance(info, dict) and "free" in str(info).lower():
                    return True
        return "free" in str(event).lower()

    def _get_event_cost(self, event: Dict) -> float:
        """Extract event cost from ticket info"""
        ticket_info = event.get("ticket_info", [])
        if isinstance(ticket_info, list):
            for info in ticket_info:
                if isinstance(info, dict):
                    price = info.get("price", "")
                    if price:
                        try:
                            return float(price.replace("$", "").replace(",", "").split("-")[0])
                        except (ValueError, AttributeError):
                            pass
        return 0.0

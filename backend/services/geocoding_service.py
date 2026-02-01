import httpx
from typing import Optional, Dict, List


class GeocodingService:
    """Service for geocoding location strings to coordinates using Google Geocoding API"""

    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def geocode(self, address: str, city_hint: str = "") -> Optional[Dict[str, float]]:
        """
        Convert address string to lat/lng coordinates.

        Args:
            address: Location string (e.g., "MoMA, New York")
            city_hint: Optional city context for better accuracy

        Returns:
            Dict with 'lat' and 'lng' keys, or None if geocoding fails
        """
        query = f"{address}, {city_hint}" if city_hint else address

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.BASE_URL,
                params={
                    "address": query,
                    "key": self.api_key
                }
            )

            data = response.json()

            if data.get("status") == "OK" and data.get("results"):
                location = data["results"][0]["geometry"]["location"]
                return {
                    "lat": location["lat"],
                    "lng": location["lng"]
                }

            return None

    async def geocode_batch(self, locations: List[str], city_hint: str = "") -> List[Optional[Dict[str, float]]]:
        """Geocode multiple locations"""
        results = []
        for location in locations:
            coords = await self.geocode(location, city_hint)
            results.append(coords)
        return results

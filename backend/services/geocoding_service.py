import httpx
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)


class GeocodingService:
    """Service for geocoding location strings to coordinates using Google Geocoding API"""

    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

    # Major US cities with approximate bounding boxes for validation
    CITY_BOUNDS = {
        "new york": {"lat": (40.4, 41.0), "lng": (-74.3, -73.7)},
        "los angeles": {"lat": (33.7, 34.4), "lng": (-118.7, -117.9)},
        "chicago": {"lat": (41.6, 42.1), "lng": (-88.0, -87.5)},
        "houston": {"lat": (29.5, 30.1), "lng": (-95.8, -95.0)},
        "phoenix": {"lat": (33.2, 33.8), "lng": (-112.4, -111.8)},
        "philadelphia": {"lat": (39.8, 40.2), "lng": (-75.3, -74.9)},
        "san antonio": {"lat": (29.2, 29.7), "lng": (-98.8, -98.3)},
        "san diego": {"lat": (32.5, 33.1), "lng": (-117.3, -116.9)},
        "dallas": {"lat": (32.6, 33.1), "lng": (-97.0, -96.5)},
        "san francisco": {"lat": (37.6, 37.9), "lng": (-122.6, -122.3)},
        "austin": {"lat": (30.1, 30.5), "lng": (-98.0, -97.5)},
        "boston": {"lat": (42.2, 42.5), "lng": (-71.2, -70.9)},
        "seattle": {"lat": (47.4, 47.8), "lng": (-122.5, -122.2)},
        "denver": {"lat": (39.6, 39.9), "lng": (-105.1, -104.8)},
        "miami": {"lat": (25.6, 25.9), "lng": (-80.4, -80.1)},
        "atlanta": {"lat": (33.6, 34.0), "lng": (-84.6, -84.2)},
        "portland": {"lat": (45.4, 45.6), "lng": (-122.8, -122.5)},
        "las vegas": {"lat": (35.9, 36.3), "lng": (-115.4, -115.0)},
        "nashville": {"lat": (35.9, 36.3), "lng": (-87.0, -86.6)},
        "new orleans": {"lat": (29.8, 30.1), "lng": (-90.2, -89.9)},
    }

    def __init__(self, api_key: str):
        self.api_key = api_key

    def _is_within_city_bounds(self, lat: float, lng: float, city: str) -> bool:
        """Check if coordinates fall within expected city bounds"""
        city_lower = city.lower().strip()
        bounds = self.CITY_BOUNDS.get(city_lower)
        if not bounds:
            return True  # No bounds defined, assume valid
        
        lat_min, lat_max = bounds["lat"]
        lng_min, lng_max = bounds["lng"]
        return lat_min <= lat <= lat_max and lng_min <= lng <= lng_max

    async def geocode(self, address: str, city_hint: str = "", state_hint: str = "") -> Optional[Dict[str, float]]:
        """
        Convert address string to lat/lng coordinates.

        Args:
            address: Location string (e.g., "MoMA, New York")
            city_hint: Optional city context for better accuracy
            state_hint: Optional state for US addresses

        Returns:
            Dict with 'lat' and 'lng' keys, or None if geocoding fails
        """
        # Build query with city context
        if city_hint and city_hint.lower() not in address.lower():
            query = f"{address}, {city_hint}"
            if state_hint:
                query = f"{address}, {city_hint}, {state_hint}"
        else:
            query = address

        # Build params with components filter for better accuracy
        params = {
            "address": query,
            "key": self.api_key
        }
        
        # Add country component to prefer US results
        if state_hint or city_hint:
            params["components"] = "country:US"

        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL, params=params)
            data = response.json()

            if data.get("status") == "OK" and data.get("results"):
                location = data["results"][0]["geometry"]["location"]
                lat, lng = location["lat"], location["lng"]
                
                # Validate coordinates are within expected city bounds
                if city_hint and not self._is_within_city_bounds(lat, lng, city_hint):
                    logger.warning(f"Geocoded '{address}' returned coords outside {city_hint} bounds, retrying with city in query")
                    # Retry with more explicit query
                    retry_query = f"{address}, {city_hint}, USA"
                    retry_response = await client.get(
                        self.BASE_URL,
                        params={"address": retry_query, "key": self.api_key, "components": "country:US"}
                    )
                    retry_data = retry_response.json()
                    if retry_data.get("status") == "OK" and retry_data.get("results"):
                        location = retry_data["results"][0]["geometry"]["location"]
                        lat, lng = location["lat"], location["lng"]
                
                return {"lat": lat, "lng": lng}

            logger.warning(f"Geocoding failed for '{query}': {data.get('status')}")
            return None

    async def geocode_batch(self, locations: List[str], city_hint: str = "", state_hint: str = "") -> List[Optional[Dict[str, float]]]:
        """Geocode multiple locations"""
        results = []
        for location in locations:
            coords = await self.geocode(location, city_hint, state_hint)
            results.append(coords)
        return results

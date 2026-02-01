import httpx
from typing import List, Dict, Optional, Tuple


def decode_polyline(encoded: str) -> List[Tuple[float, float]]:
    """Decode a Google encoded polyline string into a list of lat/lng tuples."""
    decoded = []
    index = 0
    lat = 0
    lng = 0

    while index < len(encoded):
        # Decode latitude
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if result & 1 else result >> 1
        lat += dlat

        # Decode longitude
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if result & 1 else result >> 1
        lng += dlng

        decoded.append((lat / 1e5, lng / 1e5))

    return decoded


class DirectionsService:
    """Service for getting directions between locations using Google Directions API"""

    BASE_URL = "https://maps.googleapis.com/maps/api/directions/json"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def get_route(
        self,
        origin: Dict[str, float],
        destination: Dict[str, float],
        waypoints: Optional[List[Dict[str, float]]] = None,
        mode: str = "walking"
    ) -> Optional[List[Dict[str, float]]]:
        """
        Get route between origin and destination with optional waypoints.

        Args:
            origin: Dict with 'lat' and 'lng' keys
            destination: Dict with 'lat' and 'lng' keys
            waypoints: Optional list of intermediate points
            mode: Travel mode - 'driving', 'walking', 'bicycling', 'transit'

        Returns:
            List of lat/lng dicts representing the route polyline
        """
        origin_str = f"{origin['lat']},{origin['lng']}"
        dest_str = f"{destination['lat']},{destination['lng']}"

        params = {
            "origin": origin_str,
            "destination": dest_str,
            "mode": mode,
            "key": self.api_key
        }

        # Add waypoints if provided
        if waypoints and len(waypoints) > 0:
            wp_strs = [f"{wp['lat']},{wp['lng']}" for wp in waypoints]
            params["waypoints"] = "|".join(wp_strs)

        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL, params=params)
            data = response.json()

            if data.get("status") == "OK" and data.get("routes"):
                # Get the overview polyline from the first route
                encoded_polyline = data["routes"][0]["overview_polyline"]["points"]
                decoded = decode_polyline(encoded_polyline)
                return [{"lat": lat, "lng": lng} for lat, lng in decoded]

            return None

    async def get_multi_stop_route(
        self,
        stops: List[Dict[str, float]],
        mode: str = "walking"
    ) -> Optional[List[Dict[str, float]]]:
        """
        Get route through multiple stops.

        Args:
            stops: List of dicts with 'lat' and 'lng' keys (minimum 2)
            mode: Travel mode

        Returns:
            List of lat/lng dicts representing the full route polyline
        """
        if len(stops) < 2:
            return None

        origin = stops[0]
        destination = stops[-1]
        waypoints = stops[1:-1] if len(stops) > 2 else None

        return await self.get_route(origin, destination, waypoints, mode)

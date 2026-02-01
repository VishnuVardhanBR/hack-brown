from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
import uuid

load_dotenv()

from services import SerpAPIService, GeminiService, CalendarService, GeocodingService, DirectionsService
from config import get_settings

settings = get_settings()

app = FastAPI(
    title="Metropolis API",
    description="AI-Powered Event Discovery & Itinerary Planner",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
serpapi_service = SerpAPIService(api_key=settings.serpapi_key)
gemini_service = GeminiService(api_key=settings.gemini_api_key, model_name=settings.gemini_model)
calendar_service = CalendarService()
geocoding_service = GeocodingService(api_key=settings.google_maps_api_key)
directions_service = DirectionsService(api_key=settings.google_maps_api_key)

# Request/Response Models
class SearchRequest(BaseModel):
    city: str
    state: str
    date: str
    budget: str
    preferences: Optional[str] = ""

class ItineraryItem(BaseModel):
    title: str
    start_time: str
    end_time: str
    location: str
    description: str
    ticket_info: str = ""
    estimated_cost: float = 0.0

class ItineraryResponse(BaseModel):
    itinerary_id: str
    events: List[ItineraryItem]
    total_cost: float
    summary: str
    date: str
    city: str

class GeocodeRequest(BaseModel):
    itinerary_id: str

class GeocodedEvent(BaseModel):
    title: str
    location: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    start_time: str
    end_time: str

class GeocodeResponse(BaseModel):
    events: List[GeocodedEvent]
    center: dict

class RouteRequest(BaseModel):
    itinerary_id: str
    mode: str = "walking"

class RouteResponse(BaseModel):
    route: List[dict]
    duration_text: Optional[str] = None

# In-memory storage
itineraries_store = {}

@app.post("/api/generate-itinerary", response_model=ItineraryResponse)
async def generate_itinerary(request: SearchRequest):
    """Main endpoint that orchestrates event discovery and itinerary planning"""
    try:
        # Step 1: Search for events using SerpAPI
        events = await serpapi_service.search_events(
            request.city, request.state, request.date,
            request.budget, request.preferences
        )

        if not events:
            raise HTTPException(status_code=404, detail="No events found for your criteria")

        # Step 2: Generate itinerary with Gemini
        itinerary_data = await gemini_service.plan_itinerary(
            events=events,
            date=request.date,
            city=request.city,
            budget=request.budget,
            preferences=request.preferences
        )

        itinerary = [ItineraryItem(**item) for item in itinerary_data]

        # Store for later ICS export
        itinerary_id = str(uuid.uuid4())
        itineraries_store[itinerary_id] = {
            "itinerary": itinerary,
            "date": request.date,
            "city": request.city
        }

        return ItineraryResponse(
            itinerary_id=itinerary_id,
            events=itinerary,
            total_cost=sum(e.estimated_cost for e in itinerary),
            summary=f"Your {request.city} adventure",
            date=request.date,
            city=request.city
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export-ics/{itinerary_id}")
async def export_ics(itinerary_id: str):
    """Export itinerary as .ics calendar file"""
    if itinerary_id not in itineraries_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    data = itineraries_store[itinerary_id]
    
    # Convert ItineraryItem objects to dicts for calendar service
    itinerary_dicts = [
        {
            "title": item.title,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "location": item.location,
            "description": item.description
        }
        for item in data["itinerary"]
    ]
    
    ics_content = calendar_service.generate_ics(itinerary_dicts, data["date"], data["city"])
    filename = f"metropolis_{data['city']}_{data['date']}.ics"

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/api/geocode-itinerary", response_model=GeocodeResponse)
async def geocode_itinerary(request: GeocodeRequest):
    """Geocode all locations in an itinerary for map display"""
    if request.itinerary_id not in itineraries_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    data = itineraries_store[request.itinerary_id]
    city = data["city"]

    geocoded_events = []
    valid_coords = []

    for item in data["itinerary"]:
        coords = await geocoding_service.geocode(item.location, city)

        geocoded_event = GeocodedEvent(
            title=item.title,
            location=item.location,
            lat=coords["lat"] if coords else None,
            lng=coords["lng"] if coords else None,
            start_time=item.start_time,
            end_time=item.end_time
        )
        geocoded_events.append(geocoded_event)

        if coords:
            valid_coords.append(coords)

    # Calculate center point
    if valid_coords:
        center = {
            "lat": sum(c["lat"] for c in valid_coords) / len(valid_coords),
            "lng": sum(c["lng"] for c in valid_coords) / len(valid_coords)
        }
    else:
        # Fallback to city center geocoding
        city_coords = await geocoding_service.geocode(city)
        center = city_coords or {"lat": 40.7128, "lng": -74.0060}

    return GeocodeResponse(events=geocoded_events, center=center)

@app.post("/api/get-route", response_model=RouteResponse)
async def get_route(request: RouteRequest):
    """Get walking/driving route between all stops in an itinerary"""
    if request.itinerary_id not in itineraries_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    data = itineraries_store[request.itinerary_id]
    city = data["city"]

    # First geocode all locations
    stops = []
    for item in data["itinerary"]:
        coords = await geocoding_service.geocode(item.location, city)
        if coords:
            stops.append(coords)

    if len(stops) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 valid locations for route")

    # Get route from directions service
    route = await directions_service.get_multi_stop_route(stops, mode=request.mode)

    if not route:
        raise HTTPException(status_code=500, detail="Failed to get route directions")

    return RouteResponse(route=route)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)

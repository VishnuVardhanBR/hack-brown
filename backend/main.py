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
    dates: List[str]  # Changed from single date to array of dates
    budget: str
    preferences: Optional[str] = ""

class ItineraryItem(BaseModel):
    title: str
    date: str = ""  # Added date field for multi-day support
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
    dates: List[str]  # Changed from single date to array
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

class RecalculateRequest(BaseModel):
    itinerary_id: str
    additional_prompt: str = ""
    excluded_events: List[str] = []

# In-memory storage
itineraries_store = {}

@app.post("/api/generate-itinerary", response_model=ItineraryResponse)
async def generate_itinerary(request: SearchRequest):
    """Main endpoint that orchestrates event discovery and itinerary planning"""
    try:
        # Step 1: Search for events using SerpAPI (searches all dates)
        events = await serpapi_service.search_events(
            request.city, request.state, request.dates,
            request.budget, request.preferences
        )

        if not events:
            raise HTTPException(status_code=404, detail="No events found for your criteria")

        # Step 2: Generate multi-day itinerary with Gemini
        itinerary_data = await gemini_service.plan_itinerary(
            events=events,
            dates=request.dates,
            city=request.city,
            budget=request.budget,
            preferences=request.preferences
        )

        itinerary = [ItineraryItem(**item) for item in itinerary_data]

        # Store for later ICS export and recalculation
        itinerary_id = str(uuid.uuid4())
        itineraries_store[itinerary_id] = {
            "itinerary": itinerary,
            "dates": request.dates,
            "city": request.city,
            "state": request.state,
            "budget": request.budget,
            "preferences": request.preferences
        }

        num_days = len(request.dates)
        day_text = "day" if num_days == 1 else f"{num_days}-day"
        
        return ItineraryResponse(
            itinerary_id=itinerary_id,
            events=itinerary,
            total_cost=sum(e.estimated_cost for e in itinerary),
            summary=f"Your {day_text} {request.city} adventure",
            dates=request.dates,
            city=request.city
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recalculate-itinerary", response_model=ItineraryResponse)
async def recalculate_itinerary(request: RecalculateRequest):
    """Regenerate itinerary with additional preferences and excluded events"""
    if request.itinerary_id not in itineraries_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    try:
        # Get original search parameters
        original = itineraries_store[request.itinerary_id]
        city = original["city"]
        state = original["state"]
        dates = original["dates"]
        budget = original["budget"]
        base_preferences = original.get("preferences", "")

        # Combine original preferences with additional prompt
        combined_preferences = base_preferences
        if request.additional_prompt:
            combined_preferences = f"{base_preferences}. {request.additional_prompt}" if base_preferences else request.additional_prompt

        # Add exclusions to preferences
        if request.excluded_events:
            exclusion_text = f" DO NOT include these events: {', '.join(request.excluded_events)}"
            combined_preferences += exclusion_text

        # Re-search for events
        events = await serpapi_service.search_events(
            city, state, dates, budget, combined_preferences
        )

        if not events:
            raise HTTPException(status_code=404, detail="No events found for your criteria")

        # Filter out excluded events by title
        if request.excluded_events:
            events = [e for e in events if e.get("title", "") not in request.excluded_events]

        # Generate new itinerary with Gemini
        itinerary_data = await gemini_service.plan_itinerary(
            events=events,
            dates=dates,
            city=city,
            budget=budget,
            preferences=combined_preferences
        )

        itinerary = [ItineraryItem(**item) for item in itinerary_data]

        # Store new itinerary
        new_itinerary_id = str(uuid.uuid4())
        itineraries_store[new_itinerary_id] = {
            "itinerary": itinerary,
            "dates": dates,
            "city": city,
            "state": state,
            "budget": budget,
            "preferences": combined_preferences
        }

        num_days = len(dates)
        day_text = "day" if num_days == 1 else f"{num_days}-day"

        return ItineraryResponse(
            itinerary_id=new_itinerary_id,
            events=itinerary,
            total_cost=sum(e.estimated_cost for e in itinerary),
            summary=f"Your updated {day_text} {city} adventure",
            dates=dates,
            city=city
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
    dates = data["dates"]
    
    # Convert ItineraryItem objects to dicts for calendar service
    itinerary_dicts = [
        {
            "title": item.title,
            "date": item.date or dates[0],  # Use event date or first date as fallback
            "start_time": item.start_time,
            "end_time": item.end_time,
            "location": item.location,
            "description": item.description
        }
        for item in data["itinerary"]
    ]
    
    ics_content = calendar_service.generate_ics(itinerary_dicts, dates, data["city"])
    date_str = dates[0] if len(dates) == 1 else f"{dates[0]}_to_{dates[-1]}"
    filename = f"metropolis_{data['city']}_{date_str}.ics"

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

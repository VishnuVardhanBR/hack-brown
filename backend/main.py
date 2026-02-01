from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
import uuid
import logging

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

from services import SerpAPIService, GeminiService, CalendarService, GeocodingService, DirectionsService
from config import get_settings

settings = get_settings()

app = FastAPI(
    title="OughtToSee API",
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
    logger.info(f"=== NEW ITINERARY REQUEST ===")
    logger.info(f"City: {request.city}, {request.state}")
    logger.info(f"Dates: {request.dates}")
    logger.info(f"Budget: {request.budget}")
    logger.info(f"Preferences: {request.preferences or 'None'}")

    try:
        # Step 1: Search for events using SerpAPI (searches all dates)
        logger.info(f"Step 1: Searching events via SerpAPI...")
        events = await serpapi_service.search_events(
            request.city, request.state, request.dates,
            request.budget, request.preferences
        )
        logger.info(f"SerpAPI returned {len(events)} events")

        relaxed_search = False

        # If no events found, use fallback events instead of failing
        if not events:
            logger.warning(f"No events found, using fallback events for {request.city}")
            relaxed_search = True
            events = serpapi_service._get_fallback_events(
                request.city,
                request.dates[0] if request.dates else ""
            )

        # Step 2: Generate multi-day itinerary with Gemini
        logger.info(f"Step 2: Generating itinerary with Gemini...")
        itinerary_data = await gemini_service.plan_itinerary(
            events=events,
            dates=request.dates,
            city=request.city,
            budget=request.budget,
            preferences=request.preferences
        )
        logger.info(f"Gemini returned {len(itinerary_data)} itinerary items")

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

        # Modify summary if search was relaxed
        summary = f"Your {day_text} {request.city} adventure"
        if relaxed_search:
            summary = f"Your {day_text} {request.city} adventure (curated suggestions)"

        total_cost = sum(e.estimated_cost for e in itinerary)
        logger.info(f"=== ITINERARY COMPLETE ===")
        logger.info(f"Events: {len(itinerary)}, Total Cost: ${total_cost:.2f}")
        for i, e in enumerate(itinerary, 1):
            logger.info(f"  {i}. {e.title} ({e.start_time}-{e.end_time}) - ${e.estimated_cost:.2f}")

        return ItineraryResponse(
            itinerary_id=itinerary_id,
            events=itinerary,
            total_cost=total_cost,
            summary=summary,
            dates=request.dates,
            city=request.city
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating itinerary: {e}")
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

        relaxed_search = False
        
        # If no events found, use fallback events instead of failing
        if not events:
            print(f"[API] No events found for recalculation, using fallback events for {city}")
            relaxed_search = True
            events = serpapi_service._get_fallback_events(
                city, 
                dates[0] if dates else ""
            )

        # Filter out excluded events by title
        if request.excluded_events:
            events = [e for e in events if e.get("title", "") not in request.excluded_events]
        
        # If filtering excluded events left us with nothing, use fallback events
        if not events:
            print(f"[API] No events remaining after exclusions, using fallback events for {city}")
            relaxed_search = True
            events = serpapi_service._get_fallback_events(
                city, 
                dates[0] if dates else ""
            )
            # Filter excluded from fallback too
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
    filename = f"oughttosee_{data['city']}_{date_str}.ics"

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/export-pdf/{itinerary_id}")
async def export_pdf(itinerary_id: str):
    """Export itinerary as PDF file"""
    from fpdf import FPDF
    import io

    if itinerary_id not in itineraries_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    data = itineraries_store[itinerary_id]
    dates = data["dates"]
    city = data["city"]
    itinerary = data["itinerary"]

    # Helper to sanitize text for PDF (replace Unicode chars not supported by Helvetica)
    def sanitize_text(text: str) -> str:
        if not text:
            return text
        replacements = {
            "'": "'", "'": "'", """: '"', """: '"',
            "–": "-", "—": "-", "…": "...", "•": "-",
            "é": "e", "è": "e", "ê": "e", "ë": "e",
            "à": "a", "â": "a", "ä": "a",
            "ù": "u", "û": "u", "ü": "u",
            "ô": "o", "ö": "o", "ò": "o",
            "î": "i", "ï": "i", "ì": "i",
            "ç": "c", "ñ": "n",
        }
        for orig, repl in replacements.items():
            text = text.replace(orig, repl)
        # Remove any remaining non-latin1 characters
        return text.encode('latin-1', errors='replace').decode('latin-1')

    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Title
    pdf.set_font("Helvetica", "B", 24)
    pdf.cell(0, 15, sanitize_text(f"Your {city} Itinerary"), ln=True, align="C")

    # Date range
    pdf.set_font("Helvetica", "", 12)
    if len(dates) == 1:
        date_text = dates[0]
    else:
        date_text = f"{dates[0]} to {dates[-1]}"
    pdf.cell(0, 10, date_text, ln=True, align="C")
    pdf.ln(10)

    # Total cost
    total_cost = sum(item.estimated_cost for item in itinerary)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, f"Total Estimated Cost: ${total_cost:.2f}", ln=True)
    pdf.ln(5)

    # Events
    current_date = None
    for item in itinerary:
        event_date = item.date or dates[0]

        # Date header if new date
        if event_date != current_date:
            current_date = event_date
            pdf.ln(5)
            pdf.set_font("Helvetica", "B", 16)
            pdf.set_fill_color(147, 112, 219)  # Purple
            pdf.set_text_color(255, 255, 255)
            pdf.cell(0, 10, f"  {event_date}", ln=True, fill=True)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(3)

        # Event details
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, sanitize_text(f"{item.start_time} - {item.end_time}  |  {item.title}"), ln=True)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 6, sanitize_text(f"Location: {item.location}"), ln=True)

        if item.description:
            pdf.multi_cell(0, 5, sanitize_text(item.description))

        if item.estimated_cost > 0:
            pdf.set_font("Helvetica", "I", 10)
            pdf.cell(0, 6, f"Cost: ${item.estimated_cost:.2f}", ln=True)

        pdf.set_text_color(0, 0, 0)
        pdf.ln(5)

    # Footer
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 10, "Generated by OughtToSee", ln=True, align="C")

    # Output PDF
    pdf_content = pdf.output()
    date_str = dates[0] if len(dates) == 1 else f"{dates[0]}_to_{dates[-1]}"
    filename = f"oughttosee_{city}_{date_str}.pdf"

    return Response(
        content=bytes(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/api/geocode-itinerary", response_model=GeocodeResponse)
async def geocode_itinerary(request: GeocodeRequest):
    """Geocode all locations in an itinerary for map display"""
    if request.itinerary_id not in itineraries_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    data = itineraries_store[request.itinerary_id]
    city = data["city"]
    state = data.get("state", "")

    geocoded_events = []
    valid_coords = []

    for item in data["itinerary"]:
        coords = await geocoding_service.geocode(item.location, city, state)

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
        city_coords = await geocoding_service.geocode(city, "", state)
        center = city_coords or {"lat": 40.7128, "lng": -74.0060}

    return GeocodeResponse(events=geocoded_events, center=center)

    return GeocodeResponse(events=geocoded_events, center=center)

@app.post("/api/get-route", response_model=RouteResponse)
async def get_route(request: RouteRequest):
    """Get walking/driving route between all stops in an itinerary"""
    if request.itinerary_id not in itineraries_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    data = itineraries_store[request.itinerary_id]
    city = data["city"]
    state = data.get("state", "")

    # First geocode all locations
    stops = []
    for item in data["itinerary"]:
        coords = await geocoding_service.geocode(item.location, city, state)
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

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
import uuid

load_dotenv()

from services import SerpAPIService, GeminiService, CalendarService
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

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)

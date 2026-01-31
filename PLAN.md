# Metropolis - AI-Powered Event Discovery & Itinerary Planner

## Project Overview

Metropolis is a mobile application that leverages Fetch.ai's autonomous agents to discover events and intelligently build personalized itineraries. Users input their city, budget, dates, and preferences, and the app's AI agents collaborate to find relevant events and construct an optimized schedule that can be exported as an .ics calendar file.

### Target Tracks
- Beginner Track
- Fetch.ai
- Visa
- Metropolis
- Best Domain

---

## Color Palette & Theme

Based on the Metropolis cityscape aesthetic with soft pinks and purples:

### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Very Light Pink | `#F9EAEC` | Background/Base (29.3%) |
| Soft Pink | `#E9C2CA` | Primary Accent (13.3%) |
| Purple | `#9367AB` | Primary Brand Color (8.5%) |

### Secondary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Lavender | `#CBABD0` | Secondary backgrounds, cards (9.1%) |
| Rose Pink | `#D7A7B5` | Highlights, borders (8.2%) |
| Medium Purple | `#C285B6` | Interactive elements (7.4%) |

### Accent Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Deep Purple | `#734DA1` | CTAs, buttons (6.6%) |
| Light Purple | `#A68EC3` | Hover states, icons (5.8%) |
| Dark Purple | `#59377A` | Secondary buttons (3.8%) |

### Text Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Very Dark Purple | `#3A1F41` | Primary text, headings (1.6%) |
| White | `#FFFFFF` | Text on dark backgrounds |

---

## Tech Stack

### Frontend
- **React Native** (Expo recommended for rapid development)
- **React Navigation** - Screen navigation
- **React Native Paper** or custom theme provider for styling
- **Axios** - HTTP client for API calls

### Backend
- **FastAPI** (Python) - REST API server
- **Fetch.ai uAgents** - Autonomous agent framework
- **Pydantic** - Data validation and settings

### External APIs
- **SerpAPI** - Google Events search
- **Google Gemini API** - Structured itinerary generation
- **icalendar** (Python library) - .ics file generation

### Fetch.ai Components
- **uAgents Framework** - Agent creation and management
- **Protocols** - Agent communication patterns
- **Bureau** - Multi-agent orchestration

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT NATIVE APP                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Welcome  │→ │  City    │→ │  Budget  │→ │   Date   │→           │
│  │ Screen   │  │ Selection│  │  Screen  │  │  Picker  │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                                                      ↓              │
│  ┌──────────┐  ┌──────────────────────────────────────┐            │
│  │Itinerary │← │      Preferences (Optional)          │            │
│  │ Display  │  └──────────────────────────────────────┘            │
│  └──────────┘                                                       │
└─────────────────────────────────────────────────────────────────────┘
         │                              ↑
         │ HTTP Requests                │ JSON Response
         ↓                              │
┌─────────────────────────────────────────────────────────────────────┐
│                         FASTAPI BACKEND                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    REST API Endpoints                       │    │
│  │  POST /api/search-events                                    │    │
│  │  POST /api/generate-itinerary                               │    │
│  │  GET  /api/export-ics/{itinerary_id}                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    AGENT ORCHESTRATOR                       │    │
│  │              (Bureau - Multi-Agent Manager)                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│         │                    │                    │                  │
│         ↓                    ↓                    ↓                  │
│  ┌────────────┐      ┌────────────┐      ┌────────────┐            │
│  │   Event    │      │  Itinerary │      │  Calendar  │            │
│  │  Finder    │ ───→ │  Planner   │ ───→ │  Export    │            │
│  │   Agent    │      │   Agent    │      │   Agent    │            │
│  └────────────┘      └────────────┘      └────────────┘            │
│         │                    │                                       │
│         ↓                    ↓                                       │
│  ┌────────────┐      ┌────────────┐                                │
│  │  SerpAPI   │      │  Gemini    │                                │
│  │  (Events)  │      │   API      │                                │
│  └────────────┘      └────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fetch.ai Agent Architecture

### Agent 1: Event Finder Agent

**Purpose:** Discovers events based on user criteria using SerpAPI.

```python
from uagents import Agent, Context, Model, Protocol
from serpapi import GoogleSearch
import os

class EventSearchRequest(Model):
    city: str
    state: str
    date: str
    budget: str
    preferences: str = ""

class EventSearchResponse(Model):
    events: list  # List of event dictionaries
    search_query: str
    total_found: int

event_finder = Agent(
    name="event_finder",
    seed="event_finder_seed_phrase",
    port=8001,
    endpoint=["http://localhost:8001/submit"]
)

event_protocol = Protocol("EventSearch")

@event_protocol.on_message(model=EventSearchRequest, replies=EventSearchResponse)
async def find_events(ctx: Context, sender: str, msg: EventSearchRequest):
    # Build search query
    query = f"Events in {msg.city}, {msg.state}"
    if msg.preferences:
        query += f" {msg.preferences}"

    # Call SerpAPI
    params = {
        "api_key": os.getenv("SERPAPI_KEY"),
        "engine": "google_events",
        "q": query,
        "hl": "en",
        "gl": "us"
    }

    search = GoogleSearch(params)
    results = search.get_dict()
    events = results.get("events_results", [])

    # Filter by budget if specified
    filtered_events = filter_by_budget(events, msg.budget)

    await ctx.send(sender, EventSearchResponse(
        events=filtered_events,
        search_query=query,
        total_found=len(filtered_events)
    ))

event_finder.include(event_protocol)
```

### Agent 2: Itinerary Planner Agent

**Purpose:** Uses Gemini API to create structured, optimized itineraries.

```python
from uagents import Agent, Context, Model, Protocol
import google.generativeai as genai
from pydantic import BaseModel
from typing import List
import json

class ItineraryEvent(BaseModel):
    title: str
    start_time: str
    end_time: str
    location: str
    description: str
    ticket_info: str = ""
    estimated_cost: float = 0.0

class ItineraryRequest(Model):
    events: list
    date: str
    city: str
    budget: str
    preferences: str = ""

class ItineraryResponse(Model):
    itinerary: list  # List of ItineraryEvent dicts
    total_estimated_cost: float
    summary: str

itinerary_planner = Agent(
    name="itinerary_planner",
    seed="itinerary_planner_seed_phrase",
    port=8002,
    endpoint=["http://localhost:8002/submit"]
)

itinerary_protocol = Protocol("ItineraryPlanning")

@itinerary_protocol.on_message(model=ItineraryRequest, replies=ItineraryResponse)
async def plan_itinerary(ctx: Context, sender: str, msg: ItineraryRequest):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = f"""
    Create an optimized day itinerary from these events for {msg.date} in {msg.city}.
    Budget: {msg.budget}
    User preferences: {msg.preferences}

    Available events:
    {json.dumps(msg.events, indent=2)}

    Return a JSON array with this exact structure:
    [
        {{
            "title": "Event name",
            "start_time": "HH:MM",
            "end_time": "HH:MM",
            "location": "Full address",
            "description": "Brief description",
            "ticket_info": "Price or 'Free'",
            "estimated_cost": 0.00
        }}
    ]

    Order events chronologically. Include travel time considerations.
    Stay within budget. Select 3-5 best events that fit the user's preferences.
    """

    response = model.generate_content(
        prompt,
        generation_config={
            "response_mime_type": "application/json"
        }
    )

    itinerary_data = json.loads(response.text)
    total_cost = sum(e.get("estimated_cost", 0) for e in itinerary_data)

    await ctx.send(sender, ItineraryResponse(
        itinerary=itinerary_data,
        total_estimated_cost=total_cost,
        summary=f"Your {msg.city} adventure with {len(itinerary_data)} events"
    ))

itinerary_planner.include(itinerary_protocol)
```

### Agent 3: Calendar Export Agent

**Purpose:** Generates .ics calendar files from itineraries.

```python
from uagents import Agent, Context, Model, Protocol
from icalendar import Calendar, Event
from datetime import datetime, timedelta
import uuid

class CalendarExportRequest(Model):
    itinerary: list
    date: str
    timezone: str = "America/New_York"

class CalendarExportResponse(Model):
    ics_content: str
    filename: str
    event_count: int

calendar_agent = Agent(
    name="calendar_export",
    seed="calendar_export_seed_phrase",
    port=8003,
    endpoint=["http://localhost:8003/submit"]
)

calendar_protocol = Protocol("CalendarExport")

@calendar_protocol.on_message(model=CalendarExportRequest, replies=CalendarExportResponse)
async def export_calendar(ctx: Context, sender: str, msg: CalendarExportRequest):
    cal = Calendar()
    cal.add('prodid', '-//Metropolis Itinerary//metropolis.app//')
    cal.add('version', '2.0')
    cal.add('calscale', 'GREGORIAN')

    base_date = datetime.strptime(msg.date, "%Y-%m-%d")

    for item in msg.itinerary:
        event = Event()
        event.add('summary', item['title'])
        event.add('description', item.get('description', ''))
        event.add('location', item.get('location', ''))

        # Parse times
        start_time = datetime.strptime(item['start_time'], "%H:%M")
        end_time = datetime.strptime(item['end_time'], "%H:%M")

        event.add('dtstart', base_date.replace(
            hour=start_time.hour,
            minute=start_time.minute
        ))
        event.add('dtend', base_date.replace(
            hour=end_time.hour,
            minute=end_time.minute
        ))
        event.add('uid', str(uuid.uuid4()))

        cal.add_component(event)

    ics_content = cal.to_ical().decode('utf-8')

    await ctx.send(sender, CalendarExportResponse(
        ics_content=ics_content,
        filename=f"metropolis_itinerary_{msg.date}.ics",
        event_count=len(msg.itinerary)
    ))

calendar_agent.include(calendar_protocol)
```

### Agent Bureau (Orchestrator)

```python
from uagents import Bureau

bureau = Bureau()
bureau.add(event_finder)
bureau.add(itinerary_planner)
bureau.add(calendar_agent)

if __name__ == "__main__":
    bureau.run()
```

---

## FastAPI Backend Implementation

### Project Structure

```
backend/
├── main.py                 # FastAPI app entry point
├── agents/
│   ├── __init__.py
│   ├── event_finder.py     # Event Finder Agent
│   ├── itinerary_planner.py # Itinerary Planner Agent
│   ├── calendar_export.py  # Calendar Export Agent
│   └── bureau.py           # Agent orchestrator
├── api/
│   ├── __init__.py
│   ├── routes.py           # API endpoints
│   └── models.py           # Pydantic models
├── services/
│   ├── __init__.py
│   ├── serpapi_service.py  # SerpAPI integration
│   ├── gemini_service.py   # Gemini API integration
│   └── calendar_service.py # ICS generation
├── config.py               # Configuration settings
└── requirements.txt
```

### Main FastAPI Application

```python
# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import uuid
from datetime import datetime

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

# Request/Response Models
class SearchRequest(BaseModel):
    city: str
    state: str
    date: str  # YYYY-MM-DD
    budget: str  # "$0", "$1-$20", "$20-$50", "$50+"
    preferences: Optional[str] = ""

class EventItem(BaseModel):
    title: str
    date: str
    time: str
    location: str
    description: str
    ticket_info: Optional[str] = ""
    thumbnail: Optional[str] = ""

class ItineraryItem(BaseModel):
    title: str
    start_time: str
    end_time: str
    location: str
    description: str
    ticket_info: str
    estimated_cost: float

class ItineraryResponse(BaseModel):
    itinerary_id: str
    events: List[ItineraryItem]
    total_cost: float
    summary: str
    date: str
    city: str

# In-memory storage (use Redis/DB in production)
itineraries_store = {}

@app.post("/api/generate-itinerary", response_model=ItineraryResponse)
async def generate_itinerary(request: SearchRequest):
    """
    Main endpoint that orchestrates all agents:
    1. Event Finder Agent searches for events
    2. Itinerary Planner Agent creates optimized schedule
    3. Returns structured itinerary
    """
    try:
        # Step 1: Search for events (Event Finder Agent)
        events = await search_events_with_agent(request)

        if not events:
            raise HTTPException(
                status_code=404,
                detail="No events found for your criteria"
            )

        # Step 2: Generate itinerary (Itinerary Planner Agent)
        itinerary = await plan_itinerary_with_agent(
            events=events,
            date=request.date,
            city=request.city,
            budget=request.budget,
            preferences=request.preferences
        )

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

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export-ics/{itinerary_id}")
async def export_ics(itinerary_id: str):
    """
    Export itinerary as .ics calendar file
    Uses Calendar Export Agent
    """
    if itinerary_id not in itineraries_store:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    data = itineraries_store[itinerary_id]

    # Generate ICS with Calendar Agent
    ics_content = await generate_ics_with_agent(
        itinerary=data["itinerary"],
        date=data["date"]
    )

    filename = f"metropolis_{data['city']}_{data['date']}.ics"

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
```

### Requirements

```txt
# requirements.txt
fastapi==0.109.0
uvicorn==0.27.0
uagents==0.14.0
google-search-results==2.4.2
google-generativeai==0.4.0
icalendar==5.0.11
pydantic==2.5.3
python-dotenv==1.0.0
httpx==0.26.0
```

---

## React Native Frontend Implementation

### Project Structure

```
mobile/
├── App.tsx
├── app.json
├── package.json
├── src/
│   ├── screens/
│   │   ├── WelcomeScreen.tsx
│   │   ├── CitySelectionScreen.tsx
│   │   ├── BudgetScreen.tsx
│   │   ├── DatePickerScreen.tsx
│   │   ├── PreferencesScreen.tsx
│   │   ├── LoadingScreen.tsx
│   │   └── ItineraryScreen.tsx
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EventCard.tsx
│   │   ├── ProgressIndicator.tsx
│   │   └── CityAutocomplete.tsx
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── ThemeProvider.tsx
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   └── navigation/
│       └── AppNavigator.tsx
```

### Theme Configuration

```typescript
// src/theme/colors.ts
export const colors = {
  // Primary
  background: '#F9EAEC',
  primaryAccent: '#E9C2CA',
  primary: '#9367AB',

  // Secondary
  lavender: '#CBABD0',
  rosePink: '#D7A7B5',
  mediumPurple: '#C285B6',

  // Accent
  deepPurple: '#734DA1',
  lightPurple: '#A68EC3',
  darkPurple: '#59377A',

  // Text
  textPrimary: '#3A1F41',
  textSecondary: '#59377A',
  textLight: '#FFFFFF',

  // UI
  cardBackground: '#FFFFFF',
  border: '#E9C2CA',
  disabled: '#CBABD0',
  error: '#D35D6E',
  success: '#7CB342',
};

export const gradients = {
  primary: ['#9367AB', '#734DA1'],
  secondary: ['#E9C2CA', '#CBABD0'],
  background: ['#F9EAEC', '#E9C2CA'],
};
```

### Welcome Screen

```typescript
// src/screens/WelcomeScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { colors } from '../theme/colors';

export const WelcomeScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in title
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Fade in button after delay
    setTimeout(() => {
      Animated.timing(buttonFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1500);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.title}>METROPOLIS</Text>
        <Text style={styles.subtitle}>
          Discover events. Build your perfect day.
        </Text>
        <Text style={styles.description}>
          AI-powered itinerary planning that finds the best events
          in your city and creates a personalized schedule just for you.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.buttonContainer, { opacity: buttonFadeAnim }]}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('CitySelection')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 4,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: colors.deepPurple,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.darkPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: 18,
    fontWeight: '600',
  },
});
```

### API Service

```typescript
// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export interface SearchParams {
  city: string;
  state: string;
  date: string;
  budget: string;
  preferences?: string;
}

export interface ItineraryEvent {
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  ticket_info: string;
  estimated_cost: number;
}

export interface ItineraryResponse {
  itinerary_id: string;
  events: ItineraryEvent[];
  total_cost: number;
  summary: string;
  date: string;
  city: string;
}

export const api = {
  generateItinerary: async (params: SearchParams): Promise<ItineraryResponse> => {
    const response = await axios.post(`${API_BASE_URL}/generate-itinerary`, params);
    return response.data;
  },

  exportICS: async (itineraryId: string): Promise<Blob> => {
    const response = await axios.get(`${API_BASE_URL}/export-ics/${itineraryId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
```

### Itinerary Display Screen

```typescript
// src/screens/ItineraryScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { colors } from '../theme/colors';
import { ItineraryEvent } from '../services/api';

interface Props {
  route: {
    params: {
      itinerary: ItineraryEvent[];
      itineraryId: string;
      totalCost: number;
      city: string;
      date: string;
    };
  };
}

export const ItineraryScreen = ({ route }: Props) => {
  const { itinerary, itineraryId, totalCost, city, date } = route.params;

  const handleExportICS = async () => {
    try {
      // Download ICS file
      const response = await fetch(
        `http://localhost:8000/api/export-ics/${itineraryId}`
      );
      const blob = await response.blob();
      // Handle file download based on platform
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your {city} Itinerary</Text>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.totalCost}>
          Estimated Total: ${totalCost.toFixed(2)}
        </Text>
      </View>

      <ScrollView style={styles.eventList}>
        {itinerary.map((event, index) => (
          <View key={index} style={styles.eventCard}>
            <View style={styles.timeContainer}>
              <Text style={styles.time}>{event.start_time}</Text>
              <View style={styles.timeLine} />
              <Text style={styles.time}>{event.end_time}</Text>
            </View>

            <View style={styles.eventDetails}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventLocation}>{event.location}</Text>
              <Text style={styles.eventDescription}>{event.description}</Text>
              {event.ticket_info && (
                <Text style={styles.ticketInfo}>{event.ticket_info}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.exportButton} onPress={handleExportICS}>
        <Text style={styles.exportButtonText}>Export to Calendar (.ics)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textLight,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: colors.lavender,
    marginBottom: 8,
  },
  totalCost: {
    fontSize: 14,
    color: colors.textLight,
    opacity: 0.9,
  },
  eventList: {
    flex: 1,
    padding: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.darkPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 50,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  timeLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.lavender,
    marginVertical: 4,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  ticketInfo: {
    fontSize: 12,
    color: colors.deepPurple,
    marginTop: 8,
    fontWeight: '500',
  },
  exportButton: {
    backgroundColor: colors.deepPurple,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## Data Models

### Pydantic Models (Backend)

```python
# api/models.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserPreferences(BaseModel):
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=50)
    date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    budget: str = Field(..., pattern=r'^(\$0|\$1-\$20|\$20-\$50|\$50\+)$')
    preferences: Optional[str] = Field(None, max_length=500)

class Event(BaseModel):
    title: str
    date: Optional[str] = None
    time: Optional[str] = None
    location: str
    address: Optional[str] = None
    description: Optional[str] = None
    ticket_info: Optional[str] = None
    price: Optional[float] = 0.0
    thumbnail: Optional[str] = None
    link: Optional[str] = None

class ItineraryItem(BaseModel):
    title: str
    start_time: str
    end_time: str
    location: str
    description: str
    ticket_info: str = ""
    estimated_cost: float = 0.0

class Itinerary(BaseModel):
    id: str
    user_preferences: UserPreferences
    events: List[ItineraryItem]
    total_cost: float
    created_at: datetime
    summary: str
```

### Agent Message Models

```python
# agents/models.py
from uagents import Model
from typing import List, Optional

class EventSearchRequest(Model):
    city: str
    state: str
    date: str
    budget: str
    preferences: str = ""

class EventData(Model):
    title: str
    date: str
    time: str
    location: str
    description: str
    ticket_info: str
    price: float
    thumbnail: str

class EventSearchResponse(Model):
    events: List[dict]
    search_query: str
    total_found: int

class ItineraryRequest(Model):
    events: List[dict]
    date: str
    city: str
    budget: str
    preferences: str = ""

class ItineraryResponse(Model):
    itinerary: List[dict]
    total_estimated_cost: float
    summary: str

class CalendarRequest(Model):
    itinerary: List[dict]
    date: str
    timezone: str = "America/New_York"

class CalendarResponse(Model):
    ics_content: str
    filename: str
    event_count: int
```

---

## User Flow Implementation

### Screen Navigation Flow

```
1. WelcomeScreen
   └─> "Get Started" button

2. CitySelectionScreen
   ├─> Text input for city
   ├─> Autocomplete dropdown for state
   └─> "Continue" button (validates city)

3. BudgetScreen
   ├─> Budget range selector (radio/slider)
   │   ├─> $0 (Free events only)
   │   ├─> $1-$20
   │   ├─> $20-$50
   │   └─> $50+
   └─> "Continue" button

4. DatePickerScreen
   ├─> Calendar date picker
   └─> "Continue" button

5. PreferencesScreen (Optional)
   ├─> Text input for preferences
   ├─> Suggestion chips (arts, shopping, food, outdoors)
   ├─> "Skip" button
   └─> "Generate Itinerary" button

6. LoadingScreen
   ├─> Animated cityscape
   ├─> "Finding events..." status
   ├─> Fun facts about the selected city
   └─> Auto-navigates when complete

7. ItineraryScreen
   ├─> Header with city, date, total cost
   ├─> Scrollable event timeline
   ├─> "Export to Calendar" button
   └─> (Optional) Edit/regenerate options
```

---

## Environment Variables

```env
# .env
# Backend
SERPAPI_KEY=your_serpapi_key
GEMINI_API_KEY=your_gemini_api_key
AGENT_SEED_EVENT_FINDER=event_finder_secret_seed
AGENT_SEED_ITINERARY_PLANNER=itinerary_planner_secret_seed
AGENT_SEED_CALENDAR=calendar_export_secret_seed

# Agent ports
EVENT_FINDER_PORT=8001
ITINERARY_PLANNER_PORT=8002
CALENDAR_AGENT_PORT=8003

# FastAPI
API_HOST=0.0.0.0
API_PORT=8000
```

---

## Development Phases

### Phase 1: Foundation
- [ ] Set up FastAPI backend structure
- [ ] Set up React Native project with Expo
- [ ] Implement theme and color system
- [ ] Create basic navigation flow

### Phase 2: Agent Development
- [ ] Implement Event Finder Agent with SerpAPI
- [ ] Implement Itinerary Planner Agent with Gemini
- [ ] Implement Calendar Export Agent
- [ ] Set up Bureau for agent orchestration
- [ ] Test agent-to-agent communication

### Phase 3: API Integration
- [ ] Create FastAPI endpoints
- [ ] Connect agents to API routes
- [ ] Implement error handling
- [ ] Add request validation

### Phase 4: Frontend Development
- [ ] Build Welcome Screen with animations
- [ ] Build City Selection Screen
- [ ] Build Budget Selection Screen
- [ ] Build Date Picker Screen
- [ ] Build Preferences Screen
- [ ] Build Loading Screen with animations
- [ ] Build Itinerary Display Screen

### Phase 5: Integration & Polish
- [ ] Connect frontend to backend API
- [ ] Implement ICS file export/download
- [ ] Add loading states and error handling
- [ ] UI polish and animations
- [ ] Test end-to-end flow

### Phase 6: Extras (If Time Permits)
- [ ] User authentication
- [ ] Event deletion and regeneration
- [ ] PDF export
- [ ] Transportation/travel time integration
- [ ] Multi-day itineraries

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-itinerary` | Generate full itinerary from user preferences |
| GET | `/api/export-ics/{itinerary_id}` | Download .ics calendar file |
| GET | `/api/health` | Health check endpoint |
| POST | `/api/search-events` | (Optional) Direct event search |

---

## Resources & Documentation

### Fetch.ai
- [uAgents Documentation](https://uagents.fetch.ai/docs)
- [Quick Start Guide](https://uagents.fetch.ai/docs/quickstart)
- [Agent Handlers](https://uagents.fetch.ai/docs/guides/handlers)
- [Protocols Guide](https://uagents.fetch.ai/docs/guides/protocols)
- [Storage Guide](https://fetch.ai/blog/uagents-storage-guide)
- [GitHub Repository](https://github.com/fetchai/uAgents)

### External APIs
- [SerpAPI Google Events](https://serpapi.com/google-events-api)
- [Gemini API Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [icalendar Python Library](https://icalendar.readthedocs.io/)

### React Native
- [React Navigation Themes](https://reactnavigation.org/docs/themes/)
- [React Native Paper Theming](https://callstack.github.io/react-native-paper/docs/guides/theming/)

---

## Notes

- **City Validation**: Use a predefined list or external API for city validation
- **Budget Filtering**: Parse ticket_info from SerpAPI to filter by price
- **Date Handling**: Use ISO format (YYYY-MM-DD) throughout
- **Agent Seeds**: Keep seed phrases consistent for reproducible addresses
- **Error States**: Always have fallback UI for API failures
- **Loading States**: Show progress during agent processing (can take 5-15 seconds)






from datetime import datetime
from uuid import uuid4
from openai import OpenAI
from uagents import Context, Protocol, Agent
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)
import httpx

# ASI-1 client for natural language processing
client = OpenAI(
    base_url='https://api.asi1.ai/v1',
    api_key=
)
# SerpAPI key for event search
SERPAPI_KEY = 

agent = Agent()
protocol = Protocol(spec=chat_protocol_spec)

def search_events(query: str) -> list:
    """Search for events using SerpAPI"""
    try:
        params = {
            "api_key": SERPAPI_KEY,
            "engine": "google_events",
            "q": query,
            "hl": "en",
            "gl": "us"
        }
        response = httpx.get("https://serpapi.com/search", params=params, timeout=30)
        data = response.json()
        return data.get("events_results", [])[:5]
    except Exception as e:
        return []

def format_events(events: list) -> str:
    """Format events for display"""
    if not events:
        return "Sorry, I couldn't find any events matching your criteria."
    
    result = "🎉 Events Found:\n\n"
    for i, event in enumerate(events, 1):
        title = event.get("title", "Untitled Event")
        date_info = event.get("date", {})
        when = date_info.get("when", "Date TBD") if isinstance(date_info, dict) else str(date_info)
        address = event.get("address", ["Location TBD"])
        address_str = ", ".join(address) if isinstance(address, list) else str(address)
        
        result += f"{i}. {title}\n"
        result += f"   Date: {when}\n"
        result += f"   Location: {address_str}\n\n"
    
    return result

@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    ctx.logger.info("Received message, starting to process...")
    
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id),
    )
    
    text = ''
    for item in msg.content:
        if isinstance(item, TextContent):
            text += item.text
    
    ctx.logger.info(f"User message: {text}")
    
    try:
        # Use LLM to extract search query
        ctx.logger.info("Calling ASI-1 to parse query...")
        r = client.chat.completions.create(
            model="asi1-mini",
            messages=[
                {"role": "system", "content": """
                    You are an event search assistant. Extract the city and event type from the user's message.
                    Return ONLY the search query in format: "events in [city] [event type]"
                    Example: "events in Boston concerts" or "events in New York food festivals"
                """},
                {"role": "user", "content": text},
            ],
            max_tokens=100,
        )
        search_query = str(r.choices[0].message.content)
        ctx.logger.info(f"Search query: {search_query}")
        
        # Search for events
        ctx.logger.info("Calling SerpAPI...")
        events = search_events(search_query)
        ctx.logger.info(f"Found {len(events)} events")
        
        response = format_events(events)
        
    except Exception as e:
        ctx.logger.error(f"Error: {str(e)}")
        response = f"Sorry, I encountered an error: {str(e)}"
    
    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[
            TextContent(type="text", text=response),
            EndSessionContent(type="end-session"),
        ]
    ))

@protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

agent.include(protocol, publish_manifest=True)


________________________________________________
from datetime import datetime
from uuid import uuid4

from openai import OpenAI
from uagents import Context, Protocol, Agent
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    StartSessionContent,
    TextContent,
    chat_protocol_spec,
)

##
### Itinerary Planner Agent for Metropolis
##

def create_text_chat(text: str, end_session: bool = False) -> ChatMessage:
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session"))
    return ChatMessage(timestamp=datetime.utcnow(), msg_id=uuid4(), content=content)

# ASI-1 client for itinerary planning
client = OpenAI(
    base_url='https://api.asi1.ai/v1',
    api_key=
)

agent = Agent()
protocol = Protocol(spec=chat_protocol_spec)

@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id),
    )

    # Greet if session starts
    if any(isinstance(item, StartSessionContent) for item in msg.content):
        await ctx.send(
            sender,
            create_text_chat("Hi! I'm your Itinerary Planner. Send me a list of events and I'll create an optimized schedule for your day!", end_session=False),
        )

    text = msg.text()
    if not text:
        return

    ctx.logger.info(f"Planning itinerary for: {text}")

    try:
        r = client.chat.completions.create(
            model="asi1-mini",
            messages=[
                {"role": "system", "content": """You are an expert itinerary planner for city exploration. Given events and preferences, create an optimized day schedule.

Rules:
1. Consider realistic travel times between venues (15-30 min)
2. Include meal breaks (lunch 12-1pm, dinner 6-7pm)
3. Don't overlap events
4. Respect the user's budget if mentioned
5. Start day around 9-10am, end by 10-11pm

Format your response clearly:

📅 YOUR ITINERARY FOR [CITY]
━━━━━━━━━━━━━━━━━━━━━━━━

🕘 9:00 AM - [EVENT NAME]
   📍 [Location]
   💰 $[Cost]
   ⏱️ [Duration]
   
🕐 [NEXT TIME] - [NEXT EVENT]
   ...

━━━━━━━━━━━━━━━━━━━━━━━━
💵 TOTAL ESTIMATED COST: $XX
🚶 TOTAL TRAVEL TIME: XX min
✨ TIPS: [Any helpful suggestions]

If no events are provided, ask the user for: city, date, events or preferences, and budget."""},
                {"role": "user", "content": text},
            ],
            max_tokens=1500,
        )

        response = str(r.choices[0].message.content)
        ctx.logger.info("Itinerary created successfully")
        
    except Exception as e:
        ctx.logger.exception('Error creating itinerary')
        response = f"Sorry, I encountered an error while planning your itinerary: {e}"

    await ctx.send(sender, create_text_chat(response, end_session=True))


@protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

agent.include(protocol, publish_manifest=True)
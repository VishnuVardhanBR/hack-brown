# OughtToSee

**AI-Powered Event Discovery & Itinerary Planner**

> Discover events. Build your perfect day.

OughtToSee is a mobile application that leverages autonomous AI agents to discover local events and intelligently build personalized itineraries. Whether you're a local looking for something to do or a traveler exploring a new city, OughtToSee curates the perfect schedule based on your budget, dates, and interests.

---

## Features

### Autonomous AI Agents
- **Event Finder Agent** - Discovers events via SerpAPI's Google Events engine
- **Itinerary Planner Agent** - Uses Google Gemini AI to build optimized day plans considering travel times and costs
- **Calendar Export Agent** - Generates `.ics` files for seamless calendar integration

### Smart Itinerary Generation
Tell us **where**, **when**, **how much**, and **what** - OughtToSee creates a complete, coherent schedule in seconds.

### Interactive Maps
- Geocoded event locations with Google Maps integration
- Multi-stop route planning (walking/driving)
- Aerial view visualization

### Export Options
- **ICS Export** - Add to Google Calendar, Apple Calendar, or Outlook
- **PDF Export** - Beautiful formatted itinerary document

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile** | React Native, Expo SDK 54, TypeScript |
| **Navigation** | React Navigation (Native Stack) |
| **Backend** | Python, FastAPI |
| **AI** | Google Gemini 2.0 Flash |
| **Event Data** | SerpAPI (Google Events) |
| **Maps** | Google Maps Platform (Geocoding, Directions, Aerial View) |
| **Calendar** | iCalendar (ics generation) |

---

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
## Project Structure

```
hack-brown/
├── backend/
│   ├── main.py              # FastAPI application & endpoints
│   ├── config.py            # Environment configuration
│   ├── requirements.txt     # Python dependencies
│   └── services/
│       ├── serpapi_service.py    # Event discovery
│       ├── gemini_service.py     # AI itinerary planning
│       ├── calendar_service.py   # ICS generation
│       ├── geocoding_service.py  # Location geocoding
│       └── directions_service.py # Route planning
│
├── mobile/
│   ├── App.tsx              # App entry & navigation
│   ├── app.json             # Expo configuration
│   ├── package.json         # Node dependencies
│   └── src/
│       ├── screens/         # App screens
│       │   ├── WelcomeScreen.tsx
│       │   ├── CitySelectionScreen.tsx
│       │   ├── BudgetScreen.tsx
│       │   ├── DatePickerScreen.tsx
│       │   ├── PreferencesScreen.tsx
│       │   ├── AdditionalPreferencesScreen.tsx
│       │   ├── LoadingScreen.tsx
│       │   ├── ItineraryScreen.tsx
│       │   ├── MapScreen.tsx
│       │   └── AerialViewScreen.tsx
│       ├── config/          # API configuration
│       ├── theme/           # Colors & styling
│       └── assets/          # Images & media
│
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Expo CLI** (`npm install -g expo-cli`)
- API Keys:
  - [Google Gemini API](https://ai.google.dev/)
  - [SerpAPI](https://serpapi.com/)
  - [Google Maps Platform](https://console.cloud.google.com/) (Geocoding, Directions, Maps SDK)

---

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the `backend/` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   SERPAPI_KEY=your_serpapi_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

5. **Start the server**
   ```bash
   python main.py
   ```
   
   Server runs at `http://localhost:8000`

---

### Mobile App Setup

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `mobile/` directory:
   ```env
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Start Expo development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on physical device

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/generate-itinerary` | Generate AI-powered itinerary |
| `POST` | `/api/recalculate-itinerary` | Regenerate with new preferences |
| `GET` | `/api/export-ics/{itinerary_id}` | Export as ICS calendar file |
| `GET` | `/api/export-pdf/{itinerary_id}` | Export as PDF document |
| `POST` | `/api/geocode-itinerary` | Geocode all event locations |
| `POST` | `/api/get-route` | Get route between stops |
| `GET` | `/api/health` | Health check |

### Generate Itinerary Request

```json
{
  "city": "New York",
  "state": "NY",
  "dates": ["2025-03-15", "2025-03-16"],
  "budget": "$50-$150",
  "preferences": "music, food, art"
}
```

### Budget Options
- `$0` - Free events only
- `$1-$50`
- `$50-$150`
- `$150-$300`
- `$300-$500`
- `$500+`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI itinerary planning |
| `SERPAPI_KEY` | SerpAPI key for event discovery |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key for geocoding & directions |

### Mobile (`mobile/.env`)

| Variable | Description |
|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | Google Maps API key for map display |

---

## App Flow

1. **Welcome** - Landing screen
2. **City Selection** - Choose your destination
3. **Budget** - Set your spending limit
4. **Date Picker** - Select date(s)
5. **Preferences** - Pick interests (Music, Art, Food, Sports, etc.)
6. **Additional Preferences** - Optional custom prompt
7. **Loading** - AI generates your itinerary
8. **Itinerary** - View, edit, export your day plan
9. **Map/Aerial View** - Visualize locations and routes

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project was built for Hack@Brown 2025 hackathon.

---

## Team

- Vishnu Bheem Reddy
- Anthony Chen
- Rohan Vittal
- Phillip Tran

---

<p align="center">
  <strong>OughtToSee</strong> - Because you ought to see what's happening around you
</p>

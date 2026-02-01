// API Configuration
// Change this URL to match your backend server
// - For iOS Simulator: use 'localhost'
// - For Android Emulator: use '10.0.2.2' (Android's localhost alias)
// - For physical device: use your machine's local IP address

export const API_BASE_URL = 'http://192.168.0.41:8080/api';

// Google Aerial View API
export const AERIAL_VIEW_API_URL = 'https://aerialview.googleapis.com/v1/videos:lookupVideo';

// Google Maps API Key - should be set in environment or config
// Make sure "Aerial View API" is enabled in Google Cloud Console
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

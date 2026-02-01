// API Configuration
// Change this URL to match your backend server
// - For iOS Simulator: use 'localhost'
// - For Android Emulator: use '10.0.2.2' (Android's localhost alias)
// - For physical device: use your machine's local IP address

import Constants from 'expo-constants';

export const API_BASE_URL = 'http://192.168.0.41:8080/api';

// Google Aerial View API
export const AERIAL_VIEW_API_URL = 'https://aerialview.googleapis.com/v1/videos:lookupVideo';

// Google Maps API Key from .env via app.config.js
export const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || '';

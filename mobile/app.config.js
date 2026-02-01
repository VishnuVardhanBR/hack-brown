import 'dotenv/config';

export default {
  expo: {
    name: "Metropolis",
    slug: "metropolis",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F9EAEC"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true
        }
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ""
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F9EAEC"
      },
      usesCleartextTraffic: true,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-asset",
      "expo-font"
    ],
    extra: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ""
    }
  }
};

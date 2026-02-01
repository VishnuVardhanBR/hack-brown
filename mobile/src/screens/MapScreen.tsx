import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Dimensions,
    Platform,
    ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

const { width, height } = Dimensions.get('window');

interface GeocodedEvent {
    title: string;
    location: string;
    lat: number | null;
    lng: number | null;
    start_time: string;
    end_time: string;
}

interface MapScreenProps {
    navigation: any;
    route: {
        params: {
            itineraryId: string;
            city: string;
        };
    };
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation, route }) => {
    const { itineraryId, city } = route.params;

    const mapRef = useRef<MapView>(null);
    const [events, setEvents] = useState<GeocodedEvent[]>([]);
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchGeocodedLocations();
    }, []);

    const fetchGeocodedLocations = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/geocode-itinerary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ itinerary_id: itineraryId }),
            });

            if (!response.ok) {
                throw new Error('Failed to geocode locations');
            }

            const data = await response.json();
            setEvents(data.events);
            setCenter(data.center);

            // Fetch actual route
            await fetchRoute();

            setLoading(false);

            // Fit map to show all markers after a short delay
            setTimeout(() => {
                fitMapToMarkers(data.events);
            }, 500);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const fetchRoute = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/get-route`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    itinerary_id: itineraryId,
                    mode: 'walking'
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // Convert route to react-native-maps format
                const coords = data.route.map((point: { lat: number; lng: number }) => ({
                    latitude: point.lat,
                    longitude: point.lng,
                }));
                setRouteCoordinates(coords);
            }
        } catch (err) {
            // Silently fail - we'll fall back to straight lines
            console.log('Route fetch failed, using straight lines');
        }
    };

    const fitMapToMarkers = (eventList: GeocodedEvent[]) => {
        const validCoords = eventList
            .filter(e => e.lat !== null && e.lng !== null)
            .map(e => ({
                latitude: e.lat!,
                longitude: e.lng!,
            }));

        if (validCoords.length > 0 && mapRef.current) {
            mapRef.current.fitToCoordinates(validCoords, {
                edgePadding: { top: 150, right: 50, bottom: 250, left: 50 },
                animated: true,
            });

            // After fitting, apply 3D tilt
            setTimeout(() => {
                applyTiltedCamera(validCoords);
            }, 1000);
        }
    };

    const applyTiltedCamera = (coords: { latitude: number; longitude: number }[]) => {
        if (!mapRef.current || coords.length === 0) return;

        // Calculate center of all coordinates
        const avgLat = coords.reduce((sum, c) => sum + c.latitude, 0) / coords.length;
        const avgLng = coords.reduce((sum, c) => sum + c.longitude, 0) / coords.length;

        mapRef.current.animateCamera(
            {
                center: {
                    latitude: avgLat,
                    longitude: avgLng,
                },
                pitch: 55, // Tilt angle for 3D effect
                heading: 0, // North-facing
                zoom: 14,
            },
            { duration: 1500 }
        );
    };

    const getPolylineCoordinates = () => {
        // Use actual route if available, otherwise fall back to straight lines
        if (routeCoordinates.length > 0) {
            return routeCoordinates;
        }
        return events
            .filter(e => e.lat !== null && e.lng !== null)
            .map(e => ({
                latitude: e.lat!,
                longitude: e.lng!,
            }));
    };

    const handleClose = () => {
        navigation.goBack();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading 3D map...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
                <Text style={styles.errorIcon}>🗺️</Text>
                <Text style={styles.errorTitle}>Map Error</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchGeocodedLocations}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                showsBuildings={true}
                showsIndoors={true}
                showsTraffic={false}
                showsCompass={true}
                rotateEnabled={true}
                pitchEnabled={true}
                initialRegion={center ? {
                    latitude: center.lat,
                    longitude: center.lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                } : undefined}
            >
                {/* Route Polyline - only render when we have valid coordinates */}
                {getPolylineCoordinates().length > 1 && (
                    <Polyline
                        coordinates={getPolylineCoordinates()}
                        strokeColor={colors.primary}
                        strokeWidth={4}
                    />
                )}

                {/* Markers for each stop */}
                {events.map((event, index) => {
                    if (event.lat === null || event.lng === null) return null;

                    return (
                        <Marker
                            key={index}
                            coordinate={{
                                latitude: event.lat,
                                longitude: event.lng,
                            }}
                            title={`${index + 1}. ${event.title}`}
                            description={`${event.start_time} - ${event.end_time}`}
                            pinColor={colors.primary}
                        />
                    );
                })}
            </MapView>

            {/* Header Overlay */}
            <View style={styles.headerOverlay}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{city} Route</Text>
                    <Text style={styles.headerSubtitle}>{events.length} stops</Text>
                </View>
                <TouchableOpacity style={styles.closeIconButton} onPress={handleClose}>
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {events.map((event, index) => {
                        if (event.lat === null) return null;
                        return (
                            <View key={index} style={[
                                styles.legendItem,
                                index === events.filter(e => e.lat !== null).length - 1 && styles.legendItemLast
                            ]}>
                                <View style={styles.legendNumber}>
                                    <Text style={styles.legendNumberText}>{index + 1}</Text>
                                </View>
                                <Text style={styles.legendTitle} numberOfLines={1}>
                                    {event.title}
                                </Text>
                                <Text style={styles.legendTime}>{event.start_time}</Text>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
        width: width,
        height: height,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorIcon: {
        fontSize: 60,
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    errorMessage: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginBottom: 16,
    },
    retryButtonText: {
        color: colors.textLight,
        fontSize: 16,
        fontWeight: '700',
    },
    closeButton: {
        paddingVertical: 10,
    },
    closeButtonText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.95)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    closeIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        fontSize: 18,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    legend: {
        position: 'absolute',
        bottom: 30,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 16,
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    legendItemLast: {
        borderBottomWidth: 0,
    },
    legendNumber: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    legendNumberText: {
        color: colors.textLight,
        fontSize: 12,
        fontWeight: '700',
    },
    legendTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    legendTime: {
        fontSize: 12,
        color: colors.textSecondary,
        marginLeft: 8,
    },
});

export default MapScreen;

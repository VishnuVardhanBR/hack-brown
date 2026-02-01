import React, { useRef, useEffect, useState, useCallback } from 'react';
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
    Animated,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

const { width, height } = Dimensions.get('window');

// Fly-through animation settings
const FLY_THROUGH_CONFIG = {
    initialOverviewDuration: 2000,
    transitionDuration: 2500,
    pauseAtLocation: 2000,
    finalOverviewDuration: 2000,
    overviewZoom: 13,
    locationZoom: 17,
    overviewPitch: 45,
    locationPitch: 65,
};

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

    // Fly-through state
    const [isFlyingThrough, setIsFlyingThrough] = useState(false);
    const [currentFlyThroughIndex, setCurrentFlyThroughIndex] = useState(-1);
    const [flyThroughComplete, setFlyThroughComplete] = useState(false);
    const flyThroughAbortRef = useRef(false);
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fetchGeocodedLocations();
        return () => {
            flyThroughAbortRef.current = true;
        };
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

            // Start fly-through animation after map loads
            setTimeout(() => {
                startFlyThrough(data.events);
            }, 1000);
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

    // Calculate bearing between two points for camera heading
    const calculateBearing = (
        from: { latitude: number; longitude: number },
        to: { latitude: number; longitude: number }
    ): number => {
        const startLat = (from.latitude * Math.PI) / 180;
        const startLng = (from.longitude * Math.PI) / 180;
        const destLat = (to.latitude * Math.PI) / 180;
        const destLng = (to.longitude * Math.PI) / 180;

        const y = Math.sin(destLng - startLng) * Math.cos(destLat);
        const x =
            Math.cos(startLat) * Math.sin(destLat) -
            Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);

        let bearing = (Math.atan2(y, x) * 180) / Math.PI;
        return (bearing + 360) % 360;
    };

    // Fly to a specific location with 3D camera
    const flyToLocation = useCallback(
        async (
            lat: number,
            lng: number,
            heading: number = 0,
            duration: number = FLY_THROUGH_CONFIG.transitionDuration
        ): Promise<void> => {
            return new Promise((resolve) => {
                if (!mapRef.current || flyThroughAbortRef.current) {
                    resolve();
                    return;
                }

                mapRef.current.animateCamera(
                    {
                        center: { latitude: lat, longitude: lng },
                        pitch: FLY_THROUGH_CONFIG.locationPitch,
                        heading: heading,
                        zoom: FLY_THROUGH_CONFIG.locationZoom,
                    },
                    { duration }
                );

                setTimeout(resolve, duration);
            });
        },
        []
    );

    // Show overview of all locations
    const showOverview = useCallback(
        async (
            coords: { latitude: number; longitude: number }[],
            duration: number = FLY_THROUGH_CONFIG.initialOverviewDuration
        ): Promise<void> => {
            return new Promise((resolve) => {
                if (!mapRef.current || coords.length === 0 || flyThroughAbortRef.current) {
                    resolve();
                    return;
                }

                const avgLat = coords.reduce((sum, c) => sum + c.latitude, 0) / coords.length;
                const avgLng = coords.reduce((sum, c) => sum + c.longitude, 0) / coords.length;

                mapRef.current.animateCamera(
                    {
                        center: { latitude: avgLat, longitude: avgLng },
                        pitch: FLY_THROUGH_CONFIG.overviewPitch,
                        heading: 0,
                        zoom: FLY_THROUGH_CONFIG.overviewZoom,
                    },
                    { duration }
                );

                setTimeout(resolve, duration);
            });
        },
        []
    );

    // Start the fly-through animation sequence
    const startFlyThrough = useCallback(
        async (eventList: GeocodedEvent[]) => {
            const validEvents = eventList.filter((e) => e.lat !== null && e.lng !== null);
            if (validEvents.length === 0) return;

            flyThroughAbortRef.current = false;
            setIsFlyingThrough(true);
            setFlyThroughComplete(false);
            setCurrentFlyThroughIndex(-1);
            progressAnim.setValue(0);

            const coords = validEvents.map((e) => ({
                latitude: e.lat!,
                longitude: e.lng!,
            }));

            // Step 1: Show overview
            await showOverview(coords);
            if (flyThroughAbortRef.current) return;

            // Step 2: Fly to each location
            for (let i = 0; i < validEvents.length; i++) {
                if (flyThroughAbortRef.current) break;

                setCurrentFlyThroughIndex(i);

                // Animate progress bar
                Animated.timing(progressAnim, {
                    toValue: (i + 1) / validEvents.length,
                    duration: FLY_THROUGH_CONFIG.transitionDuration,
                    useNativeDriver: false,
                }).start();

                const event = validEvents[i];
                const nextEvent = validEvents[i + 1];

                // Calculate heading towards next location (or keep north for last)
                let heading = 0;
                if (nextEvent && nextEvent.lat && nextEvent.lng) {
                    heading = calculateBearing(
                        { latitude: event.lat!, longitude: event.lng! },
                        { latitude: nextEvent.lat, longitude: nextEvent.lng }
                    );
                }

                await flyToLocation(event.lat!, event.lng!, heading);
                if (flyThroughAbortRef.current) break;

                // Pause at location
                await new Promise((resolve) =>
                    setTimeout(resolve, FLY_THROUGH_CONFIG.pauseAtLocation)
                );
            }

            if (!flyThroughAbortRef.current) {
                // Step 3: Return to overview
                await showOverview(coords, FLY_THROUGH_CONFIG.finalOverviewDuration);
            }

            setIsFlyingThrough(false);
            setFlyThroughComplete(true);
            setCurrentFlyThroughIndex(-1);
        },
        [flyToLocation, showOverview, progressAnim]
    );

    // Replay the fly-through
    const replayFlyThrough = () => {
        startFlyThrough(events);
    };

    // Skip/stop fly-through
    const skipFlyThrough = () => {
        flyThroughAbortRef.current = true;
        setIsFlyingThrough(false);
        setFlyThroughComplete(true);
        setCurrentFlyThroughIndex(-1);

        // Show final overview
        const validCoords = events
            .filter((e) => e.lat !== null && e.lng !== null)
            .map((e) => ({ latitude: e.lat!, longitude: e.lng! }));
        showOverview(validCoords);
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
                <Text style={styles.loadingText}>Preparing 3D tour...</Text>
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

    const validEventsCount = events.filter((e) => e.lat !== null).length;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                mapType="standard"
                showsBuildings={true}
                showsIndoors={true}
                showsTraffic={false}
                showsCompass={true}
                rotateEnabled={true}
                pitchEnabled={true}
                scrollEnabled={!isFlyingThrough}
                zoomEnabled={!isFlyingThrough}
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

                {/* Markers for each stop with custom styling */}
                {events.map((event, index) => {
                    if (event.lat === null || event.lng === null) return null;
                    const isCurrentStop = currentFlyThroughIndex === index;

                    return (
                        <Marker
                            key={index}
                            coordinate={{
                                latitude: event.lat,
                                longitude: event.lng,
                            }}
                            title={`${index + 1}. ${event.title}`}
                            description={`${event.start_time} - ${event.end_time}`}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View style={[
                                styles.customMarker,
                                isCurrentStop && styles.customMarkerActive
                            ]}>
                                <Text style={[
                                    styles.customMarkerText,
                                    isCurrentStop && styles.customMarkerTextActive
                                ]}>
                                    {index + 1}
                                </Text>
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {/* Header Overlay */}
            <View style={styles.headerOverlay}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{city} Tour</Text>
                    <Text style={styles.headerSubtitle}>
                        {isFlyingThrough
                            ? `Flying to stop ${currentFlyThroughIndex + 1} of ${validEventsCount}`
                            : `${validEventsCount} stops`}
                    </Text>
                </View>
                <TouchableOpacity style={styles.closeIconButton} onPress={handleClose}>
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Fly-through Progress Indicator */}
            {isFlyingThrough && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                        <Animated.View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                    </View>
                    <TouchableOpacity style={styles.skipButton} onPress={skipFlyThrough}>
                        <Text style={styles.skipButtonText}>Skip Tour</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Replay Button - shown after fly-through completes */}
            {flyThroughComplete && !isFlyingThrough && (
                <TouchableOpacity style={styles.replayButton} onPress={replayFlyThrough}>
                    <Text style={styles.replayButtonIcon}>▶</Text>
                    <Text style={styles.replayButtonText}>Replay Tour</Text>
                </TouchableOpacity>
            )}

            {/* Legend - hide during fly-through for immersive experience */}
            {!isFlyingThrough && (
                <View style={styles.legend}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {events.map((event, index) => {
                            if (event.lat === null) return null;
                            return (
                                <View key={index} style={[
                                    styles.legendItem,
                                    index === validEventsCount - 1 && styles.legendItemLast
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
            )}

            {/* Current Location Card - shown during fly-through */}
            {isFlyingThrough && currentFlyThroughIndex >= 0 && currentFlyThroughIndex < events.length && (
                <View style={styles.currentLocationCard}>
                    <View style={styles.currentLocationNumber}>
                        <Text style={styles.currentLocationNumberText}>
                            {currentFlyThroughIndex + 1}
                        </Text>
                    </View>
                    <View style={styles.currentLocationContent}>
                        <Text style={styles.currentLocationTitle} numberOfLines={1}>
                            {events[currentFlyThroughIndex].title}
                        </Text>
                        <Text style={styles.currentLocationTime}>
                            {events[currentFlyThroughIndex].start_time} - {events[currentFlyThroughIndex].end_time}
                        </Text>
                    </View>
                </View>
            )}
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
    // Custom marker styles
    customMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    customMarkerActive: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FF6B6B',
        borderWidth: 4,
        transform: [{ scale: 1.1 }],
    },
    customMarkerText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    customMarkerTextActive: {
        fontSize: 18,
    },
    // Progress indicator styles
    progressContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 100,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBarBackground: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    skipButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    skipButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    // Replay button styles
    replayButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 100,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        gap: 8,
    },
    replayButtonIcon: {
        color: '#fff',
        fontSize: 14,
    },
    replayButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    // Current location card during fly-through
    currentLocationCard: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    currentLocationNumber: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    currentLocationNumberText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    currentLocationContent: {
        flex: 1,
    },
    currentLocationTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    currentLocationTime: {
        fontSize: 14,
        color: colors.textSecondary,
    },
});

export default MapScreen;

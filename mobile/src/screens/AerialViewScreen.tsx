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
    FlatList,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../theme/colors';
import { API_BASE_URL, AERIAL_VIEW_API_URL, GOOGLE_MAPS_API_KEY } from '../config/api';

const { width, height } = Dimensions.get('window');

interface GeocodedEvent {
    title: string;
    location: string;
    lat: number | null;
    lng: number | null;
    start_time: string;
    end_time: string;
}

interface AerialVideoData {
    landscapeUri: string | null;
    portraitUri: string | null;
    state: 'ACTIVE' | 'PROCESSING' | 'NOT_FOUND';
    videoId?: string;
}

interface AerialViewScreenProps {
    navigation: any;
    route: {
        params: {
            itineraryId: string;
            city: string;
        };
    };
}

export const AerialViewScreen: React.FC<AerialViewScreenProps> = ({ navigation, route }) => {
    const { itineraryId, city } = route.params;

    const flatListRef = useRef<FlatList>(null);
    const miniMapRef = useRef<MapView>(null);
    const videoRefs = useRef<{ [key: number]: Video | null }>({});

    const [events, setEvents] = useState<GeocodedEvent[]>([]);
    const [aerialVideos, setAerialVideos] = useState<{ [key: number]: AerialVideoData }>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [videoLoading, setVideoLoading] = useState<{ [key: number]: boolean }>({});
    const [cityCenter, setCityCenter] = useState<{ lat: number; lng: number } | null>(null);
    useEffect(() => {
        fetchGeocodedLocations();
    }, []);

    // Update mini-map when current index changes
    useEffect(() => {
        if (events.length > 0 && events[currentIndex]?.lat && events[currentIndex]?.lng) {
            miniMapRef.current?.animateToRegion({
                latitude: events[currentIndex].lat!,
                longitude: events[currentIndex].lng!,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 500);
        }
    }, [currentIndex, events]);

    const fetchGeocodedLocations = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/geocode-itinerary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itinerary_id: itineraryId }),
            });

            if (!response.ok) throw new Error('Failed to geocode locations');

            const data = await response.json();
            setEvents(data.events);
            if (data.center) {
                setCityCenter(data.center);
            }
            setLoading(false);

            // Fetch aerial videos for each location
            fetchAerialVideos(data.events);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const fetchAerialVideos = async (eventList: GeocodedEvent[]) => {
        const videos: { [key: number]: AerialVideoData } = {};

        for (let i = 0; i < eventList.length; i++) {
            const event = eventList[i];
            if (!event.location) {
                videos[i] = { landscapeUri: null, portraitUri: null, state: 'NOT_FOUND' };
                continue;
            }

            setVideoLoading(prev => ({ ...prev, [i]: true }));

            try {
                const encodedAddress = encodeURIComponent(event.location);
                const response = await fetch(
                    `${AERIAL_VIEW_API_URL}?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`
                );

                if (response.status === 404) {
                    videos[i] = { landscapeUri: null, portraitUri: null, state: 'NOT_FOUND' };
                } else if (response.ok) {
                    const data = await response.json();

                    if (data.state === 'ACTIVE' && data.uris) {
                        const mp4High = data.uris['MP4_HIGH'] || data.uris['MP4_MEDIUM'] || data.uris['MP4_LOW'];
                        videos[i] = {
                            landscapeUri: mp4High?.landscapeUri || null,
                            portraitUri: mp4High?.portraitUri || null,
                            state: 'ACTIVE',
                            videoId: data.metadata?.videoId,
                        };
                    } else if (data.state === 'PROCESSING') {
                        videos[i] = {
                            landscapeUri: null,
                            portraitUri: null,
                            state: 'PROCESSING',
                            videoId: data.metadata?.videoId,
                        };
                    } else {
                        videos[i] = { landscapeUri: null, portraitUri: null, state: 'NOT_FOUND' };
                    }
                } else {
                    videos[i] = { landscapeUri: null, portraitUri: null, state: 'NOT_FOUND' };
                }
            } catch (err) {
                console.log(`Failed to fetch aerial video for ${event.location}:`, err);
                videos[i] = { landscapeUri: null, portraitUri: null, state: 'NOT_FOUND' };
            }

            setVideoLoading(prev => ({ ...prev, [i]: false }));
            setAerialVideos(prev => ({ ...prev, [i]: videos[i] }));
        }
    };

    const handleClose = () => navigation.goBack();

    const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
            setCurrentIndex(newIndex);

            // Pause all videos except the current one
            Object.keys(videoRefs.current).forEach(key => {
                const idx = parseInt(key);
                if (idx !== newIndex && videoRefs.current[idx]) {
                    videoRefs.current[idx]?.pauseAsync();
                }
            });

            // Play current video
            if (videoRefs.current[newIndex]) {
                videoRefs.current[newIndex]?.playAsync();
            }
        }
    }, []);

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    // Generate HTML for 3D Maps JS WebView
    const get3DMapHtml = (lat: number, lng: number, title: string) => {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        gmp-map-3d { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <gmp-map-3d
        id="map3d"
        center="${lat},${lng},200"
        tilt="67"
        heading="0"
        range="800"
        mode="HYBRID">
    </gmp-map-3d>

    <script>
        (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})
        ({key: "${GOOGLE_MAPS_API_KEY}", v: "beta", libraries: "maps3d"});

        async function init() {
            await google.maps.importLibrary('maps3d');
            const map3d = document.getElementById('map3d');
            
            // Wait for map to be ready
            setTimeout(() => {
                if (map3d && map3d.flyCameraAround) {
                    map3d.flyCameraAround({
                        camera: {
                            center: { lat: ${lat}, lng: ${lng}, altitude: 100 },
                            range: 600,
                            tilt: 65,
                            heading: 0
                        },
                        durationMillis: 20000,
                        rounds: 1
                    });
                }
            }, 2000);
        }
        
        init();
    </script>
</body>
</html>`;
    };

    const renderVideoItem = ({ item, index }: { item: GeocodedEvent; index: number }) => {
        const video = aerialVideos[index];
        const isLoading = videoLoading[index];
        const videoUri = video?.portraitUri || video?.landscapeUri;
        const isCurrentSlide = index === currentIndex;
        
        // Use item coordinates, or fall back to city center
        const lat = item.lat ?? cityCenter?.lat;
        const lng = item.lng ?? cityCenter?.lng;

        return (
            <View style={styles.videoContainer}>
                {isLoading ? (
                    <View style={styles.placeholderContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.placeholderText}>Loading aerial view...</Text>
                    </View>
                ) : videoUri ? (
                    <Video
                        ref={(ref) => { videoRefs.current[index] = ref; }}
                        source={{ uri: videoUri }}
                        style={styles.video}
                        resizeMode={ResizeMode.COVER}
                        isLooping
                        shouldPlay={isCurrentSlide}
                        isMuted={false}
                        volume={0.5}
                    />
                ) : lat && lng ? (
                    <WebView
                        style={styles.webview}
                        source={{ html: get3DMapHtml(lat, lng, item.title) }}
                        scrollEnabled={false}
                        bounces={false}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={styles.webviewLoading}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={styles.placeholderText}>Loading 3D view...</Text>
                            </View>
                        )}
                    />
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Text style={styles.noVideoIcon}>📍</Text>
                        <Text style={styles.noVideoText}>Location not available</Text>
                    </View>
                )}

                {/* Location Info Overlay */}
                <View style={styles.locationOverlay}>
                    <View style={styles.stopBadge}>
                        <Text style={styles.stopBadgeText}>{index + 1}</Text>
                    </View>
                    <View style={styles.locationInfo}>
                        <Text style={styles.locationTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.locationTime}>
                            {item.start_time} - {item.end_time}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const validEvents = events.filter(e => e.lat !== null && e.lng !== null);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Preparing aerial tour...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
                <Text style={styles.errorIcon}>🛰️</Text>
                <Text style={styles.errorTitle}>Error</Text>
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
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Video Carousel */}
            <FlatList
                ref={flatListRef}
                data={events}
                renderItem={renderVideoItem}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(_, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
            />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{city}</Text>
                    <Text style={styles.headerSubtitle}>Aerial Tour</Text>
                </View>
                <TouchableOpacity style={styles.closeIconButton} onPress={handleClose}>
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Progress Dots */}
            <View style={styles.progressDotsContainer}>
                {events.map((_, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => {
                            flatListRef.current?.scrollToIndex({ index, animated: true });
                        }}
                    >
                        <View
                            style={[
                                styles.progressDot,
                                index === currentIndex && styles.progressDotActive,
                            ]}
                        />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Mini Map */}
            <View style={styles.miniMapContainer}>
                <MapView
                    ref={miniMapRef}
                    style={styles.miniMap}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                    mapType="satellite"
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    initialRegion={
                        validEvents.length > 0 && validEvents[0].lat && validEvents[0].lng
                            ? {
                                latitude: validEvents[0].lat,
                                longitude: validEvents[0].lng,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }
                            : undefined
                    }
                >
                    {/* Route Polyline */}
                    {validEvents.length > 1 && (
                        <Polyline
                            coordinates={validEvents.map(e => ({
                                latitude: e.lat!,
                                longitude: e.lng!,
                            }))}
                            strokeColor={colors.primary}
                            strokeWidth={2}
                        />
                    )}

                    {/* Markers */}
                    {validEvents.map((event, index) => (
                        <Marker
                            key={index}
                            coordinate={{
                                latitude: event.lat!,
                                longitude: event.lng!,
                            }}
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View
                                style={[
                                    styles.miniMapMarker,
                                    index === currentIndex && styles.miniMapMarkerActive,
                                ]}
                            >
                                <Text style={styles.miniMapMarkerText}>{index + 1}</Text>
                            </View>
                        </Marker>
                    ))}
                </MapView>
            </View>

            {/* Navigation Hint */}
            <View style={styles.navigationHint}>
                <Text style={styles.navigationHintText}>← Swipe to explore →</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#fff',
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
    videoContainer: {
        width: width,
        height: height,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    webview: {
        flex: 1,
        backgroundColor: '#000',
    },
    webviewLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    placeholderText: {
        marginTop: 16,
        fontSize: 16,
        color: '#888',
    },
    noVideoIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    noVideoText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    noVideoSubtext: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
    },
    locationOverlay: {
        position: 'absolute',
        bottom: 140,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 16,
        padding: 16,
    },
    stopBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    stopBadgeText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
    },
    locationInfo: {
        flex: 1,
    },
    locationTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    locationTime: {
        fontSize: 14,
        color: '#ccc',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    closeIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        fontSize: 20,
        color: '#fff',
        fontWeight: '600',
    },
    progressDotsContainer: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    progressDotActive: {
        width: 24,
        backgroundColor: colors.primary,
    },
    miniMapContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 100,
        right: 16,
        width: 100,
        height: 100,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    miniMap: {
        width: '100%',
        height: '100%',
    },
    miniMapMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
    },
    miniMapMarkerActive: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.primary,
        borderColor: '#fff',
    },
    miniMapMarkerText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
    },
    navigationHint: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    navigationHintText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
});

export default AerialViewScreen;

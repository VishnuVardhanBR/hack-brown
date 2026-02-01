import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    StatusBar,
    Animated,
    TouchableOpacity,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

const { width, height } = Dimensions.get('window');

// Video assets for city backgrounds
const videos: { [key: string]: any } = {
    'San Francisco': require('../assets/sf.mp4'),
    'New York': require('../assets/nyc.mp4'),
    'Providence': require('../assets/providence.mp4'),
};

interface LoadingScreenProps {
    navigation: any;
    route: any;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ navigation, route }) => {
    const { city, budget, date, preferences, isRecalculating } = route.params || {};
    const videoRef = useRef<Video>(null);
    const [isReversing, setIsReversing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const textFadeAnim = useRef(new Animated.Value(0)).current;

    // Get city name from city object or string
    const getCityName = () => {
        if (!city) return 'San Francisco';
        if (typeof city === 'object' && city.name) return city.name;
        if (typeof city === 'string') return city.split(',')[0].trim();
        return 'San Francisco';
    };

    const getCityState = () => {
        if (!city) return 'CA';
        if (typeof city === 'object' && city.state) return city.state;
        return '';
    };

    const cityName = getCityName();
    const cityState = getCityState();
    const videoSource = videos[cityName] || null;

    useEffect(() => {
        // Fade in the screen
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start(() => {
            // Then fade in text
            Animated.timing(textFadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        });

        // Only call generateItinerary for new itineraries, not recalculations
        // Recalculation is handled by ItineraryScreen which navigates here just for the loading UI
        if (!isRecalculating) {
            generateItinerary();
        }
    }, []);

    const generateItinerary = async () => {
        setError(null);
        setIsLoading(true);

        try {
            // Wrap single date in array for API compatibility
            const datesArray = date ? [date] : [new Date().toISOString().split('T')[0]];

            const response = await fetch(`${API_BASE_URL}/generate-itinerary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    city: cityName,
                    state: cityState,
                    dates: datesArray,
                    budget: formatBudget(budget),
                    preferences: preferences || '',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to generate itinerary');
            }

            const data = await response.json();

            navigation.replace('Itinerary', {
                itinerary: data.events,
                itineraryId: data.itinerary_id,
                totalCost: data.total_cost,
                city: cityName,
                dates: datesArray,
                summary: data.summary,
            });
        } catch (err: any) {
            console.error('API Error:', err);
            setIsLoading(false);
            setError(err.message || 'Something went wrong. Please try again.');
        }
    };

    const formatBudget = (budget: number): string => {
        if (!budget || budget === 0) return '$0';
        if (budget <= 50) return '$1-$50';
        if (budget <= 150) return '$50-$150';
        if (budget <= 300) return '$150-$300';
        if (budget <= 500) return '$300-$500';
        return '$500+';
    };

    const handleRetry = () => {
        generateItinerary();
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
        if (!status.isLoaded || !videoRef.current) return;

        const { positionMillis, durationMillis, didJustFinish } = status;

        // When video reaches the end, start reversing
        if (didJustFinish && !isReversing) {
            setIsReversing(true);
            await videoRef.current.setPositionAsync(durationMillis! - 100);
        }

        // Handle reverse playback by seeking backwards
        if (isReversing && positionMillis !== undefined) {
            if (positionMillis <= 100) {
                // Reached the beginning, switch to forward
                setIsReversing(false);
                await videoRef.current.setPositionAsync(0);
                await videoRef.current.playAsync();
            } else {
                // Continue reversing by seeking backwards
                const newPosition = Math.max(0, positionMillis - 50);
                await videoRef.current.setPositionAsync(newPosition);
            }
        }
    };

    // Check if error is "no events found" type
    const isNoEventsError = error?.toLowerCase().includes('no events found');

    // Error state
    if (error) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

                {/* Video Background */}
                {videoSource && (
                    <Video
                        ref={videoRef}
                        source={videoSource}
                        style={styles.video}
                        resizeMode={ResizeMode.COVER}
                        isLooping
                        shouldPlay
                        isMuted
                        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    />
                )}

                {/* Purple Overlay */}
                <View style={styles.overlay} />

                {/* Error Content */}
                <View style={styles.errorContent}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorIcon}>{isNoEventsError ? '🔍' : '😕'}</Text>
                        <Text style={styles.errorTitle}>
                            {isNoEventsError ? 'No Events Found' : 'Oops!'}
                        </Text>
                        <Text style={styles.errorMessage}>
                            {isNoEventsError
                                ? `We couldn't find events in ${cityName} matching your criteria.`
                                : error}
                        </Text>
                        
                        {isNoEventsError && (
                            <View style={styles.suggestionsContainer}>
                                <Text style={styles.suggestionsTitle}>Try:</Text>
                                <Text style={styles.suggestionItem}>• Different dates</Text>
                                <Text style={styles.suggestionItem}>• A higher budget</Text>
                                <Text style={styles.suggestionItem}>• Fewer preferences</Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                            <Text style={styles.backButtonText}>
                                {isNoEventsError ? 'Adjust Criteria' : 'Go Back'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Video Background */}
            {videoSource && (
                <Video
                    ref={videoRef}
                    source={videoSource}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    shouldPlay
                    isMuted
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                />
            )}

            {/* Purple Overlay */}
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />

            {/* Content */}
            <Animated.View style={[styles.content, { opacity: textFadeAnim }]}>
                {/* Loading Message */}
                <View style={styles.messageContainer}>
                    <Text style={styles.loadingTitle}>
                        Planning your perfect
                    </Text>
                    <Text style={styles.cityName}>{cityName}</Text>
                    <Text style={styles.loadingTitle}>
                        adventure
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    video: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: width,
        height: height,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(89, 55, 122, 0.6)', // Deep purple tint (#59377A)
    },
    content: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 60,
    },
    errorContent: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 60,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    logoPlaceholder: {
        paddingHorizontal: 30,
        paddingVertical: 8,
        borderWidth: 2,
        borderColor: colors.textLight,
        borderRadius: 20,
    },
    logoText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textLight,
        letterSpacing: 2,
    },
    messageContainer: {
        alignItems: 'center',
        marginTop: 80,
        paddingHorizontal: 24,
    },
    loadingTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textLight,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    cityName: {
        fontSize: 42,
        fontWeight: '900',
        color: colors.primaryAccent,
        textAlign: 'center',
        marginVertical: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorIcon: {
        fontSize: 60,
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textLight,
        marginBottom: 10,
    },
    errorMessage: {
        fontSize: 16,
        color: colors.textLight,
        textAlign: 'center',
        marginBottom: 30,
        opacity: 0.8,
    },
    retryButton: {
        backgroundColor: colors.textLight,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 25,
        marginBottom: 16,
    },
    retryButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '700',
    },
    backButton: {
        paddingVertical: 10,
    },
    backButtonText: {
        color: colors.textLight,
        fontSize: 16,
        opacity: 0.8,
    },
    suggestionsContainer: {
        marginBottom: 24,
        alignItems: 'center',
    },
    suggestionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textLight,
        marginBottom: 8,
    },
    suggestionItem: {
        fontSize: 15,
        color: colors.textLight,
        opacity: 0.8,
        marginVertical: 2,
    },
});

export default LoadingScreen;

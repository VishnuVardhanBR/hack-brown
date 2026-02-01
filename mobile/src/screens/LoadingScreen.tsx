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

// Import video assets
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
    const { city, budget, dates, preferences } = route.params || {};
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
    const videoSource = videos[cityName] || videos['San Francisco'];

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

        // Call API to generate itinerary
        generateItinerary();
    }, []);

    const generateItinerary = async () => {
        setError(null);
        setIsLoading(true);

        try {
            // Get the first date from dates array, or use today
            const date = dates && dates.length > 0 ? dates[0] : new Date().toISOString().split('T')[0];

            const response = await fetch(`${API_BASE_URL}/generate-itinerary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    city: cityName,
                    state: cityState,
                    date: date,
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
                date: date,
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
        if (budget <= 20) return '$1-$20';
        if (budget <= 50) return '$20-$50';
        return '$50+';
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

    // Error state
    if (error) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

                {/* Video Background */}
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

                {/* Purple Overlay */}
                <View style={styles.overlay} />

                {/* Error Content */}
                <View style={styles.errorContent}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoPlaceholder}>
                            <Text style={styles.logoText}>LOGO</Text>
                        </View>
                    </View>

                    <View style={styles.errorContainer}>
                        <Text style={styles.errorIcon}>😕</Text>
                        <Text style={styles.errorTitle}>Oops!</Text>
                        <Text style={styles.errorMessage}>{error}</Text>

                        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                            <Text style={styles.backButtonText}>Go Back</Text>
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

            {/* Purple Overlay */}
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />

            {/* Content */}
            <Animated.View style={[styles.content, { opacity: textFadeAnim }]}>
                {/* Logo at top */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>LOGO</Text>
                    </View>
                </View>

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
});

export default LoadingScreen;

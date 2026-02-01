import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    StatusBar,
    Image,
    TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

const { width, height } = Dimensions.get('window');
const skylineImage = require('../assets/skyline.png');

interface LoadingScreenProps {
    navigation: any;
    route: any;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ navigation, route }) => {
    const { city, budget, date, preferences } = route.params;

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const dotAnim1 = useRef(new Animated.Value(0)).current;
    const dotAnim2 = useRef(new Animated.Value(0)).current;
    const dotAnim3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Dot animations
        const animateDots = () => {
            Animated.loop(
                Animated.stagger(200, [
                    Animated.sequence([
                        Animated.timing(dotAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(dotAnim1, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ]),
                    Animated.sequence([
                        Animated.timing(dotAnim2, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(dotAnim2, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ]),
                    Animated.sequence([
                        Animated.timing(dotAnim3, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(dotAnim3, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ]),
                ])
            ).start();
        };
        animateDots();

        // Call API
        generateItinerary();
    }, []);

    const generateItinerary = async () => {
        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/generate-itinerary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    city: city.name,
                    state: city.state,
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
                city: city.name,
                date: date,
                summary: data.summary,
            });
        } catch (err: any) {
            console.error('API Error:', err);
            setIsLoading(false);
            setError(err.message || 'Something went wrong. Please try again.');
        }
    };

    const handleRetry = () => {
        generateItinerary();
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    const formatBudget = (budget: number): string => {
        if (budget === 0) return '$0';
        if (budget <= 20) return '$1-$20';
        if (budget <= 50) return '$20-$50';
        return '$50+';
    };

    if (error) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

                <View style={styles.logoContainer}>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>LOGO</Text>
                    </View>
                </View>

                <View style={styles.loadingContent}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.iconText}>😕</Text>
                    </View>

                    <Text style={styles.loadingTitle}>Oops!</Text>
                    <Text style={styles.errorMessage}>{error}</Text>

                    <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.8}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.skylineContainer}>
                    <Image source={skylineImage} style={styles.skylineImage} resizeMode="cover" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

            {/* Logo at top */}
            <View style={styles.logoContainer}>
                <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>LOGO</Text>
                </View>
            </View>

            {/* Loading Content */}
            <View style={styles.loadingContent}>
                <Animated.View
                    style={[
                        styles.iconContainer,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    <Text style={styles.iconText}>🗓️</Text>
                </Animated.View>

                <Text style={styles.loadingTitle}>Building Your Itinerary</Text>
                <Text style={styles.loadingSubtitle}>
                    Finding the best events in {city.name}...
                </Text>

                {/* Loading Dots */}
                <View style={styles.dotsContainer}>
                    <Animated.View
                        style={[
                            styles.dot,
                            { opacity: dotAnim1, transform: [{ translateY: dotAnim1.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -10],
                            })}]},
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.dot,
                            { opacity: dotAnim2, transform: [{ translateY: dotAnim2.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -10],
                            })}]},
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.dot,
                            { opacity: dotAnim3, transform: [{ translateY: dotAnim3.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -10],
                            })}]},
                        ]}
                    />
                </View>

                {/* Info Cards */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>{date}</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Budget</Text>
                        <Text style={styles.infoValue}>${budget}</Text>
                    </View>
                </View>
            </View>

            {/* City Skyline Background */}
            <View style={styles.skylineContainer}>
                <Image
                    source={skylineImage}
                    style={styles.skylineImage}
                    resizeMode="cover"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    logoPlaceholder: {
        paddingHorizontal: 30,
        paddingVertical: 8,
        borderWidth: 2,
        borderColor: colors.textPrimary,
        borderRadius: 20,
    },
    logoText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        letterSpacing: 2,
    },
    loadingContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        marginTop: -80,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.cardBackground,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 30,
    },
    iconText: {
        fontSize: 50,
    },
    loadingTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
    },
    loadingSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 30,
        marginBottom: 40,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
        marginHorizontal: 6,
    },
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    infoCard: {
        backgroundColor: colors.cardBackground,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    skylineContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.35,
        overflow: 'hidden',
    },
    skylineImage: {
        width: width,
        height: '100%',
    },
    errorMessage: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    retryButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textLight,
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
    },
});

export default LoadingScreen;

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    StatusBar,
    Animated,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { colors } from '../theme/colors';

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
    const { city } = route.params || {};
    const videoRef = useRef<Video>(null);
    const [isReversing, setIsReversing] = useState(false);

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

    const cityName = getCityName();
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
    }, []);

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
});

export default LoadingScreen;

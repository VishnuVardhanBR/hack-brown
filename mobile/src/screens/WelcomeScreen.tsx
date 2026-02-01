import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Image,
    Dimensions,
    StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// Import the skyline image
const skylineImage = require('../assets/skyline.png');

interface WelcomeScreenProps {
    navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const welcomeTranslateY = useRef(new Animated.Value(-30)).current;
    const descriptionFadeAnim = useRef(new Animated.Value(0)).current;
    const buttonFadeAnim = useRef(new Animated.Value(0)).current;
    const buttonTranslateY = useRef(new Animated.Value(20)).current;
    const skylineSlideX = useRef(new Animated.Value(100)).current;

    useEffect(() => {
        // Sequence of animations
        Animated.sequence([
            // 1. Fade in and slide down Welcome text
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(welcomeTranslateY, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
            // 2. Fade in description
            Animated.timing(descriptionFadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            // 3. Fade in and slide up button
            Animated.parallel([
                Animated.timing(buttonFadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(buttonTranslateY, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // Slide skyline from right
        Animated.timing(skylineSlideX, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
        }).start();


    }, []);



    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

            {/* App name at top */}
            <View style={styles.logoContainer}>
                <Text style={styles.appName}>OughtToSee</Text>
            </View>

            {/* Welcome Text with fade down animation */}
            <Animated.View
                style={[
                    styles.welcomeContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: welcomeTranslateY }],
                    },
                ]}
            >
                <Text style={styles.welcomeText}>Welcome.</Text>
            </Animated.View>

            {/* App Description */}
            <Animated.View
                style={[
                    styles.descriptionContainer,
                    { opacity: descriptionFadeAnim },
                ]}
            >
                <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>
                        Discover amazing events in your city and let our AI build the perfect
                        itinerary for your adventure. Personalized. Optimized. Unforgettable.
                    </Text>
                </View>
            </Animated.View>

            {/* City Skyline Background - slides in from right */}
            <Animated.View
                style={[
                    styles.skylineContainer,
                    { transform: [{ translateX: skylineSlideX }] },
                ]}
            >
                <Image
                    source={skylineImage}
                    style={styles.skylineImage}
                    resizeMode="cover"
                />
            </Animated.View>



            {/* Plan Button */}
            <Animated.View
                style={[
                    styles.buttonContainer,
                    {
                        opacity: buttonFadeAnim,
                        transform: [{ translateY: buttonTranslateY }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.planButton}
                    onPress={() => navigation?.navigate('CitySelection')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.planButtonText}>Plan</Text>
                </TouchableOpacity>
            </Animated.View>
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
    appName: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 1,
    },
    welcomeContainer: {
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        marginTop: 60,
    },
    welcomeText: {
        fontSize: 52,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -1,
        // Note: For H@B font, you would load a custom font here
        // fontFamily: 'HackAtBrown-Bold',
    },
    descriptionContainer: {
        paddingHorizontal: 24,
        marginTop: 30,
    },
    descriptionBox: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 20,
        borderWidth: 2,
        borderColor: colors.textPrimary,
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    descriptionText: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
        textAlign: 'left',
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

    buttonContainer: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 15,
    },
    planButton: {
        backgroundColor: colors.cardBackground,
        paddingVertical: 14,
        paddingHorizontal: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: colors.textPrimary,
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    planButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
});

export default WelcomeScreen;

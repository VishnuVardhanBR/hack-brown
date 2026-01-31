import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    StatusBar,
    Animated,
    PanResponder,
} from 'react-native';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// Import the skyline image
const skylineImage = require('../assets/skyline.png');

interface BudgetScreenProps {
    navigation: any;
    route: any;
}

const MIN_BUDGET = 0;
const MAX_BUDGET = 1000;
const SLIDER_WIDTH = width - 80; // Account for padding

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ navigation, route }) => {
    const { city } = route.params;
    const [budget, setBudget] = useState<number>(100);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(-30)).current;
    const sliderFadeAnim = useRef(new Animated.Value(0)).current;
    const buttonFadeAnim = useRef(new Animated.Value(0)).current;

    // Slider position (animated)
    const sliderPosition = useRef(new Animated.Value((100 / MAX_BUDGET) * SLIDER_WIDTH)).current;

    useEffect(() => {
        Animated.sequence([
            // 1. Fade in and slide down title
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(titleTranslateY, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
            // 2. Fade in slider
            Animated.timing(sliderFadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            // 3. Fade in button
            Animated.timing(buttonFadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Pan responder for slider
    const STEP = 25; // $25 increments
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                const newPosition = Math.max(0, Math.min(SLIDER_WIDTH, gestureState.moveX - 40));
                const rawBudget = (newPosition / SLIDER_WIDTH) * MAX_BUDGET;
                const snappedBudget = Math.round(rawBudget / STEP) * STEP;
                const snappedPosition = (snappedBudget / MAX_BUDGET) * SLIDER_WIDTH;
                sliderPosition.setValue(snappedPosition);
                setBudget(snappedBudget);
            },
            onPanResponderRelease: (_, gestureState) => {
                const newPosition = Math.max(0, Math.min(SLIDER_WIDTH, gestureState.moveX - 40));
                const rawBudget = (newPosition / SLIDER_WIDTH) * MAX_BUDGET;
                const snappedBudget = Math.round(rawBudget / STEP) * STEP;
                const snappedPosition = (snappedBudget / MAX_BUDGET) * SLIDER_WIDTH;
                sliderPosition.setValue(snappedPosition);
                setBudget(snappedBudget);
            },
        })
    ).current;

    const handleNext = () => {
        navigation.navigate('DatePicker', { city, budget });
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const formatBudget = (value: number): string => {
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}k`;
        }
        return `$${value}`;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            {/* Logo at top */}
            <View style={styles.logoContainer}>
                <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>LOGO</Text>
                </View>
            </View>

            {/* Title */}
            <Animated.View
                style={[
                    styles.titleContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: titleTranslateY }],
                    },
                ]}
            >
                <Text style={styles.titleText}>Choose a Budget.</Text>
            </Animated.View>

            {/* Budget Display */}
            <Animated.View style={[styles.budgetDisplayContainer, { opacity: sliderFadeAnim }]}>
                <Text style={styles.budgetAmount}>{formatBudget(budget)}</Text>
            </Animated.View>

            {/* Slider */}
            <Animated.View style={[styles.sliderContainer, { opacity: sliderFadeAnim }]}>
                <Text style={styles.dragHint}>drag</Text>

                <View style={styles.sliderTrack}>
                    <Animated.View
                        style={[
                            styles.sliderFill,
                            {
                                width: sliderPosition,
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.sliderThumb,
                            {
                                transform: [{ translateX: sliderPosition }],
                            },
                        ]}
                        {...panResponder.panHandlers}
                    />
                </View>

                {/* Slider Labels */}
                <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>$0</Text>
                    <Text style={styles.sliderLabel}>$1k</Text>
                </View>
            </Animated.View>

            {/* City Skyline Background */}
            <View style={styles.skylineContainer}>
                <Image
                    source={skylineImage}
                    style={styles.skylineImage}
                    resizeMode="cover"
                />
            </View>

            {/* Next Button */}
            <Animated.View style={[styles.buttonContainer, { opacity: buttonFadeAnim }]}>
                <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={styles.nextButtonText}>Next</Text>
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
    backButton: {
        position: 'absolute',
        top: 55,
        left: 20,
        zIndex: 20,
        padding: 10,
    },
    backArrow: {
        fontSize: 28,
        color: colors.textPrimary,
        fontWeight: '600',
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
    titleContainer: {
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        marginTop: 50,
    },
    titleText: {
        fontSize: 36,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -1,
    },
    budgetDisplayContainer: {
        alignItems: 'center',
        marginTop: 30,
    },
    budgetAmount: {
        fontSize: 72,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -2,
    },
    sliderContainer: {
        paddingHorizontal: 40,
        marginTop: 20,
        alignItems: 'center',
    },
    dragHint: {
        fontSize: 16,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginBottom: 10,
    },
    sliderTrack: {
        width: SLIDER_WIDTH,
        height: 4,
        backgroundColor: colors.textPrimary,
        borderRadius: 2,
        position: 'relative',
    },
    sliderFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: 4,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    sliderThumb: {
        position: 'absolute',
        top: -8,
        left: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.textPrimary,
        borderWidth: 2,
        borderColor: colors.cardBackground,
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: SLIDER_WIDTH,
        marginTop: 12,
    },
    sliderLabel: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
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
    nextButton: {
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
    nextButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
});

export default BudgetScreen;

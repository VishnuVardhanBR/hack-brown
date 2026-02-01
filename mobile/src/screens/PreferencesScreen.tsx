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
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// Import the skyline image
const skylineImage = require('../assets/skyline.png');

interface PreferencesScreenProps {
    navigation: any;
    route: any;
}

export const PreferencesScreen: React.FC<PreferencesScreenProps> = ({ navigation, route }) => {
    const { city, budget, dates } = route.params || {};
    const [preferences, setPreferences] = useState('');

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(-30)).current;
    const inputFadeAnim = useRef(new Animated.Value(0)).current;
    const buttonFadeAnim = useRef(new Animated.Value(0)).current;

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
            // 2. Fade in input
            Animated.timing(inputFadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            // 3. Fade in buttons
            Animated.timing(buttonFadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleNext = () => {
        // TODO: Navigate to Loading/Itinerary screen when implemented
        // For now, show an alert with collected data
        const message = `Trip planned!\n\nCity: ${getCityName()}\nBudget: $${budget}\nDates: ${dates?.length || 0} day(s)\nPreferences: ${preferences || 'None'}`;
        alert(message);
        console.log('Trip data:', { city, budget, dates, preferences });
    };

    const handleSkip = () => {
        // TODO: Navigate to Loading/Itinerary screen when implemented
        const message = `Trip planned!\n\nCity: ${getCityName()}\nBudget: $${budget}\nDates: ${dates?.length || 0} day(s)\nPreferences: None`;
        alert(message);
        console.log('Trip data:', { city, budget, dates, preferences: '' });
    };

    const handleBack = () => {
        navigation.goBack();
    };

    // Extract city name for display - city can be an object, string, or undefined
    const getCityName = () => {
        if (!city) return 'your destination';
        if (typeof city === 'object' && city.name) return city.name;
        if (typeof city === 'string') return city.split(',')[0].trim();
        return 'your destination';
    };
    const cityName = getCityName();

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
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
                        <Text style={styles.titleText}>
                            Any preferences to{'\n'}make your visit{'\n'}to <Text style={styles.cityHighlight}>{cityName}</Text> special?
                        </Text>
                    </Animated.View>

                    {/* Example text */}
                    <Animated.View style={[styles.exampleContainer, { opacity: fadeAnim }]}>
                        <View style={styles.exampleBubble}>
                            <Text style={styles.exampleText}>example: Vegan, art scene</Text>
                        </View>
                    </Animated.View>

                    {/* Text Input */}
                    <Animated.View style={[styles.inputContainer, { opacity: inputFadeAnim }]}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter your preferences..."
                            placeholderTextColor={colors.disabled}
                            value={preferences}
                            onChangeText={setPreferences}
                            multiline={true}
                            scrollEnabled={true}
                            textAlignVertical="top"
                        />
                    </Animated.View>

                    {/* Buttons */}
                    <Animated.View style={[styles.buttonsSection, { opacity: buttonFadeAnim }]}>
                        <TouchableOpacity
                            style={[styles.nextButton, !preferences && styles.nextButtonDisabled]}
                            onPress={handleNext}
                            activeOpacity={0.8}
                            disabled={!preferences}
                        >
                            <Text style={[styles.nextButtonText, !preferences && styles.nextButtonTextDisabled]}>
                                Next
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={handleSkip}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.skipButtonText}>Skip</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </TouchableWithoutFeedback>

            {/* City Skyline Background */}
            <View style={styles.skylineContainer} pointerEvents="none">
                <Image
                    source={skylineImage}
                    style={styles.skylineImage}
                    resizeMode="cover"
                />
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: height * 0.4,
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
        marginTop: 40,
    },
    titleText: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -0.5,
        lineHeight: 42,
    },
    cityHighlight: {
        color: colors.primary,
        textDecorationLine: 'underline',
    },
    exampleContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    exampleBubble: {
        backgroundColor: colors.cardBackground,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    exampleText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    inputContainer: {
        marginTop: 24,
        paddingHorizontal: 24,
    },
    textInput: {
        backgroundColor: colors.cardBackground,
        borderRadius: 25,
        paddingHorizontal: 24,
        paddingVertical: 16,
        fontSize: 16,
        color: colors.textPrimary,
        borderWidth: 2,
        borderColor: colors.border,
        minHeight: 80,
        maxHeight: 120,
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    skylineContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.35,
        overflow: 'hidden',
        zIndex: -1,
    },
    skylineImage: {
        width: width,
        height: '100%',
    },
    buttonsSection: {
        marginTop: 30,
        alignItems: 'center',
        paddingHorizontal: 24,
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
        marginBottom: 12,
    },
    nextButtonDisabled: {
        borderColor: colors.disabled,
    },
    nextButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    nextButtonTextDisabled: {
        color: colors.disabled,
    },
    skipButton: {
        backgroundColor: colors.cardBackground,
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: colors.textSecondary,
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
    },
});

export default PreferencesScreen;

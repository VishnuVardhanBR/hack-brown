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
    ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const skylineImage = require('../assets/skyline.png');

interface PreferencesScreenProps {
    navigation: any;
    route: any;
}

const PREFERENCE_OPTIONS = [
    { id: 'music', label: '🎵 Music & Concerts', emoji: '🎵' },
    { id: 'food', label: '🍽️ Food & Dining', emoji: '🍽️' },
    { id: 'art', label: '🎨 Art & Museums', emoji: '🎨' },
    { id: 'sports', label: '⚽ Sports', emoji: '⚽' },
    { id: 'nightlife', label: '🌃 Nightlife', emoji: '🌃' },
    { id: 'outdoor', label: '🌳 Outdoor Activities', emoji: '🌳' },
    { id: 'theater', label: '🎭 Theater & Shows', emoji: '🎭' },
    { id: 'family', label: '👨‍👩‍👧 Family Friendly', emoji: '👨‍👩‍👧' },
];

export const PreferencesScreen: React.FC<PreferencesScreenProps> = ({ navigation, route }) => {
    const { city, budget, date } = route.params;
    const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(-30)).current;
    const optionsFadeAnim = useRef(new Animated.Value(0)).current;
    const buttonFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
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
            Animated.timing(optionsFadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(buttonFadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const togglePreference = (id: string) => {
        setSelectedPreferences(prev => {
            if (prev.includes(id)) {
                return prev.filter(p => p !== id);
            }
            return [...prev, id];
        });
    };

    const handleNext = () => {
        const preferencesString = selectedPreferences
            .map(id => PREFERENCE_OPTIONS.find(p => p.id === id)?.label.split(' ').slice(1).join(' '))
            .filter(Boolean)
            .join(', ');

        navigation.navigate('Loading', {
            city,
            budget,
            date,
            preferences: preferencesString || '',
        });
    };

    const handleBack = () => {
        navigation.goBack();
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
                <Text style={styles.titleText}>What interests you?</Text>
                <Text style={styles.subtitleText}>Select all that apply (optional)</Text>
            </Animated.View>

            {/* Preferences Grid */}
            <Animated.View style={[styles.optionsContainer, { opacity: optionsFadeAnim }]}>
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.optionsGrid}
                >
                    {PREFERENCE_OPTIONS.map((option) => {
                        const isSelected = selectedPreferences.includes(option.id);
                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.optionCard,
                                    isSelected && styles.optionCardSelected,
                                ]}
                                onPress={() => togglePreference(option.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                                <Text
                                    style={[
                                        styles.optionLabel,
                                        isSelected && styles.optionLabelSelected,
                                    ]}
                                >
                                    {option.label.split(' ').slice(1).join(' ')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
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
                    <Text style={styles.nextButtonText}>
                        {selectedPreferences.length > 0 ? 'Continue' : 'Skip'}
                    </Text>
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
        marginTop: 40,
    },
    titleText: {
        fontSize: 36,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -1,
    },
    subtitleText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 8,
    },
    optionsContainer: {
        flex: 1,
        marginTop: 24,
        paddingHorizontal: 20,
        maxHeight: height * 0.4,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingBottom: 20,
    },
    optionCard: {
        width: (width - 52) / 2,
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    optionCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.lavender + '30',
    },
    optionEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    optionLabelSelected: {
        color: colors.primary,
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

export default PreferencesScreen;

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
} from 'react-native';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// Import the skyline image
const skylineImage = require('../assets/skyline.png');

interface City {
    name: string;
    state: string;
    displayName: string;
}

const CITIES: City[] = [
    { name: 'New York', state: 'NY', displayName: 'New York, NY' },
    { name: 'San Francisco', state: 'CA', displayName: 'San Francisco, CA' },
    { name: 'Providence', state: 'RI', displayName: 'Providence, RI' },
];

interface CitySelectionScreenProps {
    navigation: any;
}

export const CitySelectionScreen: React.FC<CitySelectionScreenProps> = ({ navigation }) => {
    const [selectedCity, setSelectedCity] = useState<City | null>(null);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(-30)).current;
    const optionsFadeAnim = useRef(new Animated.Value(0)).current;
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
            // 2. Fade in city options
            Animated.timing(optionsFadeAnim, {
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

    const handleCitySelect = (city: City) => {
        setSelectedCity(city);
    };

    const handleNext = () => {
        if (selectedCity) {
            navigation.navigate('Budget', { city: selectedCity });
        }
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
                <Text style={styles.titleText}>Enter a City.</Text>
            </Animated.View>

            {/* City Selection Buttons */}
            <Animated.View style={[styles.selectionContainer, { opacity: optionsFadeAnim }]}>
                {CITIES.map((city, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.cityButton,
                            selectedCity?.displayName === city.displayName && styles.cityButtonSelected,
                        ]}
                        onPress={() => handleCitySelect(city)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.cityButtonText,
                                selectedCity?.displayName === city.displayName && styles.cityButtonTextSelected,
                            ]}
                        >
                            {city.displayName}
                        </Text>
                    </TouchableOpacity>
                ))}
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
                    style={[
                        styles.nextButton,
                        !selectedCity && styles.nextButtonDisabled,
                    ]}
                    onPress={handleNext}
                    disabled={!selectedCity}
                    activeOpacity={0.8}
                >
                    <Text style={[
                        styles.nextButtonText,
                        !selectedCity && styles.nextButtonTextDisabled,
                    ]}>Next</Text>
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
        marginTop: 100,
    },
    titleText: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },
    selectionContainer: {
        paddingHorizontal: 24,
        marginTop: 40,
        gap: 12,
    },
    cityButton: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.textPrimary,
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    cityButtonSelected: {
        backgroundColor: colors.primaryAccent,
        borderColor: colors.primary,
    },
    cityButtonText: {
        fontSize: 18,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    cityButtonTextSelected: {
        color: colors.textPrimary,
        fontWeight: '700',
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
    nextButtonDisabled: {
        backgroundColor: colors.disabled,
        borderColor: colors.border,
    },
    nextButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    nextButtonTextDisabled: {
        color: colors.textSecondary,
    },
});

export default CitySelectionScreen;


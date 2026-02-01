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

// Import the skyline image
const skylineImage = require('../assets/skyline.png');

interface DatePickerScreenProps {
    navigation: any;
    route: any;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerScreen: React.FC<DatePickerScreenProps> = ({ navigation, route }) => {
    const { city, budget } = route.params;

    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(-30)).current;
    const calendarFadeAnim = useRef(new Animated.Value(0)).current;
    const buttonFadeAnim = useRef(new Animated.Value(0)).current;

    // Helper to create a date string
    const createDateString = (year: number, month: number, day: number): string => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // Check if a date is selected
    const isDateSelected = (day: number): boolean => {
        const dateString = createDateString(selectedYear, selectedMonth, day);
        return selectedDates.has(dateString);
    };

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
            // 2. Fade in calendar
            Animated.timing(calendarFadeAnim, {
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

    const getDaysInMonth = (month: number, year: number): number => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number): number => {
        return new Date(year, month, 1).getDay();
    };

    const handlePreviousMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
        // Don't clear selections when changing months - allow multi-month selection
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
        // Don't clear selections when changing months - allow multi-month selection
    };

    const handlePreviousYear = () => {
        setSelectedYear(selectedYear - 1);
        // Don't clear selections when changing years
    };

    const handleNextYear = () => {
        setSelectedYear(selectedYear + 1);
        // Don't clear selections when changing years
    };

    const handleDateSelect = (day: number) => {
        const dateString = createDateString(selectedYear, selectedMonth, day);
        setSelectedDates(prevDates => {
            const newDates = new Set(prevDates);
            if (newDates.has(dateString)) {
                newDates.delete(dateString);
            } else {
                newDates.add(dateString);
            }
            return newDates;
        });
    };

    const handleNext = () => {
        if (selectedDates.size > 0) {
            // Convert Set to sorted array
            const datesArray = Array.from(selectedDates).sort();
            navigation.navigate('Preferences', { city, budget, dates: datesArray });
        }
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
        const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <View key={`empty-${i}`} style={styles.dayCell}>
                    <Text style={styles.dayText}></Text>
                </View>
            );
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = isDateSelected(day);
            const isToday = day === today.getDate() &&
                selectedMonth === today.getMonth() &&
                selectedYear === today.getFullYear();

            // Check if this date is in the past
            const currentDate = new Date(selectedYear, selectedMonth, day);
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isPastDate = currentDate < todayStart;

            days.push(
                <TouchableOpacity
                    key={day}
                    style={[
                        styles.dayCell,
                        isSelected && styles.selectedDayCell,
                        isToday && !isSelected && styles.todayCell,
                        isPastDate && styles.pastDayCell,
                    ]}
                    onPress={() => !isPastDate && handleDateSelect(day)}
                    disabled={isPastDate}
                >
                    <Text
                        style={[
                            styles.dayText,
                            isSelected && styles.selectedDayText,
                            isToday && !isSelected && styles.todayText,
                            isPastDate && styles.pastDayText,
                        ]}
                    >
                        {day}
                    </Text>
                </TouchableOpacity>
            );
        }

        return days;
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
                <Text style={styles.titleText}>Select Date(s).</Text>
                {selectedDates.size > 0 && (
                    <Text style={styles.subtitleText}>{selectedDates.size} day{selectedDates.size > 1 ? 's' : ''} selected</Text>
                )}
            </Animated.View>

            {/* Calendar */}
            <Animated.View style={[styles.calendarContainer, { opacity: calendarFadeAnim }]}>
                {/* Month and Year Selectors */}
                <View style={styles.calendarHeader}>
                    {/* Month Selector */}
                    <View style={styles.selectorContainer}>
                        <TouchableOpacity onPress={handlePreviousMonth} style={styles.arrowButton}>
                            <Text style={styles.arrowText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.selectorText}>{MONTHS[selectedMonth]}</Text>
                        <TouchableOpacity onPress={handleNextMonth} style={styles.arrowButton}>
                            <Text style={styles.arrowText}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Year Selector */}
                    <View style={styles.yearSelectorContainer}>
                        <TouchableOpacity onPress={handlePreviousYear} style={styles.arrowButton}>
                            <Text style={styles.arrowText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.yearText}>{selectedYear}</Text>
                        <TouchableOpacity onPress={handleNextYear} style={styles.arrowButton}>
                            <Text style={styles.arrowText}>›</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Days of Week Header */}
                <View style={styles.daysOfWeekContainer}>
                    {DAYS_OF_WEEK.map((day) => (
                        <View key={day} style={styles.dayOfWeekCell}>
                            <Text style={styles.dayOfWeekText}>{day}</Text>
                        </View>
                    ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                    {renderCalendarDays()}
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
                    style={[styles.nextButton, selectedDates.size === 0 && styles.nextButtonDisabled]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                    disabled={selectedDates.size === 0}
                >
                    <Text style={[styles.nextButtonText, selectedDates.size === 0 && styles.nextButtonTextDisabled]}>
                        {selectedDates.size > 0 ? `Next (${selectedDates.size} day${selectedDates.size > 1 ? 's' : ''})` : 'Next'}
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
        fontWeight: '600',
        color: colors.primary,
        marginTop: 8,
    },
    calendarContainer: {
        marginTop: 30,
        paddingHorizontal: 20,
        backgroundColor: colors.cardBackground,
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 16,
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    selectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    yearSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    arrowButton: {
        paddingHorizontal: 8,
    },
    arrowText: {
        fontSize: 20,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    selectorText: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
        minWidth: 80,
        textAlign: 'center',
    },
    yearText: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
        minWidth: 50,
        textAlign: 'center',
    },
    daysOfWeekContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    dayOfWeekCell: {
        width: (width - 80) / 7,
        alignItems: 'center',
    },
    dayOfWeekText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: (width - 80) / 7,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    dayText: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    selectedDayCell: {
        backgroundColor: colors.primary,
        borderRadius: 18,
    },
    selectedDayText: {
        color: colors.textLight,
        fontWeight: '700',
    },
    todayCell: {
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 18,
    },
    todayText: {
        color: colors.primary,
        fontWeight: '700',
    },
    pastDayCell: {
        opacity: 0.4,
    },
    pastDayText: {
        color: colors.disabled,
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
});

export default DatePickerScreen;

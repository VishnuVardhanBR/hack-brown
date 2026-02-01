import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StatusBar,
    Animated,
    Alert,
    Linking,
    TextInput,
} from 'react-native';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

const { width, height } = Dimensions.get('window');

interface ItineraryEvent {
    title: string;
    start_time: string;
    end_time: string;
    location: string;
    description: string;
    ticket_info: string;
    estimated_cost: number;
    date?: string; // YYYY-MM-DD format for multi-day support
}

interface ItineraryScreenProps {
    navigation: any;
    route: {
        params: {
            itinerary: ItineraryEvent[];
            itineraryId: string;
            totalCost: number;
            city: string;
            dates: string[];
            summary: string;
        };
    };
}

export const ItineraryScreen: React.FC<ItineraryScreenProps> = ({ navigation, route }) => {
    const { itinerary, itineraryId, totalCost, city, dates, summary } = route.params;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const [events, setEvents] = useState<ItineraryEvent[]>(itinerary);
    const [showRecalculateInput, setShowRecalculateInput] = useState(false);
    const [additionalPrompt, setAdditionalPrompt] = useState('');
    const [removedEventTitles, setRemovedEventTitles] = useState<string[]>([]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleRemoveEvent = (indexToRemove: number) => {
        const removedEvent = events[indexToRemove];
        setRemovedEventTitles(prev => [...prev, removedEvent.title]);
        setEvents(prevEvents => prevEvents.filter((_, index) => index !== indexToRemove));
    };

    const handleRecalculate = async () => {
        // Navigate to loading screen first
        navigation.navigate('Loading', {
            city: city,
            dates: dates,
            isRecalculating: true,
        });

        try {
            const response = await fetch(`${API_BASE_URL}/recalculate-itinerary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    itinerary_id: itineraryId,
                    additional_prompt: additionalPrompt,
                    excluded_events: removedEventTitles,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to recalculate itinerary');
            }

            const data = await response.json();

            // Navigate to new itinerary, replacing Loading screen
            navigation.replace('Itinerary', {
                itinerary: data.events,
                itineraryId: data.itinerary_id,
                totalCost: data.total_cost,
                city: data.city,
                dates: data.dates || dates,
                summary: data.summary,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to recalculate itinerary. Please try again.');
            navigation.goBack();
        }
    };

    const currentTotalCost = events.reduce((sum, event) => sum + (event.estimated_cost || 0), 0);

    const handleExportICS = async () => {
        try {
            const url = `${API_BASE_URL}/export-ics/${itineraryId}`;
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert(
                    'Export Calendar',
                    `Download your calendar file from:\n${url}`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to export calendar');
        }
    };

    const handleStartOver = () => {
        navigation.popToTop();
    };

    const handleViewMap = () => {
        navigation.navigate('Map', {
            itineraryId: itineraryId,
            city: city,
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatDateRange = () => {
        if (!dates || dates.length === 0) return '';
        if (dates.length === 1) return formatDate(dates[0]);
        
        const firstDate = new Date(dates[0] + 'T00:00:00');
        const lastDate = new Date(dates[dates.length - 1] + 'T00:00:00');
        
        const firstFormatted = firstDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
        const lastFormatted = lastDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
        
        return `${firstFormatted} - ${lastFormatted}`;
    };

    // Group events by date for multi-day display
    const getEventsByDate = () => {
        const grouped: { [date: string]: ItineraryEvent[] } = {};
        
        events.forEach(event => {
            // Use event's date field, or fall back to first date in dates array
            const eventDate = event.date || (dates && dates.length > 0 ? dates[0] : 'unknown');
            if (!grouped[eventDate]) {
                grouped[eventDate] = [];
            }
            grouped[eventDate].push(event);
        });
        
        // Sort dates chronologically
        const sortedDates = Object.keys(grouped).sort();
        return sortedDates.map(date => ({
            date,
            events: grouped[date]
        }));
    };

    const formatDayHeader = (dateStr: string, dayIndex: number) => {
        const date = new Date(dateStr + 'T00:00:00');
        const dayFormatted = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
        });
        return `Day ${dayIndex + 1} — ${dayFormatted}`;
    };

    const groupedEvents = getEventsByDate();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Your {city} Itinerary</Text>
                    <Text style={styles.headerDate}>{formatDateRange()}</Text>
                    <View style={styles.headerStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{events.length}</Text>
                            <Text style={styles.statLabel}>Events</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>${currentTotalCost.toFixed(0)}</Text>
                            <Text style={styles.statLabel}>Est. Cost</Text>
                        </View>
                    </View>

                    {/* Recalculate Button */}
                    <TouchableOpacity
                        style={styles.recalculateButton}
                        onPress={() => setShowRecalculateInput(!showRecalculateInput)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.recalculateButtonText}>
                            {showRecalculateInput ? '✕ Cancel' : '🔄 Recalculate'}
                        </Text>
                    </TouchableOpacity>

                    {/* Recalculate Input */}
                    {showRecalculateInput && (
                        <View style={styles.recalculateInputContainer}>
                            <TextInput
                                style={styles.recalculateInput}
                                placeholder="Add preferences (e.g., 'more outdoor activities')"
                                placeholderTextColor={colors.textSecondary}
                                value={additionalPrompt}
                                onChangeText={setAdditionalPrompt}
                                multiline={false}
                            />
                            <TouchableOpacity
                                style={styles.recalculateSubmitButton}
                                onPress={handleRecalculate}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.recalculateSubmitText}>Enter</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            {/* Event List */}
            <Animated.View
                style={[
                    styles.listContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <ScrollView
                    style={styles.eventList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.eventListContent}
                >
                    {groupedEvents.map((group, dayIndex) => (
                        <View key={group.date}>
                            {/* Day Header - only show if multiple days */}
                            {groupedEvents.length > 1 && (
                                <View style={styles.dayHeader}>
                                    <View style={styles.dayHeaderLine} />
                                    <Text style={styles.dayHeaderText}>
                                        {formatDayHeader(group.date, dayIndex)}
                                    </Text>
                                    <View style={styles.dayHeaderLine} />
                                </View>
                            )}
                            
                            {group.events.map((event, eventIndex) => {
                                // Calculate global index for remove functionality
                                const globalIndex = events.findIndex(e => 
                                    e.title === event.title && 
                                    e.start_time === event.start_time &&
                                    e.date === event.date
                                );
                                
                                return (
                                    <View key={`${group.date}-${eventIndex}`} style={styles.eventCard}>
                                        {/* Remove Button */}
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => handleRemoveEvent(globalIndex)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.removeButtonText}>✕</Text>
                                        </TouchableOpacity>

                                        <View style={styles.timeContainer}>
                                            <Text style={styles.timeText}>{event.start_time}</Text>
                                            <View style={styles.timeLine} />
                                            <Text style={styles.timeText}>{event.end_time}</Text>
                                        </View>

                                        <View style={styles.eventDetails}>
                                            <Text style={styles.eventTitle}>{event.title}</Text>
                                            <Text style={styles.eventLocation}>📍 {event.location}</Text>
                                            <Text style={styles.eventDescription}>{event.description}</Text>
                                            <View style={styles.eventFooter}>
                                                {event.ticket_info && (
                                                    <Text style={styles.ticketInfo}>🎟️ {event.ticket_info}</Text>
                                                )}
                                                {event.estimated_cost > 0 && (
                                                    <Text style={styles.costInfo}>${event.estimated_cost.toFixed(2)}</Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </ScrollView>
            </Animated.View>

            {/* Bottom Buttons */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    style={styles.mapButton}
                    onPress={handleViewMap}
                    activeOpacity={0.8}
                >
                    <Text style={styles.mapButtonText}>🗺️ View Route on Map</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.exportButton}
                    onPress={handleExportICS}
                    activeOpacity={0.8}
                >
                    <Text style={styles.exportButtonText}>📅 Export to Calendar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.startOverButton}
                    onPress={handleStartOver}
                    activeOpacity={0.8}
                >
                    <Text style={styles.startOverButtonText}>Start Over</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.primary,
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.textLight,
        marginBottom: 8,
    },
    headerDate: {
        fontSize: 16,
        color: colors.lavender,
        marginBottom: 20,
    },
    headerStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 30,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textLight,
    },
    statLabel: {
        fontSize: 12,
        color: colors.lavender,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    listContainer: {
        flex: 1,
    },
    eventList: {
        flex: 1,
    },
    eventListContent: {
        padding: 20,
        paddingBottom: 240,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        marginTop: 8,
    },
    dayHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.lavender,
    },
    dayHeaderText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
        paddingHorizontal: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    eventCard: {
        flexDirection: 'row',
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    removeButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    timeContainer: {
        alignItems: 'center',
        marginRight: 16,
        width: 50,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    timeLine: {
        width: 2,
        flex: 1,
        backgroundColor: colors.lavender,
        marginVertical: 6,
        minHeight: 40,
    },
    eventDetails: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 6,
    },
    eventLocation: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    eventDescription: {
        fontSize: 14,
        color: colors.textPrimary,
        lineHeight: 20,
        marginBottom: 10,
    },
    eventFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ticketInfo: {
        fontSize: 12,
        color: colors.deepPurple,
        fontWeight: '600',
    },
    costInfo: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '700',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    mapButton: {
        backgroundColor: colors.deepPurple,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    mapButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textLight,
    },
    exportButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: colors.darkPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    exportButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textLight,
    },
    startOverButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    startOverButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    recalculateButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    recalculateButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textLight,
        textAlign: 'center',
    },
    recalculateInputContainer: {
        marginTop: 12,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recalculateInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.textPrimary,
    },
    recalculateSubmitButton: {
        backgroundColor: colors.lavender,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    recalculateSubmitText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
});

export default ItineraryScreen;

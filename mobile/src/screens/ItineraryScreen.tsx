import React, { useRef, useEffect } from 'react';
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
}

interface ItineraryScreenProps {
    navigation: any;
    route: {
        params: {
            itinerary: ItineraryEvent[];
            itineraryId: string;
            totalCost: number;
            city: string;
            date: string;
            summary: string;
        };
    };
}

export const ItineraryScreen: React.FC<ItineraryScreenProps> = ({ navigation, route }) => {
    const { itinerary, itineraryId, totalCost, city, date, summary } = route.params;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

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

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Your {city} Itinerary</Text>
                    <Text style={styles.headerDate}>{formatDate(date)}</Text>
                    <View style={styles.headerStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{itinerary.length}</Text>
                            <Text style={styles.statLabel}>Events</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>${totalCost.toFixed(0)}</Text>
                            <Text style={styles.statLabel}>Est. Cost</Text>
                        </View>
                    </View>
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
                    {itinerary.map((event, index) => (
                        <View key={index} style={styles.eventCard}>
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
                    ))}
                </ScrollView>
            </Animated.View>

            {/* Bottom Buttons */}
            <View style={styles.bottomContainer}>
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
        paddingBottom: 100,
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
});

export default ItineraryScreen;

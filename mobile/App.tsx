import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { CitySelectionScreen } from './src/screens/CitySelectionScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { DatePickerScreen } from './src/screens/DatePickerScreen';
import { PreferencesScreen } from './src/screens/PreferencesScreen';
import { AdditionalPreferencesScreen } from './src/screens/AdditionalPreferencesScreen';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { ItineraryScreen } from './src/screens/ItineraryScreen';
import { AerialViewScreen } from './src/screens/AerialViewScreen';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Welcome"
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="CitySelection" component={CitySelectionScreen} />
                <Stack.Screen name="Budget" component={BudgetScreen} />
                <Stack.Screen name="DatePicker" component={DatePickerScreen} />
                <Stack.Screen name="Preferences" component={PreferencesScreen} />
                <Stack.Screen name="AdditionalPreferences" component={AdditionalPreferencesScreen} />
                <Stack.Screen name="Loading" component={LoadingScreen} />
                <Stack.Screen name="Itinerary" component={ItineraryScreen} />
                <Stack.Screen name="Map" component={AerialViewScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}


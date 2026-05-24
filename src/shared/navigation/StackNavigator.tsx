import React from 'react';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';

import MainTabNavigator from './MainTabNavigator';
import GroupSearch from '../../features/Planning/screens/GroupSelectionScreen';
import Group from '../../features/Planning/screens/ScheduleScreen';
import About from '../../features/About/AboutScreen';
import Settings from '../../features/Settings/SettingsScreen';
import CredentialsSettingsScreen from '../../features/Scolarite/CredentialsSettingsScreen';
import { CredentialsProvider } from '../../features/Scolarite/services/CredentialsContext';
import WebBrowser from '../../features/Browser/WebBrowserScreen';
import Geolocation from '../../features/Map/MapScreen';
import Course from '../../features/Planning/components/CourseCard';
import DayView from '../../features/Planning/views/DayView';
import CrousScreen from '../../features/Crous/CrousScreen';
import CrousMenuScreen from '../../features/Crous/CrousMenuScreen';
import LibraryScreen from '../../features/Library/LibraryScreen';
import LibraryDetailsScreen from '../../features/Library/LibraryDetailsScreen';
import BdeDetailsScreen from '../../features/Bde/BdeDetailsScreen';
import BdeScreen from '../../features/Bde/BdeScreen';
import FreeRoomScreen from '../../features/FreeRoom/FreeRoomScreen';
import FreeRoomDetailsScreen from '../../features/FreeRoom/FreeRoomDetailsScreen';

import style, { tokens } from '../theme/Theme';
import { AppContext, treatTitle } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { NavBarHelper, SaveGroupButton as SaveButton, FilterRemoveButton } from './NavHelpers';

export type RootStackParamList = {
    MainTabs: undefined;
    GroupSearch: undefined;
    Group: { name: string | string[] };
    About: undefined;
    Settings: undefined;
    CredentialsSettings: undefined;
    Crous: undefined;
    Library: undefined;
    WebBrowser: { entrypoint?: string };
    Day: undefined;
    CrousMenu: { restaurantName?: string; location?: { lat: number, lng: number } };
    LibraryDetails: { library?: { name: string; lat: number; lng: number } };
    Bde: undefined;
    BdeDetail: { annonce?: Record<string, unknown> };
    FreeRoomScreen: undefined;
    FreeRoomDetails: { building?: Record<string, unknown> };
    Geolocation: { title?: string; location?: { lat: number; lng: number } };
    Course: { title?: string; data?: { UE?: string } };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function StackNavigator() {
    return (
        <AppContext.Consumer>
            {({ themeName }) => {
                const theme = style.Theme[themeName];

                const renderMapButton = (navigation: StackNavigationProp<RootStackParamList>, title?: string, location?: { lat: number, lng: number }) => (
                    <TouchableOpacity onPress={() => navigation.navigate('Geolocation', { title, location })} style={{ paddingRight: tokens.space.md }}>
                        <View style={{ backgroundColor: theme.greyBackground, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.md, flexShrink: 0 }}>
                            <MaterialCommunityIcons name="map-marker-radius" size={24} color={theme.primary} />
                        </View>
                    </TouchableOpacity>
                );

                return (
                  <CredentialsProvider>
                    <Stack.Navigator
                        id="RootStack"
                        initialRouteName="MainTabs"
                        screenOptions={{
                            headerLeft: (props) => props.canGoBack ? (
                                <TouchableOpacity onPress={props.onPress} style={{ paddingLeft: tokens.space.md }}>
                                    <View style={{ backgroundColor: theme.greyBackground, width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.md }}>
                                        <MaterialIcons name="arrow-back" size={28} color={theme.primary} />
                                    </View>
                                </TouchableOpacity>
                            ) : undefined,
                        }}>
                        
                        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />

                        <Stack.Screen name="GroupSearch" component={GroupSearch} options={({ route }) => NavBarHelper({ title: Translator.get('GROUPS'), themeName, route, gestureEnabled: true })} />
                        
                        <Stack.Screen 
                            name="Group" 
                            component={Group} 
                            options={({ route }) => NavBarHelper({ 
                                headerRight: () => <View style={{ paddingRight: tokens.space.md }}><SaveButton groupName={route.params.name} themeName={themeName} /></View>, 
                                title: Array.isArray(route.params.name) ? (Translator.get('MY_PLANNING') || 'Mon Planning') : treatTitle(route.params.name), 
                                themeName, 
                                route,
                                gestureEnabled: true
                            })} 
                        />
                        
                        <Stack.Screen name="About" component={About} options={({ route }) => NavBarHelper({ title: Translator.get('ABOUT'), themeName, route, gestureEnabled: true })} />
                        
                        <Stack.Screen name="Settings" component={Settings} options={({ route }) => NavBarHelper({ title: Translator.get('SETTINGS'), themeName, route, gestureEnabled: true })} />
                        
                        <Stack.Screen name="CredentialsSettings" component={CredentialsSettingsScreen} options={({ route }) => NavBarHelper({ title: Translator.get('LOGOUT'), themeName, route, gestureEnabled: true })} />
                        
                        <Stack.Screen name="Crous" component={CrousScreen} options={({ route }) => NavBarHelper({ title: Translator.get('RESTAURANTS'), themeName, route, gestureEnabled: true })} />
                        
                        <Stack.Screen name="Library" component={LibraryScreen} options={({ route }) => NavBarHelper({ title: Translator.get('LIBRARIES'), themeName, route, gestureEnabled: true })} />
                        
                        <Stack.Screen name="WebBrowser" component={WebBrowser} options={{ headerShown: false, gestureEnabled: true }} />
                        
                        <Stack.Screen name="Day" component={DayView} options={({ route }) => NavBarHelper({ title: Translator.get('DAY'), themeName, route })} />
                        
                        <Stack.Screen name="CrousMenu" component={CrousMenuScreen} options={({ navigation, route }) => NavBarHelper({ headerRight: () => renderMapButton(navigation, route.params?.restaurantName, route.params?.location), title: route.params?.restaurantName ?? Translator.get('MENU'), themeName, route })} />
                        
                        <Stack.Screen name="LibraryDetails" component={LibraryDetailsScreen} options={({ navigation, route }) => NavBarHelper({ headerRight: () => renderMapButton(navigation, route.params?.library?.name, { lat: route.params?.library?.lat, lng: route.params?.library?.lng }), title: treatTitle(route.params?.library?.name ?? Translator.get('LIBRARY_DETAILS')), themeName, route })} />
                    
                        <Stack.Screen name="Bde" component={BdeScreen} options={({ route }) => NavBarHelper({ title: Translator.get('STUDENT_LIFE') || 'Student life', themeName, route, gestureEnabled: true })} />

                        <Stack.Screen name="BdeDetail" component={BdeDetailsScreen} options={({ route }) => NavBarHelper({ title: Translator.get('DETAILS') || 'Détails', themeName, route, gestureEnabled: true })} />
                    
                        <Stack.Screen name="FreeRoomScreen" component={FreeRoomScreen} options={({ route }) => NavBarHelper({ title: Translator.get('FREE_ROOMS') || 'Salles Libres', themeName, route, gestureEnabled: true })} />
                        <Stack.Screen name="FreeRoomDetails" component={FreeRoomDetailsScreen} options={({ route }) => NavBarHelper({ title: Translator.get('DETAILS') || 'Détails', themeName, route, gestureEnabled: true })} />

                        <Stack.Screen name="Geolocation" component={Geolocation} options={({ route }) => NavBarHelper({ title: Translator.get('MAP'), themeName, route })} />
                        
                        <Stack.Screen name="Course" component={Course} options={({ navigation, route }) => NavBarHelper({ headerRight: () => <View style={{ paddingRight: tokens.space.md }}><FilterRemoveButton UE={route.params?.data?.UE} themeName={themeName} backAction={navigation.goBack} /></View>, title: route.params?.title ?? Translator.get('DETAILS'), themeName, route })} />
                    </Stack.Navigator>
                  </CredentialsProvider>
                );
            }}
        </AppContext.Consumer>
    );
}
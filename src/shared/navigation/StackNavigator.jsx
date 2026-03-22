import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';

import Home from '../../features/Home/HomeScreen';
import Group from '../../features/Schedule/ScheduleScreen';
import About from '../../features/About/AboutScreen';
import Settings from '../../features/Settings/SettingsScreen';
import WebBrowser from '../../features/Browser/WebBrowserScreen';
import Geolocation from '../../features/Map/MapScreen';
import Course from '../../features/Schedule/CourseCard';
import DayView from '../../features/Schedule/DayView';
import WeekView from '../../features/Schedule/WeekView';
import CrousScreen from '../../features/Crous/CrousScreen';
import CrousMenuScreen from '../../features/Crous/CrousMenuScreen';
import LibraryScreen from '../../features/Library/LibraryScreen';
import LibraryDetailsScreen from '../../features/Library/LibraryDetailsScreen';

import style, { tokens } from '../theme/Theme';
import { AppContext, treatTitle } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { NavBarHelper, SaveGroupButton as SaveButton, FilterRemoveButton } from './NavHelpers';

const Stack = createStackNavigator();

export default function StackNavigator() {
    return (
        <AppContext.Consumer>
            {({ themeName }) => {
                const theme = style.Theme[themeName];

                // BOUTONS REUTILISABLES
                const renderMenuButton = (navigation) => (
                    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={{ paddingLeft: tokens.space.md }}>
                        <View style={{ backgroundColor: theme.greyBackground, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.pill, flexShrink: 0 }}>
                            <MaterialCommunityIcons name="menu" size={26} color={theme.primary} />
                        </View>
                    </TouchableOpacity>
                );

                const renderMapButton = (navigation, title, location) => (
                    <TouchableOpacity onPress={() => navigation.navigate('Geolocation', { title, location })} style={{ paddingRight: tokens.space.md }}>
                        <View style={{ backgroundColor: theme.greyBackground, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.pill, flexShrink: 0 }}>
                            <MaterialCommunityIcons name="map-marker-radius" size={24} color={theme.primary} />
                        </View>
                    </TouchableOpacity>
                );

                return (
                    <Stack.Navigator
                        screenOptions={{
                            headerLeft: (props) => props.canGoBack ? (
                                <TouchableOpacity onPress={props.onPress} style={{ paddingLeft: tokens.space.md }}>
                                    <View style={{ backgroundColor: theme.greyBackground, width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.pill }}>
                                        <MaterialIcons name="arrow-back" size={28} color={theme.primary} />
                                    </View>
                                </TouchableOpacity>
                            ) : undefined,
                        }}>
                        
                        <Stack.Screen name="Home" component={Home} options={({ navigation, route }) => NavBarHelper({ headerLeft: () => renderMenuButton(navigation), title: Translator.get('GROUPS'), themeName, route, gestureEnabled: false })} />
                        
                        <Stack.Screen 
                            name="Group" 
                            component={Group} 
                            options={({ navigation, route }) => NavBarHelper({ 
                                headerLeft: () => renderMenuButton(navigation), 
                                headerRight: () => <View style={{ paddingRight: tokens.space.md }}><SaveButton groupName={route.params.name} themeName={themeName} /></View>, 
                                title: treatTitle(route.params.name), 
                                themeName, 
                                route,
                                gestureEnabled: false
                            })} 
                        />
                        
                        <Stack.Screen name="About" component={About} options={({ navigation, route }) => NavBarHelper({ headerLeft: () => renderMenuButton(navigation), title: Translator.get('ABOUT'), themeName, route, gestureEnabled: false })} />
                        
                        <Stack.Screen name="Settings" component={Settings} options={({ navigation, route }) => NavBarHelper({ headerLeft: () => renderMenuButton(navigation), title: Translator.get('SETTINGS'), themeName, route, gestureEnabled: false })} />
                        
                        <Stack.Screen name="Crous" component={CrousScreen} options={({ navigation, route }) => NavBarHelper({ headerLeft: () => renderMenuButton(navigation), title: Translator.get('RESTAURANTS'), themeName, route, gestureEnabled: false })} />
                        
                        <Stack.Screen name="Library" component={LibraryScreen} options={({ navigation, route }) => NavBarHelper({ headerLeft: () => renderMenuButton(navigation), title: Translator.get('LIBRARIES'), themeName, route, gestureEnabled: false })} />
                        
                        <Stack.Screen name="WebBrowser" component={WebBrowser} options={({ navigation, route }) => {
                            const hasMenu = route.params?.entrypoint ? true : false;
                            const leftButton = hasMenu ? () => renderMenuButton(navigation) : undefined;
                            return NavBarHelper({ headerLeft: leftButton, title: treatTitle(route.params?.title ?? Translator.get('WEB_BROWSER')), themeName, route, gestureEnabled: !hasMenu });
                        }} />
                        
                        <Stack.Screen name="Week" component={WeekView} options={({ route }) => NavBarHelper({ headerRight: () => <View style={{ paddingRight: tokens.space.md }}><SaveButton groupName={route.params.groupName} themeName={themeName} /></View>, title: route.params.groupName.replace(/_/g, ' '), themeName, route })} />
                        
                        <Stack.Screen name="Day" component={DayView} options={{ tabBarLabel: Translator.get('DAY'), tabBarIcon: ({ tintColor }) => <MaterialCommunityIcons name="calendar" size={24} style={{ color: tintColor }} /> }} />
                        
                        <Stack.Screen name="CrousMenu" component={CrousMenuScreen} options={({ navigation, route }) => NavBarHelper({ headerRight: () => renderMapButton(navigation, route.params?.restaurantName, route.params?.location), title: route.params?.restaurantName ?? Translator.get('MENU'), themeName, route })} />
                        
                        <Stack.Screen name="LibraryDetails" component={LibraryDetailsScreen} options={({ navigation, route }) => NavBarHelper({ headerRight: () => renderMapButton(navigation, route.params?.library?.name, { lat: route.params?.library?.lat, lng: route.params?.library?.lng }), title: treatTitle(route.params?.library?.name ?? Translator.get('LIBRARY_DETAILS')), themeName, route })} />
                    
                        <Stack.Screen name="Geolocation" component={Geolocation} options={({ route }) => NavBarHelper({ title: Translator.get('MAP'), themeName, route })} />
                        
                        <Stack.Screen name="Course" component={Course} options={({ navigation, route }) => NavBarHelper({ headerRight: () => <View style={{ paddingRight: tokens.space.md }}><FilterRemoveButton UE={route.params?.data?.UE} themeName={themeName} backAction={navigation.goBack} /></View>, title: route.params?.title ?? Translator.get('DETAILS'), themeName, route })} />
                    </Stack.Navigator>
                );
            }}
        </AppContext.Consumer>
    );
}
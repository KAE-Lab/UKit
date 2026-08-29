import React from 'react';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import MainTabNavigator from './MainTabNavigator';
import GroupSearch from '../../features/Planning/screens/GroupSelectionScreen';
import Group from '../../features/Planning/screens/ScheduleScreen';
import About from '../../features/Settings/screens/AboutScreen';
import Settings from '../../features/Settings/screens/SettingsScreen';
import CredentialsSettingsScreen from '../../features/Scolarite/screens/CredentialsSettingsScreen';
import DocumentsScreen from '../../features/Scolarite/screens/DocumentsScreen';
import DocumentViewerScreen, { partagerDocument } from '../../features/Scolarite/screens/DocumentViewerScreen';
import WebBrowser from '../../features/Scolarite/screens/WebBrowserScreen';
import LienEdtScreen from '../../features/Planning/screens/LienEdtScreen';
import Geolocation from '../map/MapScreen';
import { CourseScreen } from '../../features/Planning/screens/CourseScreen';
import DayView from '../../features/Planning/views/DayView';
import CrousScreen from '../../features/Campus/Crous/CrousScreen';
import CrousMenuScreen from '../../features/Campus/Crous/CrousMenuScreen';
import LibraryScreen from '../../features/Campus/Library/LibraryScreen';
import LibraryDetailsScreen from '../../features/Campus/Library/LibraryDetailsScreen';
import BdeDetailsScreen from '../../features/Campus/Bde/BdeDetailsScreen';
import BdeScreen from '../../features/Campus/Bde/BdeScreen';
import FreeRoomScreen from '../../features/Campus/FreeRoom/FreeRoomScreen';
import FreeRoomDetailsScreen from '../../features/Campus/FreeRoom/FreeRoomDetailsScreen';

import style, { tokens } from '../theme/Theme';
import { AppContext, treatTitle } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { HeaderButton, HEADER_BUTTON_ICON } from '../ui/HeaderButton';
import { NavBarHelper, SaveGroupButton as SaveButton, FilterRemoveButton } from './NavHelpers';

export type RootStackParamList = {
    MainTabs: undefined;
    GroupSearch: undefined;
    Group: { name: string | string[] };
    About: undefined;
    Settings: undefined;
    /** `ressaisie` ouvre l'ecran directement sur le formulaire, sans deconnecter. */
    CredentialsSettings: { ressaisie?: boolean } | undefined;
    Documents: undefined;
    /** Le lecteur d'une piece rangee : son adresse locale et son nom de fichier. */
    DocumentViewer: { uri: string; nom: string };
    LienEdt: undefined;
    Crous: undefined;
    Library: undefined;
    WebBrowser: { entrypoint?: string };
    Day: undefined;
    CrousMenu: { restaurantName?: string; location?: { lat: number, lng: number }; openingLines?: string[] };
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
                        <HeaderButton theme={theme}>
                            <MaterialCommunityIcons name="map-marker-radius" size={HEADER_BUTTON_ICON} color={theme.primary} />
                        </HeaderButton>
                    </TouchableOpacity>
                );

                return (
                    // `CredentialsProvider` a remonte dans `rootContainer` au jalon 6-J : le parcours
                    // d'accueil propose la connexion au compte, et il est rendu **a la place** de ce
                    // navigateur. Le provider devait donc envelopper les deux branches, sans quoi
                    // l'accueil aurait eu besoin de son propre formulaire — c'est-a-dire d'un second
                    // chemin de connexion a maintenir.
                    <Stack.Navigator
                            id="RootStack"
                            initialRouteName="MainTabs"
                            screenOptions={{
                                headerLeft: (props) => props.canGoBack ? (
                                    <TouchableOpacity onPress={props.onPress} style={{ paddingLeft: tokens.space.md }}>
                                        <HeaderButton theme={theme}>
                                            {/* `28` et non la taille commune : une fleche est un
                                                glyphe plus leger qu'une icone pleine, et elle parait
                                                plus petite a taille egale. C'est un ecart **optique**,
                                                mesure a l'oeil, pas une divergence oubliee. */}
                                            <MaterialIcons name="arrow-back" size={28} color={theme.primary} />
                                        </HeaderButton>
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
                                    title: Array.isArray(route.params.name) ? (Translator.get('MY_PLANNING')) : treatTitle(route.params.name),
                                    themeName,
                                    route,
                                    gestureEnabled: true
                                })}
                            />

                            <Stack.Screen name="About" component={About} options={({ route }) => NavBarHelper({ title: Translator.get('ABOUT'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="Settings" component={Settings} options={({ route }) => NavBarHelper({ title: Translator.get('SETTINGS'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="CredentialsSettings" component={CredentialsSettingsScreen} options={({ route }) => NavBarHelper({ title: Translator.get('ACCOUNT'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="Documents" component={DocumentsScreen} options={({ route }) => NavBarHelper({ title: Translator.get('MY_DOCUMENTS'), themeName, route, gestureEnabled: true })} />

                            {/* Le partage en bouton d'en-tete, comme le plan externe sur la carte :
                                le geste secondaire vit dans la barre, l'ecran ne porte que la piece. */}
                            <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={({ route }) => NavBarHelper({ headerRight: () => (
                                <TouchableOpacity onPress={() => { void partagerDocument(route.params?.uri ?? ''); }} style={{ paddingRight: tokens.space.md }}>
                                    <HeaderButton theme={theme}>
                                        <MaterialCommunityIcons name="export-variant" size={HEADER_BUTTON_ICON} color={theme.primary} />
                                    </HeaderButton>
                                </TouchableOpacity>
                            ), title: route.params?.nom ?? Translator.get('MY_DOCUMENTS'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="LienEdt" component={LienEdtScreen} options={({ route }) => NavBarHelper({ title: Translator.get('TIMETABLE_LINK'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="Crous" component={CrousScreen} options={({ route }) => NavBarHelper({ title: Translator.get('RESTAURANTS'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="Library" component={LibraryScreen} options={({ route }) => NavBarHelper({ title: Translator.get('LIBRARIES'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="WebBrowser" component={WebBrowser} options={{ headerShown: false, gestureEnabled: true }} />

                            <Stack.Screen name="Day" component={DayView} options={({ route }) => NavBarHelper({ title: Translator.get('DAY'), themeName, route })} />

                            <Stack.Screen name="CrousMenu" component={CrousMenuScreen} options={({ navigation, route }) => NavBarHelper({ headerRight: () => renderMapButton(navigation, route.params?.restaurantName, route.params?.location), title: route.params?.restaurantName ?? Translator.get('MENU'), themeName, route })} />

                            <Stack.Screen name="LibraryDetails" component={LibraryDetailsScreen} options={({ navigation, route }) => NavBarHelper({ headerRight: () => renderMapButton(navigation, route.params?.library?.name, { lat: route.params?.library?.lat, lng: route.params?.library?.lng }), title: treatTitle(route.params?.library?.name ?? Translator.get('LIBRARY_DETAILS')), themeName, route })} />

                            <Stack.Screen name="Bde" component={BdeScreen} options={({ route }) => NavBarHelper({ title: Translator.get('STUDENT_LIFE'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="BdeDetail" component={BdeDetailsScreen} options={({ route }) => NavBarHelper({ title: Translator.get('DETAILS'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="FreeRoomScreen" component={FreeRoomScreen} options={({ route }) => NavBarHelper({ title: Translator.get('FREE_ROOMS'), themeName, route, gestureEnabled: true })} />
                            <Stack.Screen name="FreeRoomDetails" component={FreeRoomDetailsScreen} options={({ route }) => NavBarHelper({ title: Translator.get('DETAILS'), themeName, route, gestureEnabled: true })} />

                            <Stack.Screen name="Geolocation" component={Geolocation} options={({ route }) => NavBarHelper({ title: Translator.get('MAP'), themeName, route })} />

                            <Stack.Screen name="Course" component={CourseScreen} options={({ navigation, route }) => NavBarHelper({ headerRight: () => <View style={{ paddingRight: tokens.space.md }}><FilterRemoveButton UE={route.params?.data?.UE} themeName={themeName} backAction={navigation.goBack} /></View>, title: route.params?.title ?? Translator.get('DETAILS'), themeName, route })} />
                        </Stack.Navigator>
                );
            }}
        </AppContext.Consumer>
    );
}
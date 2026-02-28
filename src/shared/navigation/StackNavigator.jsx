import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

import style from '../theme/Theme';
import { BackButton } from '../ui/Button'; 
import { AppContext, treatTitle } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { NavBarHelper, SaveGroupButton as SaveButton, FilterRemoveButton } from './NavHelpers';

const Stack = createStackNavigator();

export default function StackNavigator() {
	return (
		<AppContext.Consumer>
			{({ themeName, groupName, filters }) => (
				<Stack.Navigator
					screenOptions={({ navigation, route }) => {
						const leftButton = <BackButton backAction={navigation.goBack} />;
						const title = route.name;

						return NavBarHelper({ headerLeft: () => leftButton, title, themeName });
					}}>
					<Stack.Screen
						name="Home"
						component={Home}
						options={({ navigation }) => {
							const title = Translator.get('GROUPS');
							const leftButton = (
								<TouchableOpacity onPress={() => navigation.openDrawer()} style={{ justifyContent: 'space-around', paddingLeft: 16 }}>
									<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
										<MaterialCommunityIcons name="menu" size={32} style={{ color: '#F0F0F0', height: 32, width: 32 }} />
									</View>
								</TouchableOpacity>
							);
							return NavBarHelper({ headerLeft: () => leftButton, title, themeName });
						}}
					/>
					<Stack.Screen
						name="Group"
						component={Group}
						options={({ navigation, route }) => {
							const title = treatTitle(route.params.name);
							const rightButton = <SaveButton groupName={route.params.name} />;
							const leftButton = (
								<TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={{ justifyContent: 'space-around', paddingLeft: 10 }}>
									<MaterialCommunityIcons name="menu" size={32} color="#F0F0F0" />
								</TouchableOpacity>
							);
							return NavBarHelper({ headerLeft: () => leftButton, headerRight: () => rightButton, title, themeName });
						}}
					/>
					<Stack.Screen
						name="Week"
						component={WeekView}
						options={({ route }) => {
							const groupName = route.params.groupName;
							const title = groupName.replace(/_/g, ' ');
							const rightButton = (
								<View style={{ justifyContent: 'space-around', paddingRight: 16, flexDirection: 'row' }}>
									<SaveButton groupName={groupName} />
								</View>
							);
							return NavBarHelper({ headerRight: () => rightButton, title, themeName });
						}}
					/>
					<Stack.Screen
						name="Day"
						component={DayView}
						options={{
							tabBarLabel: Translator.get('DAY'),
							tabBarIcon: ({ tintColor }) => <MaterialCommunityIcons name="calendar" size={24} style={{ color: tintColor }} />
						}}
					/>
					<Stack.Screen name="About" component={About} options={{ title: Translator.get('ABOUT') }} />
					<Stack.Screen name="Settings" component={Settings} options={{ title: Translator.get('SETTINGS') }} />
					
					{/* ── CROUS ── */}
					<Stack.Screen 
						name="Crous" 
						component={CrousScreen} 
						options={{ title: Translator.get('RESTAURANTS_U') }} 
					/>

					{/* ── MENU DU CROUS ── */}
					<Stack.Screen 
						name="CrousMenu" 
						component={CrousMenuScreen} 
						options={({ route, navigation }) => {
							const title = route.params?.restaurantName ?? Translator.get('MENU');
							
							const rightButton = (
								<TouchableOpacity 
									onPress={() => {
										navigation.navigate('Geolocation', { 
											title: route.params?.restaurantName,
											location: route.params?.location 
										});
									}} 
									style={{ marginRight: 16 }}
								>
									<MaterialCommunityIcons name="map-marker-radius" size={28} color="#FFFFFF" />
								</TouchableOpacity>
							);

							const leftButton = <BackButton backAction={navigation.goBack} />;
							return NavBarHelper({ headerLeft: () => leftButton, headerRight: () => rightButton, title, themeName });
						}} 
					/>
										
					<Stack.Screen
						name="WebBrowser"
						component={WebBrowser}
						options={({ route }) => {
							const title = treatTitle(route.params?.title ?? Translator.get('WEB_BROWSER'));
							return NavBarHelper({ title, themeName });
						}}
					/>
					<Stack.Screen name="Geolocation" component={Geolocation} />
					<Stack.Screen
						name="Course"
						component={Course}
						options={({ navigation, route }) => {
							const title = route.params?.title ?? Translator.get('DETAILS');
							const rightButton = (
								<View style={{ justifyContent: 'space-around', paddingRight: 16, flexDirection: 'row' }}>
									<FilterRemoveButton UE={route.params?.data?.UE} themeName={themeName} backAction={navigation.goBack} />
								</View>
							);
							return NavBarHelper({ headerRight: () => rightButton, title, themeName });
						}}
					/>
				</Stack.Navigator>
			)}
		</AppContext.Consumer>
	);
}
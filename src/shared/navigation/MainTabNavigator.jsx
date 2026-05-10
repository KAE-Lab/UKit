import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import ScheduleScreen from '../../features/Schedule/ScheduleScreen';
import CampusDashboard from '../../features/Campus/CampusDashboard';
import ScolariteDashboard from '../../features/Scolarite/ScolariteDashboard';
import AutresDashboard from '../../features/Autres/AutresDashboard';

import style, { tokens } from '../theme/Theme';
import { AppContext } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { NavBarHelper, SaveGroupButton } from './NavHelpers';

const Tab = createBottomTabNavigator();

// Composant Custom Tab Bar pour reproduire l'effet Apple Music (décalé à gauche, ratio icon/text, bords arrondis)
function CustomTabBar({ state, descriptors, navigation, theme }) {
    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => {
                const bottomPadding = Math.max(tokens.space.sm, (insets?.bottom || 0) - 15);
                
                return (
                    <View style={[styles.tabBarWrapper, { paddingBottom: bottomPadding }]}>
                        <View style={[
                            styles.tabBarContainer, 
                            { 
                                backgroundColor: theme.cardBackground, 
                                borderColor: theme.border,
                            }
                        ]}>
                            {state.routes.map((route, index) => {
                                const { options } = descriptors[route.key];
                                const label = options.tabBarLabel !== undefined
                                    ? options.tabBarLabel
                                    : options.title !== undefined
                                        ? options.title
                                        : route.name;

                                const isFocused = state.index === index;

                                const onPress = () => {
                                    const event = navigation.emit({
                                        type: 'tabPress',
                                        target: route.key,
                                        canPreventDefault: true,
                                    });

                                    if (!isFocused && !event.defaultPrevented) {
                                        navigation.navigate(route.name);
                                    }
                                };

                                const onLongPress = () => {
                                    navigation.emit({
                                        type: 'tabLongPress',
                                        target: route.key,
                                    });
                                };

                                const color = isFocused ? (theme.accent ?? theme.primary) : theme.fontSecondary;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityState={isFocused ? { selected: true } : {}}
                                        accessibilityLabel={options.tabBarAccessibilityLabel}
                                        testID={options.tabBarTestID}
                                        onPress={onPress}
                                        onLongPress={onLongPress}
                                        style={styles.tabItem}
                                    >
                                        <View style={[
                                            styles.iconContainer,
                                            isFocused && { backgroundColor: `${theme.primary}15` }
                                        ]}>
                                            {options.tabBarIcon && options.tabBarIcon({ color, size: 24, focused: isFocused })}
                                        </View>
                                        <Text style={[styles.tabLabel, { color, fontWeight: isFocused ? '700' : '500' }]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {/* Bouton accès groupes — visible uniquement sur l'onglet Planning */}
                        {state.routes[state.index].name === 'PlanningTab' ? (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('GroupSearch')}
                                activeOpacity={0.85}
                                style={[
                                    styles.groupButton,
                                    {
                                        backgroundColor: theme.cardBackground,
                                        borderColor: theme.border,
                                    }
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name="account-search-outline"
                                    size={26}
                                    color={theme.accent ?? theme.primary}
                                />
                            </TouchableOpacity>
                        ) : (
                            /* Placeholder invisible — maintient la largeur de la tab bar sans afficher de contour */
                            <View style={{ width: 65, height: 75 }} />
                        )}
                    </View>
                );
            }}
        </SafeAreaInsetsContext.Consumer>
    );
}

export default function MainTabNavigator() {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    return (
        <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} theme={theme} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen 
                name="PlanningTab" 
                component={PlanningStackScreen} 
                options={{
                    tabBarLabel: Translator.get('MY_PLANNING') || 'Planning',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-month-outline" size={24} color={color} />,
                    headerShown: false
                }}
            />
            <Tab.Screen 
                name="CampusTab" 
                component={CampusDashboard} 
                options={{
                    tabBarLabel: Translator.get('CAMPUS') || 'Campus',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="domain" size={24} color={color} />
                }}
            />
            <Tab.Screen 
                name="ScolariteTab" 
                component={ScolariteDashboard} 
                options={{
                    tabBarLabel: Translator.get('SCOLARITY') || 'Scolarité',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="toolbox-outline" size={24} color={color} />
                }}
            />
            <Tab.Screen 
                name="AutresTab" 
                component={AutresDashboard} 
                options={{
                    tabBarLabel: Translator.get('OTHER') || 'Autres',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={24} color={color} />
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBarWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingHorizontal: tokens.space.md,
        backgroundColor: 'transparent',
    },
    tabBarContainer: {
        flex: 1,
        flexDirection: 'row',
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        height: 75,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        marginRight: tokens.space.xl, // C'est ici qu'on recrée le décalage sur la gauche
    },
    groupButton: {
        width: 65,
        height: 75,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: tokens.space.xs,
    },
    iconContainer: {
        width: 44,
        height: 34,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: tokens.radius.md,
        marginBottom: 2,
    },
    tabLabel: {
        fontSize: 10,
        fontFamily: 'Montserrat_500Medium',
    }
});

const PlanningStack = createStackNavigator();
function PlanningStackScreen() {
    return (
        <PlanningStack.Navigator>
            <PlanningStack.Screen 
                name="ScheduleInternal" 
                component={ScheduleScreen} 
                initialParams={{ name: [] }} 
                options={{ headerShown: false }} // DayView gère son propre header sticky avec safe area
            />
        </PlanningStack.Navigator>
    );
}

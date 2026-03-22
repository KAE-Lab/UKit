import React, { useContext } from 'react';
import { View, ScrollView, Image, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Button from '../ui/Button';
import { MyGroupButton } from './NavHelpers';
import StackNavigator from './StackNavigator';
import style, { tokens } from '../theme/Theme';
import Translator from '../i18n/Translator';
import { SettingsManager } from '../services/AppCore';
import { AppContext } from '../services/AppCore';

const CustomDrawerContentComponent = (props) => {
    const AppContextValues = useContext(AppContext);
    const { navigate } = props.navigation;
    const theme = style.Theme[AppContextValues.themeName];

    const stackState = props.state.routes[0].state;
    // Par défaut, la première page est Home
    const activeRoute = stackState ? stackState.routes[stackState.index] : { name: 'Home' };

    const isRouteActive = (routeName, entrypoint) => {
        if (activeRoute.name !== routeName) return false;
        // Permet de différencier ENT, Mail et Apogée qui utilisent tous WebBrowser
        if (entrypoint && activeRoute.params?.entrypoint !== entrypoint) return false;
        return true;
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ───────────────────────────────────────────── */}
                <View style={{
                    backgroundColor: theme.background,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: tokens.space.md,
                    paddingTop: tokens.space.xl,
                    paddingBottom: tokens.space.lg,
                }}>
                    <Image
                        style={{ width: 110, height: 45, resizeMode: 'contain' }}
                        source={require('../../../assets/icons/logo.png')}
                    />
                    <TouchableOpacity
                        onPress={SettingsManager.switchTheme}
                        style={{
                            width: 40, height: 40, borderRadius: tokens.radius.pill,
                            backgroundColor: theme.greyBackground, justifyContent: 'center', alignItems: 'center',
                        }}>
                        <MaterialCommunityIcons name="theme-light-dark" size={22} color={theme.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── Contenu scrollable ───────────────────────────────── */}
                <ScrollView 
                    style={{ flex: 1, backgroundColor: theme.background }} 
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    overScrollMode="never"
                >
                    {/* Mon groupe */}
                    <View style={{ paddingTop: tokens.space.md }}>
                        <Text style={{
                            color: theme.fontSecondary, fontSize: tokens.fontSize.md, fontWeight: 'bold',
                            paddingTop: tokens.space.xs, paddingBottom: tokens.space.sm, paddingHorizontal: tokens.space.lg,
                        }}>
                            {Translator.get('GROUPS')}
                        </Text>
                        
                        {AppContextValues.groupName ? (
                            <MyGroupButton navigate={navigate} themeName={AppContextValues.themeName} groupName={AppContextValues.groupName} isActive={isRouteActive('Group')} />
                        ) : (
                            <View style={{ paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                                <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.sm }}>
                                    {Translator.get('NONE')}
                                </Text>
                            </View>
                        )}
                        <Button
                            title={Translator.get('GROUPS_LIST')}
                            size={22} textSize={tokens.fontSize.sm} icon={'list'}
                            color={theme.primary} fontColor={theme.font}
                            onPress={() => props.navigation.navigate('Stack', { screen: 'Home' })}
                            isActive={isRouteActive('Home')}
                        />
                    </View>

                    {/* ── CROUS ── */}
                    <Text style={{
                            color: theme.fontSecondary, fontSize: tokens.fontSize.md, fontWeight: 'bold',
                            paddingTop: tokens.space.lg, paddingBottom: tokens.space.sm, paddingHorizontal: tokens.space.lg,
                        }}>
                            {Translator.get('CAMPUS')}
                    </Text>
                    <Button
                        title={Translator.get('RESTAURANTS_U')}
                        size={22} textSize={tokens.fontSize.sm} icon={'restaurant'} 
                        color={theme.primary} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'Crous' })}
                        isActive={isRouteActive('Crous')}
                    />
                    <Button
                        title={Translator.get('LIBRARIES')}
                        size={22} textSize={tokens.fontSize.sm} icon={'local-library'}
                        color={theme.primary} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'Library' })}
                        isActive={isRouteActive('Library')}

                    />
                    
                    {/* Navigation ENT */}
                    <Text style={{
                            color: theme.fontSecondary, fontSize: tokens.fontSize.md, fontWeight: 'bold',
                            paddingTop: tokens.space.lg, paddingBottom: tokens.space.sm, paddingHorizontal: tokens.space.lg,
                        }}>
                            {Translator.get('NAVIGATION')}
                    </Text>
                    <Button
                        title={'ENT'}
                        size={22} textSize={tokens.fontSize.sm} icon={'dashboard'}
                        color={theme.primary} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'WebBrowser', params: { entrypoint: 'ent', title: 'ENT' } })}
                        isActive={isRouteActive('WebBrowser', 'ent')}
                    />
                    <Button
                        title={Translator.get('MAILBOX')}
                        size={22} textSize={tokens.fontSize.sm} icon={'mail-outline'}
                        color={theme.primary} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'WebBrowser', params: { entrypoint: 'email', title: Translator.get('MAILBOX') } })}
                        isActive={isRouteActive('WebBrowser', 'email')}
                    />
                    <Button
                        title={'Apogée'}
                        size={22} textSize={tokens.fontSize.sm} icon={'school'}
                        color={theme.primary} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'WebBrowser', params: { entrypoint: 'apogee', title: 'Apogée' } })}
                        isActive={isRouteActive('WebBrowser', 'apogee')}
                    />
    
                    {/* Application */}
                    <Text style={{
                            color: theme.fontSecondary, fontSize: tokens.fontSize.md, fontWeight: 'bold',
                            paddingTop: tokens.space.lg, paddingBottom: tokens.space.sm, paddingHorizontal: tokens.space.lg,
                        }}>
                            {Translator.get('APPLICATION')}
                    </Text>
                    <Button
                        title={Translator.get('SETTINGS')}
                        size={22} textSize={tokens.fontSize.sm} icon={'settings'}
                        color={theme.primary} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'Settings' })}
                        isActive={isRouteActive('Settings')}
                    />
                    <Button
                        title={Translator.get('ABOUT')}
                        size={22} textSize={tokens.fontSize.sm} icon={'info'}
                        color={theme.primary} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'About' })}
                        isActive={isRouteActive('About')}
                    />

                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const Drawer = createDrawerNavigator();

export default ({ background }) => {
    const customTheme = {
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: background || DefaultTheme.colors.background },
    };

    return (
        <NavigationContainer theme={customTheme}>
            <Drawer.Navigator 
                drawerContent={(props) => <CustomDrawerContentComponent {...props} />} 
                screenOptions={{ headerShown: false, swipeEdgeWidth: 70 }}
                backBehavior="history"
            >
                <Drawer.Screen name="Stack" component={StackNavigator} />
            </Drawer.Navigator>
        </NavigationContainer>
    );
};
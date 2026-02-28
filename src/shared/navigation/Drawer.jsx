import React, { useContext } from 'react';
import { View, ScrollView, Image, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Button from '../ui/Button';
import { MyGroupButton } from './NavHelpers';
import { Split } from '../ui/AppUI';
import StackNavigator from './StackNavigator';
import style, { tokens } from '../theme/Theme';
import Translator from '../i18n/Translator';
import { SettingsManager } from '../services/AppCore';
import { AppContext } from '../services/AppCore';

const CustomDrawerContentComponent = (props) => {
    const AppContextValues = useContext(AppContext);
    const { navigate } = props.navigation;
    const theme = style.Theme[AppContextValues.themeName];

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
                    paddingVertical: tokens.space.lg,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                }}>
                    <Image
                        style={{ width: 140, height: 60, resizeMode: 'contain', tintColor: theme.accent ?? theme.primary }}
                        source={require('../../../assets/icons/app.png')}
                    />
                    <TouchableOpacity
                        onPress={SettingsManager.switchTheme}
                        style={{
                            width: 40, height: 40, borderRadius: tokens.radius.pill,
                            backgroundColor: theme.greyBackground, justifyContent: 'center', alignItems: 'center',
                        }}>
                        <MaterialCommunityIcons name="theme-light-dark" size={22} color={theme.icon} />
                    </TouchableOpacity>
                </View>

                {/* ── Contenu scrollable ───────────────────────────────── */}
                <ScrollView style={{ flex: 1, backgroundColor: theme.background }} showsVerticalScrollIndicator={false}>
                    {/* Mon groupe */}
                    <View style={{ paddingTop: tokens.space.md }}>
                        <Text style={{
                            color: theme.icon, fontSize: tokens.fontSize.md, fontWeight: 'bold',
                            paddingTop: tokens.space.xs, paddingBottom: tokens.space.sm, paddingHorizontal: tokens.space.lg,
                        }}>
                            {Translator.get('GROUPS')}
                        </Text>
                        {AppContextValues.groupName ? (
                            <MyGroupButton navigate={navigate} themeName={AppContextValues.themeName} groupName={AppContextValues.groupName} />
                        ) : (
                            <View style={{ paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm }}>
                                <Text style={{ color: theme.fontSecondary ?? theme.font, fontSize: tokens.fontSize.sm }}>
                                    {Translator.get('NONE')}
                                </Text>
                            </View>
                        )}
                        <Button
                            title={Translator.get('GROUPS_LIST')}
                            size={22} textSize={tokens.fontSize.sm} icon={'list'}
                            color={theme.icon} fontColor={theme.font}
                            onPress={props.navigation.closeDrawer}
                        />
                    </View>
                    
                    {/* Navigation ENT */}
                    <Text style={{
                            color: theme.icon, fontSize: tokens.fontSize.md, fontWeight: 'bold',
                            paddingTop: tokens.space.lg, paddingBottom: tokens.space.sm, paddingHorizontal: tokens.space.lg,
                        }}>
                            {Translator.get('NAVIGATION')}
                        </Text>
                    <Button
                        title={'ENT'}
                        size={22} textSize={tokens.fontSize.sm} icon={'dashboard'}
                        color={theme.icon} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'WebBrowser', params: { entrypoint: 'ent' } })}
                    />
                    <Button
                        title={Translator.get('MAILBOX')}
                        size={22} textSize={tokens.fontSize.sm} icon={'mail-outline'}
                        color={theme.icon} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'WebBrowser', params: { entrypoint: 'email' } })}
                    />
                    <Button
                        title={'Apogée'}
                        size={22} textSize={tokens.fontSize.sm} icon={'school'}
                        color={theme.icon} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'WebBrowser', params: { entrypoint: 'apogee' } })}
                    />

                    {/* ── CROUS ── */}
                    <Text style={{
                            color: theme.icon, fontSize: tokens.fontSize.md, fontWeight: 'bold',
                            paddingTop: tokens.space.lg, paddingBottom: tokens.space.sm, paddingHorizontal: tokens.space.lg,
                        }}>
                            CROUS
                    </Text>
                    <Button
                        title={Translator.get('RESTAURANTS_U')}
                        size={22} textSize={tokens.fontSize.sm} icon={'restaurant'} 
                        color={theme.icon} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'Crous' })}
                    />

                    {/* Application */}
                    <Text style={{
                            color: theme.icon, fontSize: tokens.fontSize.md, fontWeight: 'bold',
                            paddingTop: tokens.space.lg, paddingBottom: tokens.space.sm, paddingHorizontal: tokens.space.lg,
                        }}>
                            {Translator.get('APPLICATION')}
                        </Text>
                    <Button
                        title={Translator.get('SETTINGS')}
                        size={22} textSize={tokens.fontSize.sm} icon={'settings'}
                        color={theme.icon} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'Settings' })}
                    />
                    <Button
                        title={Translator.get('ABOUT')}
                        size={22} textSize={tokens.fontSize.sm} icon={'info'}
                        color={theme.icon} fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'About' })}
                    />

                    <View style={{ height: tokens.space.xl }} />
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
            <Drawer.Navigator drawerContent={(props) => <CustomDrawerContentComponent {...props} />} screenOptions={{ headerShown: false }}>
                <Drawer.Screen name="Stack" component={StackNavigator} />
            </Drawer.Navigator>
        </NavigationContainer>
    );
};
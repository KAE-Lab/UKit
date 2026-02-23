import React, { useContext } from 'react';
import { View, ScrollView, Image, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DrawerButton from '../components/buttons/DrawerButton';
import MyGroupButton from '../components/buttons/MyGroupButton';
import Split from '../components/ui/Split';
import StackNavigator from './StackNavigator';
import style, { tokens } from '../Style';
import Translator from '../utils/translator';
import SettingsManager from '../utils/SettingsManager';
import { AppContext } from '../utils/DeviceUtils';

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
                        source={require('../assets/icons/app.png')}
                    />
                    <TouchableOpacity
                        onPress={SettingsManager.switchTheme}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: tokens.radius.pill,
                            backgroundColor: theme.greyBackground,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        <MaterialCommunityIcons
                            name="theme-light-dark"
                            size={22}
                            color={theme.icon}
                        />
                    </TouchableOpacity>
                </View>

                {/* ── Contenu scrollable ───────────────────────────────── */}
                <ScrollView
                    style={{ flex: 1, backgroundColor: theme.background }}
                    showsVerticalScrollIndicator={false}>

                    {/* Mon groupe */}
                    <View style={{ paddingTop: tokens.space.md }}>
                        <Split
                            title={Translator.get('MY_GROUP')}
                            lineColor={theme.border}
                            color={theme.icon}
                        />
                        {AppContextValues.groupName ? (
                            <MyGroupButton
                                navigate={navigate}
                                themeName={AppContextValues.themeName}
                                groupName={AppContextValues.groupName}
                            />
                        ) : (
                            <View style={{
                                paddingHorizontal: tokens.space.lg,
                                paddingVertical: tokens.space.sm,
                            }}>
                                <Text style={{
                                    color: theme.fontSecondary ?? theme.font,
                                    fontSize: tokens.fontSize.sm,
                                }}>
                                    {Translator.get('NONE')}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Emplois du temps */}
                    <Split
                        title={Translator.get('GROUPS')}
                        lineColor={theme.border}
                        color={theme.icon}
                    />
                    <DrawerButton
                        title={Translator.get('GROUPS')}
                        size={22}
                        textSize={tokens.fontSize.sm}
                        icon={'list'}
                        color={theme.icon}
                        fontColor={theme.font}
                        onPress={props.navigation.closeDrawer}
                    />

                    {/* Navigation ENT */}
                    <Split
                        title={Translator.get('NAVIGATION')}
                        lineColor={theme.border}
                        color={theme.icon}
                    />
                    <DrawerButton
                        title={'ENT'}
                        size={22}
                        textSize={tokens.fontSize.sm}
                        icon={'dashboard'}
                        color={theme.icon}
                        fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', {
                            screen: 'WebBrowser',
                            params: { entrypoint: 'ent' },
                        })}
                    />
                    <DrawerButton
                        title={Translator.get('MAILBOX')}
                        size={22}
                        textSize={tokens.fontSize.sm}
                        icon={'mail-outline'}
                        color={theme.icon}
                        fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', {
                            screen: 'WebBrowser',
                            params: { entrypoint: 'email' },
                        })}
                    />
                    <DrawerButton
                        title={'Apogée'}
                        size={22}
                        textSize={tokens.fontSize.sm}
                        icon={'school'}
                        color={theme.icon}
                        fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', {
                            screen: 'WebBrowser',
                            params: { entrypoint: 'apogee' },
                        })}
                    />

                    {/* Application */}
                    <Split
                        title={Translator.get('APPLICATION')}
                        lineColor={theme.border}
                        color={theme.icon}
                    />
                    <DrawerButton
                        title={Translator.get('SETTINGS')}
                        size={22}
                        textSize={tokens.fontSize.sm}
                        icon={'settings'}
                        color={theme.icon}
                        fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'Settings' })}
                    />
                    <DrawerButton
                        title={Translator.get('ABOUT')}
                        size={22}
                        textSize={tokens.fontSize.sm}
                        icon={'info'}
                        color={theme.icon}
                        fontColor={theme.font}
                        onPress={() => props.navigation.navigate('Stack', { screen: 'About' })}
                    />

                    {/* Espace en bas */}
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
        colors: {
            ...DefaultTheme.colors,
            background: background || DefaultTheme.colors.background,
        },
    };

    return (
        <NavigationContainer theme={customTheme}>
            <Drawer.Navigator
                drawerContent={(props) => <CustomDrawerContentComponent {...props} />}
                screenOptions={{ headerShown: false }}>
                <Drawer.Screen name="Stack" component={StackNavigator} />
            </Drawer.Navigator>
        </NavigationContainer>
    );
};
import React, { useRef, useEffect, useContext } from 'react';
import { Animated, Switch, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { AppContext } from '../services/AppCore';
import style, { tokens, StyleWelcome } from '../theme/Theme';

// ── Bouton de Retour ───────────────────────────────────────────
export const BackButton = ({ backAction }) => {
    const AppContextValues = useContext(AppContext);
    const theme = style.Theme[AppContextValues.themeName];

    const _onPress = () => {
        requestAnimationFrame(() => backAction());
    };
    return (
        <GHTouchableOpacity onPress={_onPress} style={[style.backButton, { paddingLeft: tokens.space.md }]}>
            <View style={{ backgroundColor: theme.primary, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.md, flexShrink: 0 }}>
                <Ionicons
                    name="arrow-back"
                    size={22}
                    color="#FFFFFF"
                />
            </View>
        </GHTouchableOpacity>
    );
};

// ── Bouton d'Onboarding ────────────────────────────────────────
export const WelcomeButton = ({ onPress, buttonText, theme }) => {
    return (
        <TouchableOpacity onPress={onPress} style={StyleWelcome[theme].buttonContainer}>
            <Text style={StyleWelcome[theme].buttonText}>{buttonText}</Text>
            <MaterialIcons
                name={'chevron-right'}
                size={32}
                color={StyleWelcome[theme].welcomeButtonIconColor}
                style={{ position: 'absolute', alignSelf: 'center', right: 8 }}
            />
        </TouchableOpacity>
    );
};

// ── Bouton du Menu (Drawer) ────────────────────────────────────
export const DrawerButton = (props) => {
    const AppContextValues = useContext(AppContext);
    const theme = style.Theme[AppContextValues.themeName];

    let icon = props.icon ? (
        <MaterialIcons name={props.icon} size={props.size} style={{ color: props.color }} />
    ) : (
        <View />
    );

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: tokens.space.md,
                paddingVertical: 3,
                marginHorizontal: tokens.space.sm,
                marginVertical: tokens.space.xs,
                borderRadius: tokens.radius.md,
                backgroundColor: props.isActive || pressed ? theme.greyBackground : 'transparent'
            })}>
            <View style={{
                width: 36,
                height: 36,
                borderRadius: tokens.radius.md,
                backgroundColor: theme.greyBackground,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                {icon}
            </View>
            <Text style={{
                fontSize: props.textSize ?? tokens.fontSize.md,
                color: props.isActive ? theme.primary : props.fontColor,
                marginLeft: tokens.space.md,
                fontWeight: tokens.fontWeight.medium,
                flex: 1,
            }}>
                {props.title}
            </Text>
        </Pressable>
    );
};

// ── Bouton des Paramètres ──────────────────────────────────────
export const SettingsButton = ({ theme, onPress, leftIcon, leftIconAnimation, leftText, rightText, disabled, switchValue, onSwitchToggle }) => {
    const rotatingAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (leftIconAnimation === 'rotate') {
            Animated.loop(
                Animated.timing(rotatingAnimation, {
                    duration: 1000,
                    toValue: 360,
                    useNativeDriver: true,
                }),
            ).start();
        } else {
            Animated.timing(rotatingAnimation).stop();
            rotatingAnimation.setValue(0);
        }
    }, [leftIconAnimation]);

    const rotate = rotatingAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (!theme?.button) return null;

    const isMaterialIcon = ['settings', 'language', 'filter-list', 'sync-disabled'].includes(leftIcon);
    const IconComponent = isMaterialIcon ? MaterialIcons : MaterialCommunityIcons;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[theme.button, { flexDirection: 'row', alignItems: 'center' }, disabled && { opacity: 0.5}]}>
            {leftIcon && (
                <Animated.View style={{ transform: leftIconAnimation ? [{ rotate }] : [] }}>
                    <IconComponent name={leftIcon} size={24} style={theme.leftIcon} />
                </Animated.View>
            )}
            <Text style={[theme.buttonMainText, { flex: 1 }]}>{leftText}</Text>
            {onSwitchToggle !== undefined ? (
                <Switch
                    style={{ marginLeft: 'auto', marginRight: theme.leftIcon?.marginLeft }}
                    trackColor={theme.switchTrack}
                    thumbColor={'#FFFFFF'}
                    value={switchValue}
                    onValueChange={onSwitchToggle}
                />
            ) : (
                <Text style={theme.buttonSecondaryText}>{rightText}</Text>
            )}
            {!onSwitchToggle && (
                <MaterialCommunityIcons name="chevron-right" size={22} style={theme.rightIcon} />
            )}
        </TouchableOpacity>
    );
};

// ── COMPOSANT UNIVERSEL ─────────────────────────────────
export default function Button(props) {
    if (props.backAction) return <BackButton {...props} />;
    if (props.buttonText) return <WelcomeButton {...props} />;
    if (props.title) return <DrawerButton {...props} />;
    return <SettingsButton {...props} />;
}
import React, { useRef, useEffect, useContext } from 'react';
import { Animated, Switch, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { AppContext } from '../services/AppCore';
import style, { tokens, StyleWelcome, AppThemeType } from '../theme/Theme';
import { UnifiedTouchable } from './UnifiedTouchable';

// ── Bouton de Retour ───────────────────────────────────────────
export interface BackButtonProps {
    backAction: () => void;
}
export const BackButton = ({ backAction }: BackButtonProps) => {
    const AppContextValues = useContext(AppContext);
    const theme = style.Theme[AppContextValues.themeName];

    const _onPress = () => {
        requestAnimationFrame(() => backAction());
    };
    return (
        <GHTouchableOpacity onPress={_onPress} style={[style.backButton as never, { paddingLeft: tokens.space.md }]}>
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
export interface WelcomeButtonProps {
    onPress?: () => void;
    buttonText?: string;
    theme?: 'light' | 'dark';
}
export const WelcomeButton = ({ onPress, buttonText, theme = 'light' }: WelcomeButtonProps) => {
    return (
        <UnifiedTouchable onPress={onPress} style={StyleWelcome[theme].buttonContainer as any}>
            <Text style={StyleWelcome[theme].buttonText as any}>{buttonText}</Text>
            <MaterialIcons
                name={'chevron-right'}
                size={32}
                color={StyleWelcome[theme].welcomeButtonIconColor}
                style={{ position: 'absolute', alignSelf: 'center', right: 8 }}
            />
        </UnifiedTouchable>
    );
};

// ── Bouton du Menu (Drawer) ────────────────────────────────────
export interface DrawerButtonProps {
    title?: string;
    icon?: keyof typeof MaterialIcons.glyphMap;
    size?: number;
    color?: string;
    onPress?: () => void;
    isActive?: boolean;
    textSize?: number;
    fontColor?: string;
}
export const DrawerButton = (props: DrawerButtonProps) => {
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
export interface SettingsButtonProps {
    theme?: AppThemeType['settings'];
    onPress?: () => void;
    leftIcon?: keyof typeof MaterialIcons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
    leftIconAnimation?: string;
    leftText?: string;
    rightText?: string;
    disabled?: boolean;
    switchValue?: boolean;
    onSwitchToggle?: (value: boolean) => void;
}
export const SettingsButton = ({ theme, onPress, leftIcon, leftIconAnimation, leftText, rightText, disabled, switchValue, onSwitchToggle }: SettingsButtonProps) => {
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
            rotatingAnimation.stopAnimation();
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
        <UnifiedTouchable
            onPress={onPress}
            disabled={disabled}
            style={[theme.button, { flexDirection: 'row', alignItems: 'center' }, disabled && { opacity: 0.5}] as any}>
            {leftIcon && (
                <Animated.View style={{ transform: leftIconAnimation ? [{ rotate }] : [] }}>
                    <IconComponent name={leftIcon as never} size={24} style={theme.leftIcon as import('react-native').TextStyle} />
                </Animated.View>
            )}
            <Text style={[theme.buttonMainText, { flex: 1 }] as any}>{leftText}</Text>
            {onSwitchToggle !== undefined ? (
                <Switch
                    style={{ marginLeft: 'auto', marginRight: theme.leftIcon?.marginLeft }}
                    trackColor={theme.switchTrack}
                    thumbColor={'#FFFFFF'}
                    value={switchValue}
                    onValueChange={onSwitchToggle}
                />
            ) : (
                <Text style={theme.buttonSecondaryText as import('react-native').TextStyle}>{rightText}</Text>
            )}
            {!onSwitchToggle && (
                <MaterialCommunityIcons name="chevron-right" size={22} style={theme.rightIcon as import('react-native').TextStyle} />
            )}
        </UnifiedTouchable>
    );
};

// ── COMPOSANT UNIVERSEL ─────────────────────────────────
export type ButtonProps = Partial<Omit<WelcomeButtonProps, 'theme'> & Omit<SettingsButtonProps, 'theme'> & BackButtonProps & DrawerButtonProps> & {
    theme?: AppThemeType['settings'] | 'light' | 'dark';
};

export default function Button(props: ButtonProps) {
    if (props.backAction) return <BackButton {...props as BackButtonProps} />;
    if (props.buttonText) return <WelcomeButton {...props as WelcomeButtonProps} />;
    if (props.title) return <DrawerButton {...props as DrawerButtonProps} />;
    return <SettingsButton {...props as SettingsButtonProps} />;
}
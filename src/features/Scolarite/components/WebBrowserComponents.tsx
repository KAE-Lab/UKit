import React from 'react';
import { View, TouchableOpacity, Modal, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Translator from '../../../shared/i18n/Translator';
import { tokens } from '../../../shared/theme/Theme';

interface FloatingActionBarProps {
    theme: import('../../../shared/theme/Theme').AppThemeType;
    insets: import('react-native-safe-area-context').EdgeInsets | null;
    onBack: () => void;
    onForward: () => void;
    onRefresh: () => void;
    openURL: () => void;
    onQuit: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
    loading: boolean;
}

export const FloatingActionBar = ({ theme, insets, onBack, onForward, onRefresh, openURL, onQuit, canGoBack, canGoForward, loading }: FloatingActionBarProps) => {
    const buttonContainerWidth = 290;
    const translateX = useSharedValue(0);

    const context = useSharedValue({ startX: 0 });
    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { startX: translateX.value };
        })
        .onUpdate((e) => {
            let nextX = context.value.startX + e.translationX;
            nextX = Math.max(0, Math.min(nextX, buttonContainerWidth));
            translateX.value = nextX;
        })
        .onEnd((e) => {
            if (e.velocityX > 500 || translateX.value > buttonContainerWidth / 2) {
                translateX.value = withTiming(buttonContainerWidth, { duration: 250 });
            } else {
                translateX.value = withTiming(0, { duration: 250 });
            }
        });

    const toggleOpen = () => {
        if (translateX.value > 0) {
            translateX.value = withTiming(0, { duration: 250 });
        } else {
            translateX.value = withTiming(buttonContainerWidth, { duration: 250 });
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }]
        };
    });

    const chevronStyle = useAnimatedStyle(() => {
        const rotate = (buttonContainerWidth - translateX.value) / buttonContainerWidth * 180;
        return {
            transform: [{ rotate: `${rotate}deg` }]
        };
    });

    interface NavButtonProps {
        onPress: () => void;
        disabled?: boolean;
        iconName: React.ComponentProps<typeof MaterialIcons>['name'] | React.ComponentProps<typeof MaterialCommunityIcons>['name'] | string;
        iconLib?: 'material' | 'community';
        size?: number;
        colorOverride?: string;
    }

    const NavButton = ({ onPress, disabled, iconName, iconLib = 'material', size = 24, colorOverride }: NavButtonProps) => {
        const color = disabled ? theme.primary + '44' : (colorOverride || theme.primary);
        const Icon = iconLib === 'community' ? MaterialCommunityIcons : MaterialIcons;

        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled}
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: tokens.radius.md,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginHorizontal: 5,
                    backgroundColor: disabled ? 'transparent' : `${color}15`,
                }}>
                <Icon name={iconName as never} size={size} color={color} />
            </TouchableOpacity>
        );
    };

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[
                styles.floatingBar,
                {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                    bottom: Math.max(tokens.space.sm, (insets?.bottom || 0) - 15)
                },
                animatedStyle
            ]}>
                <TouchableOpacity onPress={toggleOpen} style={styles.handle}>
                    <Animated.View style={chevronStyle}>
                        <MaterialCommunityIcons name="chevron-left" size={28} color={theme.fontSecondary} />
                    </Animated.View>
                </TouchableOpacity>

                <View style={styles.buttonsContainer}>
                    <NavButton onPress={onQuit} iconName="door-open" iconLib="community" size={26} colorOverride="#EF5350" />
                    <NavButton onPress={onBack} disabled={!canGoBack} iconName="navigate-before" size={28} />
                    <NavButton onPress={onForward} disabled={!canGoForward} iconName="navigate-next" size={28} />
                    <NavButton onPress={onRefresh} disabled={loading} iconName="refresh" size={24} />
                    <NavButton onPress={openURL} iconName={Platform.OS === 'ios' ? 'apple-safari' : 'google-chrome'} iconLib="community" size={22} />
                </View>
            </Animated.View>
        </GestureDetector>
    );
};

export const SaveCredentialsModal = ({ theme, visible, onClose, onSave }: { theme: import('../../../shared/theme/Theme').AppThemeType; visible: boolean; onClose: () => void; onSave: () => void; }) => (
    <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
    >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.lg, borderRadius: tokens.radius.lg, width: '85%', alignItems: 'center', ...tokens.shadow.lg }}>
                <MaterialCommunityIcons name="shield-check" size={48} color={theme.primary} style={{ marginBottom: tokens.space.md }} />
                <Text style={{ fontSize: tokens.fontSize.md, color: theme.font, textAlign: 'center', marginBottom: tokens.space.lg, fontFamily: 'Montserrat_500Medium' }}>
                    {Translator.get('SAVE_CREDENTIALS_PROMPT')}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <TouchableOpacity
                        style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: theme.background, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, borderWidth: 1, borderColor: theme.border }}
                        onPress={onClose}
                    >
                        <Text style={{ color: theme.fontSecondary, fontWeight: 'bold' }}>{Translator.get('NO')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: theme.primary, borderRadius: tokens.radius.md, marginLeft: tokens.space.sm }}
                        onPress={onSave}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{Translator.get('YES')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

export const getCASInjectedScript = (savedCredentials: { username?: string; password?: string } | null) => {
    return `
        (function() {
            if (!window.location.href.includes('cas.u-bordeaux.fr/cas/login')) return;

            let attempts = 0;
            const checkInterval = setInterval(function() {
                attempts++;
                if (attempts > 50) { clearInterval(checkInterval); return; }

                const usernameInput = document.getElementById('username');
                const passwordInput = document.getElementById('password');
                const form = document.getElementById('fm1');

                if (usernameInput && passwordInput && form) {
                    clearInterval(checkInterval);
                    const errorElement = document.querySelector('.alert-danger') || document.querySelector('#msg.errors') || document.querySelector('.errors');

                    if (!errorElement && '${savedCredentials?.username || ''}' !== '') {
                        usernameInput.value = '${savedCredentials?.username || ''}';
                        passwordInput.value = '${savedCredentials?.password || ''}';
                        const submitBtn = document.querySelector('input[name="submit"], button[name="submit"], input[type="submit"], button[type="submit"], .btn-submit');
                        if (submitBtn) {
                            submitBtn.click();
                        } else {
                            form.submit();
                        }
                    } else {
                        form.addEventListener('submit', function(e) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'CAS_CREDENTIALS',
                                username: usernameInput.value,
                                password: passwordInput.value
                            }));
                        });
                    }
                }
            }, 100);
        })();
        true;
    `;
};

const styles = StyleSheet.create({
    floatingBar: {
        position: 'absolute',
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopLeftRadius: tokens.radius.md,
        borderBottomLeftRadius: tokens.radius.md,
        borderWidth: 1,
        borderRightWidth: 0,
        height: 75,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        paddingLeft: tokens.space.xs,
    },
    handle: {
        paddingHorizontal: tokens.space.xs,
        paddingVertical: tokens.space.sm,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: tokens.space.sm,
        height: '100%',
    }
});

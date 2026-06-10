import React from 'react';
import { Pressable, Platform, StyleProp, ViewStyle, PressableProps } from 'react-native';

export interface UnifiedTouchableProps extends PressableProps {
    onPress?: () => void;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    themeObj?: any; // To get primary color for the ripple effect on Android
    activeOpacity?: number; // Kept for compatibility with legacy TouchableOpacity props
    children?: React.ReactNode;
}

export const UnifiedTouchable = ({ onPress, style, children, disabled, themeObj, ...props }: UnifiedTouchableProps) => {
    return (
        <Pressable 
            onPress={onPress} 
            disabled={disabled}
            style={({ pressed }) => [
                style, 
                Platform.select({ ios: pressed && { opacity: 0.7 }, default: undefined })
            ]}
            android_ripple={themeObj && themeObj.primary ? { color: themeObj.primary + '33' } : { color: 'rgba(0, 0, 0, 0.1)' }}
            {...props}
        >
            {children}
        </Pressable>
    );
};

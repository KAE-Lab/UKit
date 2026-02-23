import React, { useRef } from 'react';
import { Animated, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

export default ({ theme, onPress, leftIcon, leftIconAnimation, leftText, rightText, disabled, switchValue, onSwitchToggle }) => {
	const rotatingAnimation = useRef(new Animated.Value(0)).current;

	React.useEffect(() => {
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
            style={[theme.button, disabled && { opacity: 0.5 }]}>

            {/* Icône gauche */}
            {leftIcon && (
                <Animated.View style={{ transform: leftIconAnimation ? [{ rotate }] : [] }}>
                    <IconComponent
                        name={leftIcon}
                        size={24}
                        style={theme.leftIcon}
                    />
                </Animated.View>
            )}

            {/* Texte principal */}
            <Text style={theme.buttonMainText}>{leftText}</Text>

            {/* Switch ou texte secondaire */}
            {onSwitchToggle !== undefined ? (
                <Switch
                    style={{ marginLeft: 'auto', marginRight: theme.leftIcon?.marginLeft }}
                    trackColor={theme.switchTrack}
                    value={switchValue}
                    onValueChange={onSwitchToggle}
                />
            ) : (
                <Text style={theme.buttonSecondaryText}>{rightText}</Text>
            )}

            {/* Chevron droit */}
            {!onSwitchToggle && (
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    style={theme.rightIcon}
                />
            )}
        </TouchableOpacity>
    );
};

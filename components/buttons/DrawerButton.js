import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { tokens } from '../../Style';

export default (props) => {
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
                paddingVertical: tokens.space.sm,
                marginHorizontal: tokens.space.sm,
                marginVertical: tokens.space.xs,
                borderRadius: tokens.radius.md,
                backgroundColor: pressed ? props.pressedColor ?? 'transparent' : 'transparent'
			})}>
			<View style={{
                width: 36,
                height: 36,
                borderRadius: tokens.radius.sm,
                backgroundColor: props.iconBackground ?? `${props.color}18`,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                {icon}
            </View>
            
            <Text style={{
                fontSize: props.textSize ?? tokens.fontSize.md,
                color: props.fontColor,
                marginLeft: tokens.space.md,
                fontWeight: tokens.fontWeight.medium,
                flex: 1,
            }}>
                {props.title}
            </Text>
		</Pressable>
	);
};

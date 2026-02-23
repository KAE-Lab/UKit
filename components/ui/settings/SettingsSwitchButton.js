import React from 'react';
import { Text, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default ({ theme, leftIcon, leftText, switchOnValueChange, switchValue }) => {

	const isMaterialIcon = ['settings', 'language', 'filter-list', 'sync-disabled'].includes(leftIcon);
	const IconComponent = isMaterialIcon ? MaterialIcons : MaterialCommunityIcons;
	return (
		<TouchableOpacity onPress={switchOnValueChange} style={theme.button}>
			<IconComponent name={leftIcon} size={24} style={theme.leftIcon} />
			<Text style={theme.buttonMainText}>{leftText}</Text>
			<Switch
				onValueChange={switchOnValueChange}
				value={switchValue}
				style={{
					alignSelf: 'center',
					marginLeft: 'auto',
					marginRight: 8,
				}}
				trackColor={theme.switchTrack}
				ios_backgroundColor={theme.switchTrack.false}
			/>
		</TouchableOpacity>
	);
};

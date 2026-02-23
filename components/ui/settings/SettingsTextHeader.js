import React from 'react';
import { Text } from 'react-native';

export default ({ theme, text }) => {
	if (!theme?.separationText) return null;

	return (
		<Text style={theme.separationText}>
			{text.toUpperCase()}
		</Text>
	);
};

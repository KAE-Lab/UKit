import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { tokens } from '../../Style';

export default class URLButton extends React.PureComponent {
    openURL() {
        Linking.canOpenURL(this.props.url)
            .then((supported) => {
                if (!supported) {
                    console.warn("Can't handle url: " + this.props.url);
                } else {
                    return Linking.openURL(this.props.url);
                }
            })
            .catch((err) => console.error('An error occurred', err));
    }

    render() {
        const { theme } = this.props;

        return (
            <TouchableOpacity
                onPress={() => this.openURL()}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: tokens.space.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                }}>
                <MaterialCommunityIcons
                    name="open-in-new"
                    size={16}
                    color={theme.link}
                    style={{ marginRight: tokens.space.sm }}
                />
                <Text style={{
                    color: theme.link,
                    fontSize: tokens.fontSize.sm,
                    flex: 1,
                }}>
                    {this.props.title}
                </Text>
                <Text style={{
                    color: theme.fontSecondary,
                    fontSize: tokens.fontSize.xs,
                    flex: 1,
                }}
                numberOfLines={1}
                ellipsizeMode="tail">
                    {this.props.url}
                </Text>
            </TouchableOpacity>
        );
    }
}
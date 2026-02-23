import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import PropTypes from 'prop-types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens } from '../Style';

export default class GroupRow extends React.PureComponent {
    static propTypes = {
        cleanName: PropTypes.string.isRequired,
        color: PropTypes.string,
        fontColor: PropTypes.string,
        name: PropTypes.string.isRequired,
        sectionStyle: PropTypes.object,
        openGroup: PropTypes.func.isRequired,
    };

    _onPress = () => {
        requestAnimationFrame(() => {
            this.props.openGroup(this.props.name);
        });
    };

    render() {
        return (
            <TouchableOpacity
                onPress={this._onPress}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: tokens.space.md,
                    paddingVertical: tokens.space.md,
                    backgroundColor: this.props.color,
                    borderBottomWidth: 1,
                    borderBottomColor: `${this.props.color}44`,
                }}>
                {/* Pastille colorée */}
                <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: tokens.radius.pill,
                    backgroundColor: this.props.fontColor,
                    opacity: 0.5,
                    marginRight: tokens.space.md,
                }} />

                {/* Nom du groupe */}
                <Text style={{
                    flex: 1,
                    color: this.props.fontColor,
                    fontSize: tokens.fontSize.md,
                    fontWeight: tokens.fontWeight.medium,
                }}>
                    {this.props.cleanName}
                </Text>

                {/* Flèche */}
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={this.props.fontColor}
                    style={{ opacity: 0.6 }}
                />
            </TouchableOpacity>
        );
    }
}
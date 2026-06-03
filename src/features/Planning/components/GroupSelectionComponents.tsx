import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

import style, { tokens } from '../../../shared/theme/Theme';

export interface SectionListHeaderProps {
    color: string;
    headerColor: string;
    sectionIndex: number;
    title: string;
}

export class SectionListHeader extends React.PureComponent<SectionListHeaderProps> {
    static propTypes = {
        color: PropTypes.string,
        headerColor: PropTypes.string,
        sectionIndex: PropTypes.number.isRequired,
        title: PropTypes.string,
    };

    getBackgroundSectionStyle() {
        let indexStyle = this.props.sectionIndex % style.list.sectionHeaders.length;
        return style.list.sections[indexStyle];
    }

    getSectionStyle() {
        let indexStyle = this.props.sectionIndex % style.list.sectionHeaders.length;
        return style.list.sectionHeaders[indexStyle];
    }

    render() {
        return (
            <View style={[
                this.getBackgroundSectionStyle(),
                {
                    backgroundColor: this.props.color,
                    paddingHorizontal: tokens.space.md,
                    paddingVertical: tokens.space.xs,
                },
            ]}>
                <View style={[
                    (style.list.sectionHeaderView as never),
                    this.getSectionStyle(),
                    {
                        backgroundColor: this.props.headerColor,
                        borderRadius: tokens.radius.md,
                        paddingHorizontal: tokens.space.md,
                        paddingVertical: tokens.space.sm,
                        ...tokens.shadow.sm,
                    },
                ]}>
                    <Text style={[
                        style.list.sectionHeaderTitle,
                        {
                            fontSize: tokens.fontSize.sm,
                            fontWeight: tokens.fontWeight.bold,
                            letterSpacing: 0.5,
                            color: '#FFFFFF',
                        },
                    ]}>
                        {this.props.title}
                    </Text>
                </View>
            </View>
        );
    }
}

export interface GroupRowProps {
    cleanName: string;
    color: string;
    fontColor: string;
    name: string;
    sectionStyle: Record<string, unknown>;
    openGroup: (name: string) => void;
}

export class GroupRow extends React.PureComponent<GroupRowProps> {
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
                <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: tokens.radius.md,
                    backgroundColor: this.props.fontColor,
                    opacity: 0.5,
                    marginRight: tokens.space.md,
                }} />
                <Text style={{
                    flex: 1,
                    color: this.props.fontColor,
                    fontSize: tokens.fontSize.md,
                    fontWeight: tokens.fontWeight.medium,
                }}>
                    {this.props.cleanName}
                </Text>
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

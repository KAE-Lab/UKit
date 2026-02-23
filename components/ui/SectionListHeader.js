import React from 'react';
import { Text, View } from 'react-native';
import PropTypes from 'prop-types';
import { tokens } from '../../Style';
import style from '../../Style';

export default class SectionListHeader extends React.PureComponent {
    static propTypes = {
        color: PropTypes.string,
        headerColor: PropTypes.string,
        sectionIndex: PropTypes.number.isRequired,
        title: PropTypes.string,
    };

    constructor(props) {
        super(props);
    }

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
                    style.list.sectionHeaderView,
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

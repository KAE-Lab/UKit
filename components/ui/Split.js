import React from 'react';
import { Text, View } from 'react-native';
import PropTypes from 'prop-types';
import { tokens } from '../../Style'

export default class Split extends React.PureComponent {
    static propTypes = {
        title: PropTypes.string,
        color: PropTypes.string,
        lineColor: PropTypes.string,
        noMargin: PropTypes.bool,
        onlyBottomMargin: PropTypes.bool,
    };

    constructor(props) {
        super(props);
    }

    render() {
        const { noMargin, onlyBottomMargin, lineColor, title, color } = this.props;

        return (
            <View style={{
                marginTop: noMargin || onlyBottomMargin ? 0 : tokens.space.md,
                marginBotton: noMargin ? 0 : tokens.space.xs,
            }}>
                <View style={{
                    borderBottomWidth: 1,
                    borderColor: lineColor ?? '#E0E4EA',
                }} />
                {title && (
                    <Text style={{
                        color: color,
                        paddingLeft: tokens.space.md,
                        paddingTop: tokens.space.sm,
                        fontSize: tokens.fontSize.xs,
                        fontWeight: tokens.fontWeight.semibold,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        opacity: 0.7,
                    }}>
                        {title}
                    </Text>
                )}
            </View>
        );
    }
}

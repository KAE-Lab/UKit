import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import PropTypes from 'prop-types';
import moment from 'moment';

import { tokens } from '../Style';

class CalendarDay extends React.Component {
    static propTypes = {
        currentDay: PropTypes.instanceOf(moment),
        item: PropTypes.instanceOf(moment),
        onPressItem: PropTypes.func,
        selectedDay: PropTypes.instanceOf(moment),
        theme: PropTypes.object,
    };

    _onPress = () => {
        if (this.props.onPressItem) {
            requestAnimationFrame(() => {
                this.props.onPressItem(this.props.item);
            });
        }
    };

    static getBackgroundColor(props) {
        return props.item.isSame(props.selectedDay, 'day')
            ? props.theme.calendar.selection
            : props.item.isSame(props.currentDay, 'day')
            ? props.theme.calendar.currentDay
            : props.item.day() === 0
            ? props.theme.calendar.sunday
            : 'transparent';
    }

    static isSelected(props) {
        return props.item.isSame(props.selectedDay, 'day');
    }

    shouldComponentUpdate(nextProps) {
        return (
            CalendarDay.getBackgroundColor(nextProps) !==
            CalendarDay.getBackgroundColor(this.props)
        );
    }

    render() {
        const { theme } = this.props;
        const selected = CalendarDay.isSelected(this.props);
        const bgColor  = CalendarDay.getBackgroundColor(this.props);
        const color    = selected ? theme.lightFont : theme.font;

        return (
            <TouchableOpacity
                onPress={this._onPress}
                style={{
                    width: 64,
                    height: 64,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: tokens.radius.md,
                    backgroundColor: bgColor,
                    // Indicateur sélection
                    borderBottomWidth: selected ? 3 : 0,
                    borderBottomColor: selected ? theme.primary : 'transparent',
                }}>
                <Text style={{
                    textAlign: 'center',
                    fontSize: tokens.fontSize.xl,
                    fontWeight: selected
                        ? tokens.fontWeight.bold
                        : tokens.fontWeight.regular,
                    color,
                    marginBottom: tokens.space.xs,
                }}>
                    {this.props.item.date()}
                </Text>
                <Text style={{
                    textAlign: 'center',
                    fontSize: tokens.fontSize.xs,
                    fontWeight: tokens.fontWeight.medium,
                    color,
                    opacity: selected ? 1 : 0.6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                }}>
                    {this.props.item.format('ddd')}
                </Text>
            </TouchableOpacity>
        );
    }
}

export default CalendarDay;
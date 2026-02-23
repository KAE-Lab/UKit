import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { tokens } from '../Style';

class CalendarWeek extends React.Component {
    _onPress = () => {
        if (this.props.onPressItem) {
            requestAnimationFrame(() => {
                this.props.onPressItem(this.props.week);
            });
        }
    };

    static getBackgroundColor(props) {
        return props.week.week === props.selectedWeek.week &&
            props.week.year === props.selectedWeek.year
            ? props.theme.calendar.selection
            : props.week.week === props.currentWeek.week &&
              props.week.year === props.currentWeek.year
            ? props.theme.calendar.currentDay
            : 'transparent';
    }

    static isSelected(props) {
        return (
            props.week.week === props.selectedWeek.week &&
            props.week.year === props.selectedWeek.year
        );
    }

    shouldComponentUpdate(nextProps) {
        return (
            CalendarWeek.getBackgroundColor(nextProps) !==
            CalendarWeek.getBackgroundColor(this.props)
        );
    }

    render() {
        const { theme } = this.props;
        const selected = CalendarWeek.isSelected(this.props);
        const bgColor  = CalendarWeek.getBackgroundColor(this.props);
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
                {/* Numéro de semaine */}
                <Text style={{
                    textAlign: 'center',
                    fontSize: tokens.fontSize.xl,
                    fontWeight: selected
                        ? tokens.fontWeight.bold
                        : tokens.fontWeight.regular,
                    color,
                    marginBottom: tokens.space.xs,
                }}>
                    {this.props.week.week}
                </Text>
                {/* Label "S.XX" */}
                <Text style={{
                    textAlign: 'center',
                    fontSize: tokens.fontSize.xs,
                    fontWeight: tokens.fontWeight.medium,
                    color,
                    opacity: selected ? 1 : 0.6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                }}>
                    {`S.${this.props.week.week}`}
                </Text>
            </TouchableOpacity>
        );
    }
}

export default CalendarWeek;
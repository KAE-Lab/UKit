import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

import * as Haptics from 'expo-haptics';

import { CaseDuRuban } from './CaseDuRuban';

export interface CalendarDayProps {
    currentDay: moment.Moment;
    item: moment.Moment;
    onPressItem?: (item: moment.Moment) => void;
    selectedDay: moment.Moment;
    theme: import('../../../shared/theme/Theme').AppThemeType;
}

class CalendarDay extends React.Component<CalendarDayProps> {
    static propTypes = {
        currentDay: PropTypes.instanceOf(moment),
        item: PropTypes.instanceOf(moment),
        onPressItem: PropTypes.func,
        selectedDay: PropTypes.instanceOf(moment),
        theme: PropTypes.object,
    };

    _onPress = () => {
        // Le choix d'un jour s'acquitte au doigt, comme un interrupteur (docs/theme.md, 7-J).
        void Haptics.selectionAsync().catch(() => undefined);
        if (this.props.onPressItem) {
            requestAnimationFrame(() => {
                this.props.onPressItem(this.props.item);
            });
        }
    };

    /** Ce qui change l'apparence d'une case hors de la selection : le jour courant et le theme. */
    static apparence(props: CalendarDayProps) {
        return `${props.item.isSame(props.currentDay, 'day')}-${props.theme.accent}`;
    }

    static isSelected(props: CalendarDayProps) {
        return props.item.isSame(props.selectedDay, 'day');
    }

    shouldComponentUpdate(nextProps: CalendarDayProps) {
        return (
            CalendarDay.apparence(nextProps) !== CalendarDay.apparence(this.props) ||
            CalendarDay.isSelected(nextProps) !== CalendarDay.isSelected(this.props)
        );
    }

    render() {
        return (
            <CaseDuRuban
                theme={this.props.theme}
                haut={this.props.item.date()}
                bas={this.props.item.format('ddd')}
                choisie={CalendarDay.isSelected(this.props)}
                courante={this.props.item.isSame(this.props.currentDay, 'day')}
                estompee={this.props.item.day() === 0}
                onPress={this._onPress}
                accessibilityLabel={this.props.item.format('dddd D MMMM')}
            />
        );
    }
}

export default CalendarDay;
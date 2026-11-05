import React from 'react';
import * as Haptics from 'expo-haptics';
import moment from 'moment';

import Translator from '../../../shared/i18n/Translator';
import { CaseDuRuban } from '../../../shared/ui/CaseDuRuban';

export interface CalendarWeekProps {
    currentWeek: { week: number; year: number };
    week: { week: number; year: number };
    onPressItem?: (week: { week: number; year: number }) => void;
    selectedWeek: { week: number; year: number };
    theme: import('../../../shared/theme/Theme').AppThemeType;
}

class CalendarWeek extends React.Component<CalendarWeekProps> {
    _onPress = () => {
        void Haptics.selectionAsync().catch(() => undefined);
        if (this.props.onPressItem) {
            requestAnimationFrame(() => {
                this.props.onPressItem(this.props.week);
            });
        }
    };

    /** Ce qui change l'apparence d'une case hors de la selection : la semaine courante et le theme. */
    static apparence(props: CalendarWeekProps) {
        return `${props.week.week === props.currentWeek.week && props.week.year === props.currentWeek.year}-${props.theme.accent}`;
    }

    static isSelected(props: CalendarWeekProps) {
        return (
            props.week.week === props.selectedWeek.week &&
            props.week.year === props.selectedWeek.year
        );
    }

    shouldComponentUpdate(nextProps: CalendarWeekProps) {
        return (
            CalendarWeek.apparence(nextProps) !== CalendarWeek.apparence(this.props) ||
            CalendarWeek.isSelected(nextProps) !== CalendarWeek.isSelected(this.props)
        );
    }

    render() {
        return (
            <CaseDuRuban
                theme={this.props.theme}
                haut={this.props.week.week}
                // Le lundi de la semaine, et non « S.45 » sous « 45 » : la case disait deux fois son
                // numero, elle dit maintenant ou il tombe (7-J).
                bas={moment().year(this.props.week.year).isoWeek(this.props.week.week).isoWeekday(1).format('D MMM')}
                accessibilityLabel={`${Translator.get('WEEK_SHORT')}${this.props.week.week}`}
                choisie={CalendarWeek.isSelected(this.props)}
                courante={this.props.week.week === this.props.currentWeek.week && this.props.week.year === this.props.currentWeek.year}
                onPress={this._onPress}
            />
        );
    }
}

export default CalendarWeek;
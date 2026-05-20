import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const formatDate = () => {
    const now = new Date();
    return `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
};

const isBirthdayToday = (dateOfBirth) => {
    if (!dateOfBirth) return false;
    const [dd, mm] = dateOfBirth.split('/');
    if (!dd || !mm) return false;
    const today = new Date();
    return parseInt(dd, 10) === today.getDate() && parseInt(mm, 10) === today.getMonth() + 1;
};

const GreetingBlock = ({ coldData, color, theme }) => {
    const firstName = coldData?.firstName;
    const birthday = isBirthdayToday(coldData?.dateOfBirth);
    const greeting = birthday
        ? Translator.get('HAPPY_BIRTHDAY')
        : (new Date().getHours() < 19 ? 'Bonjour' : 'Bonsoir');

    return (
        <View style={styles.container}>
            <Text style={[styles.greeting, { color: theme.font, fontFamily: 'Montserrat_600SemiBold' }]}>
                {greeting}
                {firstName ? (
                    <>
                        <Text style={{ color: theme.font }}>{' '}</Text>
                        <Text style={[styles.greeting, { color }]}>{firstName}</Text>
                    </>
                ) : null}
                <Text style={{ color: theme.font }}>{' !'}</Text>
            </Text>
            <Text style={[styles.date, { color: theme.fontSecondary, fontFamily: 'Montserrat_500Medium' }]}>
                {formatDate()}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: tokens.space.md,
        marginBottom: tokens.space.md,
    },
    greeting: {
        fontSize: tokens.fontSize.xxl,
        fontWeight: '600',
    },
    date: {
        fontSize: tokens.fontSize.md,
        marginTop: tokens.space.xs,
        textTransform: 'capitalize',
    },
});

export default GreetingBlock;

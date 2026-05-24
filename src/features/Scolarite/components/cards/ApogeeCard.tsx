import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens } from '../../../../shared/theme/Theme';

const ApogeeCard = ({ color, theme }) => (
    <View style={styles.container}>
        <View style={[styles.iconBg, { backgroundColor: `${color}18` }]}>
            <MaterialCommunityIcons name="school-outline" size={28} color={color} />
        </View>
        <View style={styles.textBlock}>
            <Text style={[styles.title, { color: theme.font, fontFamily: 'Montserrat_600SemiBold' }]}>
                Apogée
            </Text>
            <Text style={[styles.subtitle, { color: theme.fontSecondary, fontFamily: 'Montserrat_500Medium' }]}>
                Notes & résultats
            </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.fontSecondary} />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: tokens.space.md,
        minHeight: 80,
        gap: tokens.space.md,
    },
    iconBg: {
        width: 52,
        height: 52,
        borderRadius: tokens.radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textBlock: {
        flex: 1,
        gap: tokens.space.xs,
    },
    title: {
        fontSize: tokens.fontSize.md,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: tokens.fontSize.sm,
    },
});

export default ApogeeCard;

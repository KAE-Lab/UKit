/**
 * Une journee entiere du telephone, en tete du jour (jalon 6.1.x-D).
 *
 * Sans heures, elle n'a pas sa place dans un carrousel — `groupOverlappingCourses` la mettrait a
 * minuit. La forme reprend la carte de cours, filet gauche a la couleur du calendrier et fond de
 * carte, en plus bas : elle ne porte qu'un titre et une mention. Le toucher ouvre la meme fiche que
 * les cours, qui sait ce qu'elle a a montrer d'un evenement du telephone.
 */

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { couleurDeCours } from '../services/couleurDeCours';
import type { CourseData } from './CourseCard';

export function BandeauJourneeEntiere({ evenement, theme }: { evenement: CourseData; theme: AppThemeType }) {
    const navigation = useNavigation<NavigationProp<Record<string, unknown>>>();
    const couleur = couleurDeCours(theme.courses, evenement.color);
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Course', { data: evenement })}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginHorizontal: tokens.space.sm,
                marginVertical: tokens.space.xs,
                paddingVertical: tokens.space.sm,
                paddingHorizontal: tokens.space.md,
                backgroundColor: theme.eventBackground,
                borderRadius: tokens.radius.lg,
                borderLeftWidth: 4,
                borderLeftColor: couleur,
                borderWidth: 1,
                borderColor: theme.eventBorder,
                ...tokens.shadow.sm as object,
            }}
        >
            <MaterialCommunityIcons name="calendar-blank" size={18} color={couleur} style={{ marginRight: tokens.space.sm }} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold as never, color: theme.font }}>
                {evenement.subject}
            </Text>
            <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, marginLeft: tokens.space.sm }}>
                {Translator.get('ALL_DAY')}
            </Text>
        </TouchableOpacity>
    );
}

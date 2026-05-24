import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';

const STEPS = [
    { key: 'connecting', labelKey: 'LOADING_CONNECTING', icon: 'shield-lock-outline' },
    { key: 'profile',    labelKey: 'LOADING_PROFILE',    icon: 'account-outline' },
    { key: 'dossier',    labelKey: 'LOADING_DOSSIER',    icon: 'folder-account-outline' },
    { key: 'mailbox',    labelKey: 'LOADING_MAILBOX',    icon: 'email-outline' },
] as const;

const stepIndex = (step) => STEPS.findIndex((s) => s.key === step);

const ScolariteLoadingScreen = ({ scrapeProgress, theme, color }) => {
    const currentIdx = stepIndex(scrapeProgress ?? 'connecting');

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.title, { color: theme.font, fontFamily: 'Montserrat_700Bold' }]}>
                {Translator.get('SCOLARITY')}
            </Text>
            <View style={styles.steps}>
                {STEPS.map((step, idx) => {
                    const isDone = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const isPending = idx > currentIdx;

                    return (
                        <View key={step.key} style={styles.stepRow}>
                            <View style={[styles.iconContainer, {
                                backgroundColor: isDone ? color + '22' : isCurrent ? color + '11' : theme.cardBackground + '55',
                            }]}>
                                {isDone ? (
                                    <MaterialCommunityIcons name="check-circle" size={22} color={color} />
                                ) : isCurrent ? (
                                    <ActivityIndicator size="small" color={color} />
                                ) : (
                                    <MaterialCommunityIcons name={step.icon} size={22} color={theme.fontSecondary} />
                                )}
                            </View>
                            <Text style={[
                                styles.stepLabel,
                                { fontFamily: isCurrent ? 'Montserrat_600SemiBold' : 'Montserrat_500Medium' },
                                { color: isDone ? color : isCurrent ? theme.font : theme.fontSecondary },
                                isPending && styles.pendingLabel,
                            ]}>
                                {Translator.get(step.labelKey)}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: tokens.space.xl,
        gap: tokens.space.xl,
    },
    title: {
        fontSize: tokens.fontSize.xxl,
        marginBottom: tokens.space.sm,
    },
    steps: {
        width: '100%',
        gap: tokens.space.md,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.md,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepLabel: {
        fontSize: tokens.fontSize.md,
        flex: 1,
    },
    pendingLabel: {
        opacity: 0.4,
    },
});

export default ScolariteLoadingScreen;

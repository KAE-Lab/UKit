import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, ActivityIndicator,
    StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { useCredentials } from '../services/CredentialsContext';
import { UnifiedTouchable } from '../../../shared/ui/UnifiedTouchable';
import { SettingsManager } from '../../../shared/services/AppCore';
import type { InstitutionDomain } from '../../Onboarding/services/AuthenticationService';

/**
 * Écran de connexion ENT — affiché à la place du dashboard tant que
 * l'utilisateur n'est pas connecté. La connexion est obligatoire.
 */
const ScolariteLoginView = ({ theme, color, topPadding }) => {
    const { validateAndSave } = useCredentials();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [domain, setDomain] = useState<InstitutionDomain>(SettingsManager.getCollegeId() as InstitutionDomain);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const COLLEGE_LIST: { id: InstitutionDomain; title: string }[] = [
        { id: 'SCIENCES_TECH', title: 'SCIENCES_TECH' },
        { id: 'DROIT_ECO_GESTION', title: 'DROIT_ECO_GESTION' },
        { id: 'SANTE', title: 'SANTE' },
        { id: 'SCIENCES_HOMME', title: 'SCIENCES_HOMME' },
        { id: 'IUT_BORDEAUX', title: 'IUT_BORDEAUX' },
        { id: 'BORDEAUX_MONTAIGNE', title: 'BORDEAUX_MONTAIGNE' },
        { id: 'BORDEAUX_INP', title: 'BORDEAUX_INP' },
    ];

    const onSubmit = useCallback(async () => {
        if (!username || !password || submitting) return;
        setError('');
        setSubmitting(true);
        SettingsManager.setCollegeId(domain);
        const result = await validateAndSave(username.trim(), password);
        if (!result.success) {
            setError(result.error || Translator.get('LOGIN_FAILED'));
            setSubmitting(false);
        }
        // En cas de succès, le contexte met à jour `credentials` et le
        // dashboard remplace cet écran automatiquement.
    }, [username, password, submitting, validateAndSave]);

    const disabled = !username || !password || submitting;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.select({ ios: 'padding', default: undefined })}
        >
            <ScrollView
                contentContainerStyle={{ paddingTop: topPadding + 70, paddingBottom: tokens.space.xxl }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.hero}>
                    <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
                        <MaterialCommunityIcons name="school-outline" size={36} color={color} />
                    </View>
                    <Text style={[styles.title, { color: theme.font, fontFamily: 'Montserrat_600SemiBold' }]}>
                        {Translator.get('SCOLARITY')}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.fontSecondary, fontFamily: 'Montserrat_500Medium' }]}>
                        {Translator.get('ENTER_CREDENTIALS_DESC')}
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border, marginBottom: tokens.space.md }]}>
                    <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: 'bold', color: theme.font, marginBottom: tokens.space.sm }}>
                        {Translator.get('COLLEGE_SELECTION_TITLE') || 'Établissement'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {COLLEGE_LIST.map((college) => {
                            const selected = domain === college.id;
                            return (
                                <UnifiedTouchable
                                    key={college.id}
                                    onPress={() => setDomain(college.id)}
                                    style={{
                                        backgroundColor: selected ? theme.primary + '22' : theme.greyBackground,
                                        borderWidth: 2,
                                        borderColor: selected ? theme.primary : 'transparent',
                                        paddingVertical: tokens.space.sm,
                                        paddingHorizontal: tokens.space.md,
                                        borderRadius: tokens.radius.md,
                                        marginRight: tokens.space.sm,
                                    }}
                                >
                                    <Text style={{ color: selected ? theme.primary : theme.fontSecondary, fontWeight: selected ? 'bold' : '500', fontSize: tokens.fontSize.sm }}>
                                        {Translator.get(college.title as Parameters<typeof Translator.get>[0])}
                                    </Text>
                                </UnifiedTouchable>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.font, borderColor: theme.border }]}
                        placeholder={Translator.get('USERNAME')}
                        placeholderTextColor={theme.fontSecondary}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!submitting}
                    />
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.font, borderColor: theme.border, marginTop: tokens.space.sm }]}
                        placeholder={Translator.get('PASSWORD')}
                        placeholderTextColor={theme.fontSecondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!submitting}
                    />

                    {error ? (
                        <View style={styles.errorRow}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.accentFont} />
                            <Text style={[styles.errorText, { color: theme.accentFont }]}>{error}</Text>
                        </View>
                    ) : null}

                    <UnifiedTouchable
                        onPress={onSubmit}
                        disabled={disabled}
                        activeOpacity={0.85}
                        style={[styles.button, { backgroundColor: color }, disabled && { opacity: 0.5 }]}
                    >
                        {submitting ? (
                            <>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={styles.buttonText}>{Translator.get('CONNECTING')}</Text>
                            </>
                        ) : (
                            <Text style={styles.buttonText}>{Translator.get('CONNECT')}</Text>
                        )}
                    </UnifiedTouchable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    hero: {
        alignItems: 'center',
        paddingHorizontal: tokens.space.lg,
        marginBottom: tokens.space.lg,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: tokens.radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: tokens.space.md,
    },
    title: {
        fontSize: tokens.fontSize.xl,
        fontWeight: '600',
        marginBottom: tokens.space.xs,
    },
    subtitle: {
        fontSize: tokens.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        marginHorizontal: tokens.space.md,
        padding: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
    },
    input: {
        height: 50,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        paddingHorizontal: tokens.space.md,
        fontSize: tokens.fontSize.md,
        fontFamily: 'Montserrat_500Medium',
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.xs,
        marginTop: tokens.space.sm,
    },
    errorText: {
        flex: 1,
        fontSize: tokens.fontSize.sm,
        fontFamily: 'Montserrat_500Medium',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.space.sm,
        height: 50,
        borderRadius: tokens.radius.md,
        marginTop: tokens.space.md,
    },
    buttonText: {
        color: '#fff',
        fontSize: tokens.fontSize.md,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
});

export default ScolariteLoginView;

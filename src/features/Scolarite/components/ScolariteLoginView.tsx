import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ActivityIndicator,
    StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { useCredentials } from '../services/CredentialsContext';

/**
 * Le formulaire de connexion au compte universitaire.
 *
 * Affiché à la place du tableau de bord tant que l'utilisateur n'est pas connecté, **et** comme étape
 * du parcours d'accueil depuis le jalon 6-J. C'est délibérément le même composant : deux formulaires
 * vers le même trousseau auraient divergé à la première correction, et le contexte est monté au-dessus
 * des deux branches précisément pour que ce partage soit possible (`rootContainer.tsx`).
 *
 * **La connexion n'est plus obligatoire.** Elle l'était tant que l'onglet Scolarité était le seul
 * endroit qui la demandait ; à l'accueil elle se saute, et `onSkip` porte cette sortie. Le composant
 * ne décide pas de sa présence — l'écran qui l'utilise la passe, ou non.
 */
const ScolariteLoginView = ({ theme, color, topPadding, onSkip = null, onSuccess = null, compact = false }) => {
    const { validateAndSave } = useCredentials();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = useCallback(async () => {
        if (!username || !password || submitting) return;
        setError('');
        setSubmitting(true);
        const result = await validateAndSave(username.trim(), password);
        if (!result.success) {
            setError(result.error || Translator.get('LOGIN_FAILED'));
            setSubmitting(false);
            return;
        }

        /*
         * Le succès rendait la main **sans rien faire**, et c'était juste tant que cet écran n'avait
         * qu'un seul appelant : le tableau de bord se redessine dès que le contexte pose
         * `credentials`, et cet écran disparaît avec lui. À l'accueil, rien ne le remplace — l'étape
         * reste affichée, et le bouton restait donc figé sur « Connexion… » alors que la session
         * était allée au bout. Mesuré sur appareil au jalon 6-J.
         *
         * L'indicateur retombe donc explicitement, et `onSuccess` porte la suite quand l'appelant en
         * a une. Le tableau de bord n'en passe pas : son remplacement d'écran reste sa réponse.
         */
        setSubmitting(false);
        onSuccess?.();
    }, [username, password, submitting, validateAndSave, onSuccess]);

    const disabled = !username || !password || submitting;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={{ paddingTop: topPadding + 70, paddingBottom: tokens.space.xxl }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/*
                  * À l'accueil, le titre annonce le geste (« connecte ton compte ») plutôt que
                  * l'onglet : l'étudiant n'y est pas encore, et lui nommer une destination qu'il ne
                  * connaît pas n'explique rien. Le corps du formulaire, lui, est identique.
                  */}
                <View style={styles.hero}>
                    <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
                        <MaterialCommunityIcons name="school-outline" size={36} color={color} />
                    </View>
                    <Text style={[styles.title, { color: theme.font }]}>
                        {Translator.get(compact ? 'CONNECT_ACCOUNT_TITLE' : 'SCOLARITY')}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.fontSecondary }]}>
                        {Translator.get(compact ? 'CONNECT_ACCOUNT_DESC' : 'ENTER_CREDENTIALS_DESC')}
                    </Text>
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

                    <TouchableOpacity
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
                    </TouchableOpacity>

                    {/*
                      * La sortie est un lien discret et non un second bouton : les deux gestes n'ont
                      * pas le meme poids, et leur donner la meme forme ferait hesiter la ou il n'y a
                      * pas a hesiter. Elle reste desactivee pendant la soumission — partir au milieu
                      * d'une connexion laisserait une session en cours derriere un ecran qu'on vient
                      * de quitter.
                      */}
                    {onSkip !== null && (
                        <TouchableOpacity onPress={onSkip} disabled={submitting} style={styles.skip}>
                            <Text style={[styles.skipText, { color: theme.fontSecondary }, submitting && { opacity: 0.5 }]}>
                                {Translator.get('LATER')}
                            </Text>
                        </TouchableOpacity>
                    )}
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
    },
    skip: {
        alignItems: 'center',
        marginTop: tokens.space.md,
        paddingVertical: tokens.space.xs,
    },
    skipText: {
        fontSize: tokens.fontSize.sm,
    },
});

export default ScolariteLoginView;

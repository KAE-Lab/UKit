import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ActivityIndicator,
    StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getEtablissementActif } from '../../../shared/etablissements';
import { LogoEtablissement } from './LogoEtablissement';
import { BlocProgression } from './ScolariteLoadingScreen';
import { useEcranDeProgression } from '../hooks/useEcranDeProgression';

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
/**
 * Le bandeau du formulaire : le logo de l'etablissement, le titre, la phrase d'explication.
 *
 * Sorti du formulaire pour le garder sous la limite de lignes. À l'accueil, le titre annonce **le
 * geste** (« connecte ton compte ») plutot que l'onglet : l'etudiant n'y est pas encore, et lui
 * nommer une destination qu'il ne connait pas n'explique rien. Le corps du formulaire, lui, est
 * identique dans les deux cas.
 */
const EnTeteDuFormulaire = ({ theme, color, compact }) => (
    <View style={styles.hero}>
        {/*
          * Filigrane, comme l'en-tete du tableau de bord : la vignette blanche a filet detonnait
          * seule dans l'application depuis que le tableau de bord est passe au monochrome. Plus
          * haut qu'ailleurs (64 contre 44) — ici le logo est le heros du bandeau, pas une signature.
          */}
        <LogoEtablissement
            logo={getEtablissementActif().logo}
            theme={theme}
            teinte={color}
            filigrane
            hauteur={64}
            style={styles.iconWrap}
        />
        <Text style={[styles.title, { color: theme.font }]}>
            {Translator.get(compact ? 'CONNECT_ACCOUNT_TITLE' : 'SCOLARITY')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.fontSecondary }]}>
            {Translator.get(compact ? 'CONNECT_ACCOUNT_DESC' : 'ENTER_CREDENTIALS_DESC')}
        </Text>
    </View>
);

/**
 * La carte du formulaire : les champs, l'erreur, le bouton — ou la progression a leur place.
 *
 * Sortie du composant pour le garder sous la limite de lignes, comme `EnTeteDuFormulaire`.
 */
const CarteDuFormulaire = ({
    theme, color, submitting, enSession, terminee, scrapeProgress,
    username, setUsername, password, setPassword, error, onSubmit, onSkip,
}) => {
    /** Le bouton ne part pas sans ses deux champs, et pas deux fois. */
    const disabled = !username || !password || submitting;

    return (
            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                {enSession ? (
                    /*
                      * **La page ne cede pas la place, elle change de contenu.**
                      *
                      * Le bandeau — logo, titre, phrase — reste ; seule la carte passe des champs
                      * a la progression. Deux pages a moitie vides qui se remplacent donnaient
                      * l'impression d'une application qui hesite ; une seule qui se transforme se
                      * lit comme une suite.
                      *
                      * Et le gain n'est pas qu'esthetique : un echec revient **ici**, sous les
                      * champs qu'on vient de remplir, sans qu'aucun ecran n'ait a etre rejoue en
                      * sens inverse.
                      */
                    <BlocProgression
                        scrapeProgress={scrapeProgress}
                        theme={theme}
                        color={color}
                    />
                ) : (
                    <>
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
                                <ActivityIndicator size="small" color={theme.lightFont} />
                                <Text style={[styles.buttonText, { color: theme.lightFont }]}>{Translator.get('CONNECTING')}</Text>
                            </>
                        ) : (
                            <Text style={[styles.buttonText, { color: theme.lightFont }]}>{Translator.get('CONNECT')}</Text>
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
                    </>
                )}
            </View>
    );
};

const ScolariteLoginView = ({ theme, color, topPadding, onSkip = null, onDebut = null, onSuccess = null, compact = false }) => {
    const { validateAndSave, scrapeProgress, scrapeStatus, sessionMode } = useCredentials();

    /*
     * **La carte montre la progression tant que LA SESSION tourne, pas tant que le bouton attend.**
     *
     * `submitting` retombe quand `validateAndSave` resout — et cette promesse se resout **tot** : la
     * preuve des identifiants est la premiere etape de la session, le dossier, la formation, l'annuaire
     * et la messagerie viennent apres. La carte revenait donc a ses champs **vides** au milieu du run,
     * sans erreur et sans explication, et il fallait quitter l'ecran pour retrouver la progression
     * ailleurs. Mesure sur appareil le 2026-08-27.
     *
     * On suit donc la session elle-meme. `useEcranDeProgression` ne compte que les parcours **froids**,
     * ce qui evite qu'un rafraichissement de fond fasse clignoter un formulaire.
     */
    const progression = useEcranDeProgression(sessionMode, scrapeStatus);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const enSession = submitting || progression.visible;

    const onSubmit = useCallback(async () => {
        if (!username || !password || submitting) return;
        setError('');
        setSubmitting(true);
        // L'ecran hote apprend qu'une session part **de ce formulaire** : c'est ce qui lui permet de
        // lui laisser la page jusqu'au bout, alors que `credentials` est pose des le dixieme step.
        onDebut?.();
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


    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/*
              * Le rebond est **volontairement conserve**. Le supprimer a ete essaye et retire : sur
              * un ecran ou le clavier entre et sort, couper le debattement fait sauter la vue et
              * clignoter le clavier. Un rebond sur une page courte est le comportement natif attendu ;
              * c'est le remede qui faisait plus de bruit que le mal.
              */}
            <ScrollView
                contentContainerStyle={{ paddingTop: topPadding + 70, paddingBottom: tokens.space.xxl }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <EnTeteDuFormulaire theme={theme} color={color} compact={compact} />

                <CarteDuFormulaire
                    theme={theme} color={color} submitting={submitting} enSession={enSession}
                    terminee={progression.terminee} scrapeProgress={scrapeProgress}
                    username={username} setUsername={setUsername} password={password} setPassword={setPassword}
                    error={error} onSubmit={onSubmit} onSkip={onSkip}
                />
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
        marginBottom: tokens.space.md,
    },
    title: {
        fontSize: tokens.fontSize.xl,
        fontWeight: '600',
        marginBottom: tokens.space.xs,
        // Comme le sous-titre : sur un ecran etroit le titre passe sur deux lignes, et sans
        // centrage la seconde se calait a gauche du bloc — l'ensemble paraissait decentre.
        textAlign: 'center',
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
        // La couleur vient du theme a l'appel : `lightFont`, blanc dans les deux themes. Surtout pas
        // `accentFont`, qui est le rouge destructif (docs/theme.md).
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

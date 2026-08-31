import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ActivityIndicator,
    StyleSheet, KeyboardAvoidingView, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getEtablissementActif } from '../../../shared/etablissements';
import { LogoEtablissement } from './LogoEtablissement';
import { BlocProgression } from './ScolariteLoadingScreen';
import { franchirLaPorte } from './BiometryGate';
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

    /* La touche « suivant » enchaine sur le mot de passe sans rendre le clavier. */
    const champMotDePasse = useRef<TextInput>(null);

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
                    /* `terminee` n'est pas decoratif : sans lui, la fin de session remettait
                       l'etape a zero et la barre SE VIDAIT avant de disparaitre (constate sur le
                       College ST le 2026-08-31) — c'est lui qui l'envoie a 100 %. */
                    <BlocProgression
                        scrapeProgress={scrapeProgress}
                        terminee={terminee}
                        theme={theme}
                        color={color}
                    />
                ) : (
                    <>
                    {/*
                      * Les traits iOS des deux champs sont alignes (`textContentType`) : sans eux,
                      * iOS decidait seul d'afficher sa barre d'assistance sur un champ et pas sur
                      * l'autre, et reconstruisait le clavier au changement de champ — un
                      * clignotement visible a travers un clavier translucide (constate le
                      * 2026-08-31). `submitBehavior="submit"` enchaine identifiant → mot de passe
                      * sans blur, donc sans rendre le clavier. `textContentType` est ignore par
                      * Android ; lui ne gagne que la touche Suivant/OK.
                      */}
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.font, borderColor: theme.border }]}
                        placeholder={Translator.get('USERNAME')}
                        placeholderTextColor={theme.fontSecondary}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!submitting}
                        textContentType="username"
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => champMotDePasse.current?.focus()}
                    />
                    <TextInput
                        ref={champMotDePasse}
                        style={[styles.input, { backgroundColor: theme.background, color: theme.font, borderColor: theme.border, marginTop: tokens.space.sm }]}
                        placeholder={Translator.get('PASSWORD')}
                        placeholderTextColor={theme.fontSecondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!submitting}
                        textContentType="password"
                        returnKeyType="done"
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

const ScolariteLoginView = ({ theme, color, topPadding, onSkip = null, onDebut = null, onSuccess = null, compact = false, onScroll = undefined }) => {
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
    const [reussi, setReussi] = useState(false);
    const [error, setError] = useState('');

    // `reussi` compte aussi : entre la fin de la grace de la barre et la confirmation de fin (voir
    // l'effet plus bas), la carte remontrait les champs REMPLIS une fraction de seconde avant que
    // l'appelant avance (constate a l'accueil le 2026-08-31).
    const enSession = submitting || progression.visible || reussi;

    /*
     * `onSuccess` part a la FIN de la session, pas a la preuve des identifiants : `validateAndSave`
     * resout tot — la preuve est la premiere etape — et l'appelant qui avancait a ce moment-la
     * (l'etape suivante de l'accueil) quittait l'ecran pendant que le parcours froid tournait
     * encore. Un echec du froid n'annule pas le compte : l'onglet le redira au bon endroit.
     *
     * La fin se lit sur `scrapeStatus` DIRECTEMENT — deux correctifs passes par la progression
     * derivee ont ete defaits le meme jour, chacun perdant une course de propagation du contexte.
     * La regle tient en deux temps : on doit VOIR la session tourner (connecting/scraping) apres
     * l'armement — `sessionVue`, remise a zero a chaque soumission, ecarte un statut terminal
     * residuel d'une session precedente — puis la voir finir (done/error). Le minuteur est le
     * secours du cas degenere ou aucune session ne demarre.
     */
    const sessionVue = useRef(false);
    // Le statut, lisible depuis un minuteur : la fermeture d'un `setTimeout` fige la valeur du
    // rendu qui l'a pose — la ref, elle, dit le present.
    const statusRef = useRef(scrapeStatus);
    statusRef.current = scrapeStatus;
    useEffect(() => {
        if (!reussi) return;
        const fin = () => { setReussi(false); onSuccess?.(); };

        if (scrapeStatus === 'connecting' || scrapeStatus === 'scraping') {
            sessionVue.current = true;
            return;
        }
        if (sessionVue.current && (scrapeStatus === 'done' || scrapeStatus === 'error')) {
            // Le terminal se CONFIRME au lieu de conclure : le parcours froid enchaine plusieurs
            // phases et le statut repasse par `done` entre deux — partir au premier faisait sauter
            // l'etape pendant que la suite tournait (constate sur iPhone le 2026-08-31). Si le
            // statut repart avant l'echeance, l'effet se rejoue et ce minuteur est nettoye.
            const conclusion = setTimeout(() => {
                sessionVue.current = false;
                fin();
            }, 1200);
            return () => clearTimeout(conclusion);
        }
        const secours = setTimeout(() => {
            // Ultime verification au tir : si une session tourne malgre tout, le secours n'a pas
            // le droit de sauter l'etape — il se remettra en attente au prochain changement.
            if (statusRef.current === 'connecting' || statusRef.current === 'scraping') return;
            fin();
        }, 6000);
        return () => clearTimeout(secours);
    }, [reussi, scrapeStatus, onSuccess]);

    const onSubmit = useCallback(async () => {
        if (!username || !password || submitting) return;
        setError('');
        setSubmitting(true);
        // La memoire de session repart : un `done` residuel d'une session passee ne doit pas faire
        // croire que celle qui demarre est finie (voir l'effet plus haut).
        sessionVue.current = false;
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
         * L'indicateur retombe donc explicitement, et `reussi` arme la suite : `onSuccess` partira
         * quand la progression retombera (voir l'effet plus haut), pas maintenant.
         */
        // Taper ses identifiants vaut franchissement de la porte biometrique : la fiche du compte
        // qui remplace ce formulaire est gardee, et demander un visage a qui vient de prouver le
        // mot de passe etait la demande de trop (voir BiometryGate).
        franchirLaPorte();
        setSubmitting(false);
        setReussi(true);
    }, [username, password, submitting, validateAndSave]);


    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            // `padding` sur les DEUX plateformes : le clavier prend physiquement sa place et le
            // contenu devient defilable au-dessus de lui — le comportement iOS, voulu partout.
            // Android edge-to-edge (SDK 54) ne redimensionne plus la fenetre tout seul : sans
            // comportement le clavier recouvrait le bas, et `height` deplacait sans liberer.
            //
            // Ce cadre est LE SEUL, y compris a l'accueil : le parcours n'en a pas. Deux cadres
            // imbriques compensaient chacun la hauteur du clavier et le contenu oscillait sur
            // iOS ; l'inverse — le cadre au parcours, aucun ici — laissait le clavier recouvrir
            // la saisie (constate le 2026-08-31, dans les deux sens).
            behavior="padding"
        >
            {/*
              * Le rebond est **volontairement conserve**. Le supprimer a ete essaye et retire : sur
              * un ecran ou le clavier entre et sort, couper le debattement fait sauter la vue et
              * clignoter le clavier. Un rebond sur une page courte est le comportement natif attendu ;
              * c'est le remede qui faisait plus de bruit que le mal.
              */}
            {/* `Animated.ScrollView` pour `onScroll` : l'onglet deconnecte fond son grand titre
                sur le defilement du formulaire (ScolariteDashboard). Sans rapporteur, identique. */}
            <Animated.ScrollView
                contentContainerStyle={{ paddingTop: topPadding + 70, paddingBottom: tokens.space.xxl }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                <EnTeteDuFormulaire theme={theme} color={color} compact={compact} />

                <CarteDuFormulaire
                    theme={theme} color={color} submitting={submitting} enSession={enSession}
                    terminee={progression.terminee} scrapeProgress={scrapeProgress}
                    username={username} setUsername={setUsername} password={password} setPassword={setPassword}
                    error={error} onSubmit={onSubmit} onSkip={onSkip}
                />
            </Animated.ScrollView>
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
        alignSelf: 'stretch',
        fontSize: tokens.fontSize.xl,
        fontWeight: '600',
        marginBottom: tokens.space.xs,
        // Comme le sous-titre : sur un ecran etroit le titre passe sur deux lignes, et sans
        // centrage la seconde se calait a gauche du bloc — l'ensemble paraissait decentre.
        textAlign: 'center',
    },
    subtitle: {
        alignSelf: 'stretch',
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
        alignSelf: 'stretch',
        textAlign: 'center',
        fontSize: tokens.fontSize.sm,
    },
});

export default ScolariteLoginView;

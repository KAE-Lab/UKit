/**
 * Les etapes du parcours d'accueil, et rien d'autre.
 *
 * Elles vivaient dans `WelcomeScreen.tsx` jusqu'au jalon 6-G ; l'etape d'etablissement l'aurait porte
 * au-dela des 400 lignes, et un ecran qui compose n'a pas a porter le detail de cinq mises en page.
 * L'ecran garde ce qui decide — l'enchainement, les valeurs par defaut, la bascule de `firstload` —
 * et ce fichier ne fait que rendre.
 *
 * Voir docs/features/onboarding.md.
 */

import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import Translator from '../../../shared/i18n/Translator';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { useDegagementDuPied } from './stylesDuParcours';
import { HAUT_D_ETAPE } from './EtapesDeChoix';
// Deux dependances croisees entre features, et elles sont volontaires — voir la section
// « Dependances entre features » de docs/architecture.md. L'accueil propose depuis le jalon 6-J deux
// gestes qui appartiennent a d'autres domaines : se connecter au compte universitaire, et coller un
// lien d'emploi du temps. Les recopier ici ferait deux formulaires vers le meme trousseau, qui
// divergeraient a la premiere correction — exactement ce que le partage evite.
import ScolariteLoginView from '../../Scolarite/components/ScolariteLoginView';
import LienEdtForm from '../../Planning/components/LienEdtForm';
import { Icon } from '../../../shared/ui/Icon';

/**
 * L'en-tete du parcours : le retour, et une ligne de progression fine au degrade du logo (accueil
 * refait, 7-J). Elle remplace les points du bas, qui disaient « ou j'en suis » au mauvais endroit,
 * colles au bouton. L'arrivee n'en a pas : elle n'est pas encore une etape.
 */
export function EnTeteDuParcours({ themeObj, haut, progression, retourVisible, onRetour }: {
    themeObj: AppThemeType;
    haut: number;
    /** De 0 a 1 ; nulle, la ligne s'efface. */
    progression: number;
    retourVisible: boolean;
    onRetour: () => void;
}) {
    const avance = useSharedValue(progression);
    const mouvementReduit = useReducedMotion();
    useEffect(() => {
        avance.value = mouvementReduit ? progression : withSpring(progression, tokens.mouvement.ressort);
    }, [avance, progression, mouvementReduit]);
    const remplissage = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, avance.value)) * 100}%` }));
    return (
        <View style={[enTete.rangee, { top: haut }]} pointerEvents="box-none">
            <TouchableOpacity
                onPress={onRetour}
                disabled={!retourVisible}
                accessibilityRole="button"
                accessibilityLabel={Translator.get('RETOUR')}
                style={[enTete.retour, { opacity: retourVisible ? 1 : 0 }]}
            >
                <Icon icon={{ family: 'material', name: 'arrow-back-ios-new' }} size={20} color={themeObj.font} />
            </TouchableOpacity>
            <View style={[enTete.piste, { backgroundColor: themeObj.greyBackground, opacity: progression > 0 ? 1 : 0 }]}>
                <Reanimated.View style={[enTete.remplissage, remplissage]}>
                    <LinearGradient colors={[themeObj.accent, themeObj.accentProfond]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                </Reanimated.View>
            </View>
        </View>
    );
}

const PISTE = 4;
const RETOUR = 44;

const enTete = StyleSheet.create({
    rangee: {
        position: 'absolute',
        left: tokens.space.sm,
        right: tokens.space.xl,
        height: RETOUR,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
        zIndex: 10,
    },
    retour: {
        width: RETOUR,
        height: RETOUR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    piste: {
        flex: 1,
        height: PISTE,
        borderRadius: PISTE / 2,
        overflow: 'hidden',
    },
    remplissage: {
        height: '100%',
        borderRadius: PISTE / 2,
        overflow: 'hidden',
    },
});

/**
 * L'etape du compte universitaire (jalon 6-J).
 *
 * Elle **n'a pas de mise en page a elle** : c'est le formulaire de l'onglet Scolarite, tel quel, avec
 * sa sortie « Plus tard ». Deux formulaires vers le meme trousseau auraient diverge a la premiere
 * correction, et c'est precisement pour rendre ce partage possible que `CredentialsProvider` a remonte
 * au-dessus des deux branches (`rootContainer.tsx`).
 */
export const StepCompte = ({ themeObj, onConnecte, onAutreCampus, onEnSession }) => {
    const degagement = useDegagementDuPied();
    return (
    /*
     * Le degagement du haut vit dans `topPadding` — DANS le contenu defilant — et pas sur ce
     * conteneur : pose ici, il decoupait le defilement a sa ligne et le contenu disparaissait
     * derriere une bande de la couleur du fond (constate a l'accueil le 2026-08-31).
     */
    <View style={{ flex: 1 }}>
        {/*
          * Pas de « Plus tard » ici (deuxieme passe de 7-J) : il doublait le « Suivant » du pied du
          * parcours, qui avance de meme, et la review du 2026-11-05 l'a retire. `onConnecte` est
          * distinct depuis le 2026-08-31, parce
          * qu'une connexion reussie a pu **regler l'emploi du temps au passage** — les propositions
          * du dossier posent les favoris pendant le parcours froid — et l'ecran d'accueil decide
          * alors de sauter l'etape EDT devenue sans question. Sans `onSuccess`, le bouton restait
          * fige sur « Connexion… » une fois la session reussie (voir ScolariteLoginView).
          */}
        <ScolariteLoginView
            theme={themeObj}
            color={themeObj.primary}
            topPadding={tokens.space.xxl}
            onSuccess={onConnecte}
            onAutreCampus={onAutreCampus}
            onEnSession={onEnSession}
            compact
            intro={Translator.get('ACCOUNT_TRUST')}
            degagementBas={degagement}
        />
    </View>
    );
};

/**
 * L'etape « colle ton lien », pour un etablissement qui publie un abonnement (jalon 6-J).
 *
 * Elle rend le formulaire **en place** et non derriere une navigation : l'accueil vit hors de toute
 * pile (`rootContainer.tsx`), il n'a nulle part ou pousser un ecran. C'est aussi ce qui a decide que
 * la saisie soit un composant et pas un ecran.
 */
export const StepLienEdt = ({ onDone }) => (
    /* Meme decision que StepCompte : le degagement defile avec le contenu, sans bande de coupe. */
    <View style={{ flex: 1 }}>
        {/*
          * `onDone` avance d'une etape. Sans lui, le bouton « Terminer » qui suit une verification
          * reussie ne ferait **rien** — le formulaire l'utilise ailleurs pour refermer son ecran de
          * pile, et un bouton mort au milieu d'un parcours d'accueil est pire que pas de bouton.
          */}
        {/* Aucun en-tete ici : le parcours d'accueil est rendu hors de la navigation. */}
        {/* Le haut des autres etapes : sous l'en-tete du parcours, l'icone du formulaire chevauchait
            la ligne de progression (constate au banc, accueil refait). */}
        <LienEdtForm onDone={onDone} topPadding={HAUT_D_ETAPE} />
    </View>
);

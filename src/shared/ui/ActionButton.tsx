/**
 * Le bouton d'action, dans les trois seules formes que l'application emploie.
 *
 * Il ne dessine rien de neuf : il **normalise**. Le depot portait quatre facons de proposer une
 * action hors dialogue — le bouton plein `primary` de `EmptyState` et de `LienEdtForm`, trois boutons
 * **bordes a fond transparent** dans les reglages du compte, et un lien texte nu en `accentFont` pour
 * oublier un lien d'abonnement. Les trois derniers ne se distinguaient d'un fond que par un filet, ce
 * qui les faisait disparaitre partout ailleurs dans l'application, ou une action est pleine.
 *
 * Les trois variantes, et la seule question a se poser pour choisir :
 *
 * - `filled` — **l'action principale de l'ecran**, celle qu'on recommande. Fond `primary`, libelle
 *   `lightFont`. C'est exactement le bouton Reessayer, et c'est voulu : une seule facon de dire
 *   « action principale » dans toute l'application (docs/theme.md).
 * - `tonal` — une action **secondaire et reversible**. Fond `greyBackground`, libelle `primary`.
 * - `destructive` — une action qui **retire quelque chose qu'on ne recupere pas**. **Le meme fond
 *   gris**, libelle `danger`.
 *
 * Les deux dernieres partagent leur fond, et c'est la correction qui compte : une premiere version
 * teintait le fond destructif en `dangerSoft`, du rouge a 8 %, sous un libelle rouge. Le contraste
 * s'effondrait et le bouton se fondait — exactement le defaut qu'on venait de corriger sur les
 * boutons bordes. **C'est le libelle qui porte le sens, jamais le fond.** Le modele du `tonal` est
 * « Ouvrir dans l'agenda » de la fiche d'un rendez-vous (`CourseScreen`) ; le bouton « Reserver »
 * d'une bibliotheque, qui l'a ete, est devenu l'action principale de sa fiche en 6.2.x — un retour
 * du formulaire demandait une reservation qui existait deja (`PiedDAction`).
 *
 * Le fond plein reste reserve a deux cas : `primary` pour l'action principale, et `danger` dans les
 * **dialogues** de confirmation (`popup.buttonDestructive`). Une confirmation assume sa gravite, une
 * entree de liste l'annonce.
 *
 * `minHeight: 48` plutot qu'un rembourrage calcule : c'est la cible tactile de la recette d'ecran, et
 * elle ne doit pas dependre de la longueur du libelle. Le depot n'a aucune echelle de dimensions,
 * cette valeur est donc en dur et assumee (docs/theme.md).
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { tokens, AppThemeType } from '../theme/Theme';
import { Icon, type IconSpec } from './Icon';
import { useEnfoncement } from './useEnfoncement';

export type ActionButtonVariant = 'filled' | 'tonal' | 'destructive';

export interface ActionButtonProps {
    theme: AppThemeType;
    label: string;
    onPress: () => void;
    variant?: ActionButtonVariant;
    icon?: IconSpec;
    /** Ce que le bouton ne decide pas : sa largeur et ses marges. Meme regle que `Card`. */
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
}

/** Fond et teinte de libelle, par variante. La seule table de ce fichier. */
function habillage(theme: AppThemeType, variant: ActionButtonVariant): { fond: string; teinte: string } {
    if (variant === 'tonal') return { fond: theme.greyBackground, teinte: theme.accent ?? theme.primary };
    if (variant === 'destructive') return { fond: theme.greyBackground, teinte: theme.danger };
    // `lightFont` et non `accentFont` : ce dernier est le rouge destructif, illisible sur `primary`.
    return { fond: theme.primary, teinte: theme.lightFont };
}

const PressableAnime = Reanimated.createAnimatedComponent(Pressable);

/**
 * Le bouton repond au doigt (7-J, troisieme passe) : il s'enfonce sur un ressort, et le bouton plein
 * donne un retour haptique. Il s'assombrissait d'un voile, la reponse d'un lien plus que d'un bouton
 * (review du 2026-11-06 : « un peu trop simple »). Le bouton plein prend aussi une matiere : l'accent
 * qui descend vers l'accent profond, la meme teinte, et un liseré de lumiere en haut. Le style passe
 * par l'appelant (marges, hauteur, ombre, `flex`) reste sur le bouton lui-meme.
 */
export function ActionButton({
    theme, label, onPress, variant = 'filled', icon, style, disabled = false,
}: ActionButtonProps) {
    const { fond, teinte } = habillage(theme, variant);
    const enfoncement = useEnfoncement();
    const plein = variant === 'filled';
    return (
        <PressableAnime
            onPress={() => {
                if (plein) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                onPress();
            }}
            onPressIn={enfoncement.onPressIn}
            onPressOut={enfoncement.onPressOut}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            style={[styles.bouton, { backgroundColor: fond }, disabled ? styles.desactive : null, style, enfoncement.style]}
        >
            {plein ? (
                <>
                    <LinearGradient colors={[theme.accent, theme.accentProfond]} style={styles.matiere} pointerEvents="none" />
                    <View style={[styles.lisere, { backgroundColor: `${theme.lightFont}38` }]} pointerEvents="none" />
                </>
            ) : null}
            {icon !== undefined ? <Icon icon={icon} size={20} color={teinte} /> : null}
            {/*
              * **Rien du tout quand le libelle est vide**, et pas un `<Text>` vide. Le conteneur pose
              * un `gap` entre ses enfants : un second enfant de largeur nulle consomme quand meme cet
              * espacement, et l'icone se retrouvait decalee de la moitie du gap (signale le
              * 2026-08-29). Un bouton sans libelle est la forme compacte d'une action dans une rangee.
              */}
            {label !== '' ? (
                /*
                 * **Une ligne, toujours.** Un libelle qui passe a la ligne deforme le bouton et pousse
                 * tout ce qui l'entoure (Android, 2026-09-08, « Se deconnecter »). `flexShrink` le
                 * laisse ceder plutot que deborder ; un libelle qui se tronque est trop long, a
                 * raccourcir dans les trois dictionnaires (docs/theme.md).
                 */
                <Text numberOfLines={1} style={[styles.libelle, { color: teinte }]}>
                    {label}
                </Text>
            ) : null}
        </PressableAnime>
    );
}

const styles = StyleSheet.create({
    bouton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.space.sm,
        minHeight: 50,
        paddingVertical: tokens.space.sm,
        paddingHorizontal: tokens.space.lg,
        // `radius.lg`, celui des cartes, depuis la troisieme passe de 7-J : a `md`, le bouton paraissait
        // un champ de saisie a cote des cartes qu'il suit.
        borderRadius: tokens.radius.lg,
    },
    desactive: {
        opacity: 0.5,
    },
    matiere: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: tokens.radius.lg,
    },
    lisere: {
        position: 'absolute',
        top: 0,
        left: tokens.radius.lg,
        right: tokens.radius.lg,
        height: StyleSheet.hairlineWidth * 2,
    },
    libelle: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.bold,
        letterSpacing: -0.2,
        flexShrink: 1,
    },
});

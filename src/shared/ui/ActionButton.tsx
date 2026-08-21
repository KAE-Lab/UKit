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
 * boutons bordes. **C'est le libelle qui porte le sens, jamais le fond.** Le modele est le bouton
 * « Reserver » de la fiche d'une bibliotheque (`LibraryDetailsScreen`), qui pose depuis toujours un
 * libelle `primary` gras sur `greyBackground`.
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
import { StyleProp, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { tokens, AppThemeType } from '../theme/Theme';
import { Icon, type IconSpec } from './Icon';

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

export function ActionButton({
    theme, label, onPress, variant = 'filled', icon, style, disabled = false,
}: ActionButtonProps) {
    const { fond, teinte } = habillage(theme, variant);

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: tokens.space.sm,
                    minHeight: 48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.lg,
                    // `radius.md`, comme toute surface carree de l'application. Voir docs/theme.md,
                    // « les surfaces sont des carres arrondis ».
                    borderRadius: tokens.radius.md,
                    backgroundColor: fond,
                },
                disabled ? { opacity: 0.5 } : null,
                style,
            ]}
        >
            {icon !== undefined ? <Icon icon={icon} size={20} color={teinte} /> : null}
            <Text style={{ color: teinte, fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

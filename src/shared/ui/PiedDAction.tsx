/**
 * Le pied d'action : l'action principale d'une fiche, flottante sur son contenu.
 *
 * Deux fiches le portaient chacune a la main — l'annonce (« S'inscrire », rempli en primaire) et la
 * bibliotheque (« Reserver », en surface de carte bordee). Un retour du formulaire a demande la
 * reservation de BU comme une fonction nouvelle : elle existait, et ne se voyait pas. Le motif
 * remonte donc ici (6.2.x), et les deux fiches parlent pareil : un `ActionButton` rempli — la seule
 * facon de dire « action principale » dans l'application (docs/theme.md) — au gabarit des flottants,
 * hauteur 50 et ombre partagee puisqu'il flotte, sur la fumee de `PiedFlottant`.
 *
 * L'ecran hote degage `PIED_FLOTTANT_DEGAGEMENT` en pied de defilement, comme pour tout flottant.
 */

import React from 'react';

import { tokens, type AppThemeType } from '../theme/Theme';
import { ActionButton } from './ActionButton';
import type { IconSpec } from './Icon';
import { PiedFlottant } from './PiedFlottant';

export interface PiedDActionProps {
    theme: AppThemeType;
    label: string;
    onPress: () => void;
    icon?: IconSpec;
    /** Le fond de la page hote, pour la fumee (PiedFlottant). */
    fond: string;
}

export function PiedDAction({ theme, label, onPress, icon, fond }: PiedDActionProps) {
    return (
        <PiedFlottant fond={fond}>
            <ActionButton
                theme={theme}
                variant="filled"
                label={label}
                icon={icon}
                onPress={onPress}
                // Hauteur 50 : le gabarit commun des flottants (barre de recherche, barre d'onglets).
                style={{ height: 50, ...tokens.shadow.md }}
            />
        </PiedFlottant>
    );
}

/**
 * La modale « Bientot » : ce que le voile des rangees mysterieuses et du bouton mysterieux promet.
 *
 * Une composition de `Dialogue`, et rien de plus : elle assume le teaser — « bientot disponible » —
 * et garde la porte du service quand l'etablissement en declare une. Elle vit ici parce qu'elle a
 * deux hotes de deux domaines : la grille de la Scolarite, et la barre d'onglets.
 */

import React from 'react';

import Translator from '../i18n/Translator';
import type { AppThemeType } from '../theme/Theme';
import { Dialogue } from './Dialogue';

export interface ModaleBientotProps {
    theme: AppThemeType;
    visible: boolean;
    fermer: () => void;
    /** Ouvre le service malgre tout, quand l'etablissement en declare un. Absent, pas de lien. */
    ouvrirQuandMeme?: () => void;
}

export function ModaleBientot({ theme, visible, fermer, ouvrirQuandMeme }: ModaleBientotProps) {
    return (
        <Dialogue
            theme={theme}
            visible={visible}
            fermer={fermer}
            titre={Translator.get('COMING_SOON_TITLE')}
            corps={Translator.get('COMING_SOON_BODY')}
            lien={ouvrirQuandMeme !== undefined
                ? { libelle: Translator.get('COMING_SOON_OPEN'), onPress: ouvrirQuandMeme }
                : undefined}
            libelleFermer={Translator.get('COMING_SOON_ACK')}
        />
    );
}

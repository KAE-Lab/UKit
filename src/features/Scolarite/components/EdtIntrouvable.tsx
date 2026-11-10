/**
 * La rangee qui dit l'absence de l'emploi du temps personnel, et sa relance.
 *
 * Chez Bordeaux INP, le dossier lit la ressource ADE de l'etudiant dans un arbre GWT ; quand l'arbre
 * n'est pas rendu a temps, ou ne preselectionne pas sa fiche, la ressource revient vide et le parcours
 * reussit quand meme. L'application cessait alors de proposer l'emploi du temps personnel sans rien
 * dire (registre, 2026-09-21). Decision du 2026-11-10 : **dire l'absence**, dans le vocabulaire de
 * rangees de l'onglet.
 *
 * Elle ne s'affiche que si le dernier dossier lu attendait une ressource et n'en a rendu aucune
 * (`edtPersonnelIntrouvable`, ScolariteMapping.ts), et si aucun emploi du temps personnel n'est deja
 * enregistre : celui d'une lecture precedente marche toujours, et le dire introuvable serait faux.
 *
 * La relance est « Actualiser », avec la confirmation de la fiche du compte : c'est le meme geste, une
 * nouvelle connexion au portail, et il ne doit pas partir sur un toucher distrait.
 */

import React, { useState } from 'react';

import Translator from '../../../shared/i18n/Translator';
import { toneColor, type AppThemeType } from '../../../shared/theme/Theme';
import { edtPersonnelActif } from '../../../shared/etablissements';
import type { ScolariteColdData } from '../services/ScolariteMapping';
import { ConfirmationScolarite } from './ConfirmationScolarite';
import { GroupeScolarite, LigneScolarite } from './LigneScolarite';

export interface EdtIntrouvableProps {
    theme: AppThemeType;
    coldData: ScolariteColdData | null;
    onActualiser: () => void;
}

export function EdtIntrouvable({ theme, coldData, onActualiser }: EdtIntrouvableProps) {
    const [confirmation, setConfirmation] = useState(false);

    if (coldData?.edtPersonnelIntrouvable !== true || edtPersonnelActif() !== null) return null;

    return (
        <>
            <GroupeScolarite theme={theme}>
                <LigneScolarite
                    theme={theme}
                    icon={{ name: 'calendar-alert' }}
                    teinte={toneColor(theme, 'warning')}
                    titre={Translator.get('EDT_PERSONNEL_INTROUVABLE')}
                    sousTitre={Translator.get('EDT_PERSONNEL_INTROUVABLE_DETAIL')}
                    chevron
                    onPress={() => setConfirmation(true)}
                />
            </GroupeScolarite>

            <ConfirmationScolarite
                theme={theme}
                visible={confirmation}
                titre={Translator.get('REFRESH_RECORD')}
                description={Translator.get('REFRESH_RECORD_DESC')}
                confirmer={Translator.get('CONFIRM')}
                onClose={() => setConfirmation(false)}
                onConfirm={() => {
                    setConfirmation(false);
                    onActualiser();
                }}
            />
        </>
    );
}

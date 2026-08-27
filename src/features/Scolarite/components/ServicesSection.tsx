/**
 * « Tes services » : ce que l'etudiant peut **ouvrir**.
 *
 * Des portes vers le navigateur integre, et une rangee qui porte en plus une donnee — la messagerie.
 * Aucune de ces rangees ne peut echouer : elles n'extraient rien.
 *
 * **Les adresses viennent du catalogue**, jamais d'une liste ecrite ici. Un etablissement qui ne
 * declare pas une adresse n'affiche pas la porte : pas de tuile morte, pas de message d'erreur. Une
 * grille ecrite en dur enverrait un etudiant de l'INP sur l'Apogee de Bordeaux — le defaut exact que
 * le jalon 6-G a corrige sur ces memes adresses (docs/phase-6/6-g-etablissements.md).
 *
 * **La messagerie a perdu la section qu'elle avait pour elle seule.** Un en-tete « MESSAGERIE » pour
 * une rangee unique etait une grammaire de plus, et il disparaissait en entier chez un etablissement
 * sans webmail extractible. Elle est ici parce que c'est ce qu'elle est : une porte, qui porte en
 * plus un compteur. Elle garde sa **forme de rangee pleine largeur**, et ce n'est pas cosmetique —
 * c'est elle qui lui permet d'afficher l'echec du parcours chaud et de mener a la ressaisie quand les
 * identifiants sont refuses, deux comportements gagnes au jalon 6-K qu'une tuile rendrait illisibles.
 */

import React from 'react';

import Translator, { type TranslationKey } from '../../../shared/i18n/Translator';
import { type AppThemeType } from '../../../shared/theme/Theme';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { serviceEtablissement } from '../../../shared/etablissements';
import type { UkitFailure } from '../../../shared/aetherius/failures';
import type { ScolariteColdData, ScolariteMailData } from '../services/ScolariteMapping';
import { GroupeScolarite, LigneScolarite } from './LigneScolarite';
import type { IconSpec } from '../../../shared/ui/Icon';
import MailboxRow from './MailboxRow';

/**
 * Les portes, dans l'ordre ou elles s'affichent.
 *
 * Le `point` est la cle du catalogue **et** le point d'entree du navigateur integre : les deux
 * portent le meme nom depuis le jalon 6-G, et les faire diverger creerait une table de correspondance
 * dont personne n'aurait besoin.
 *
 * `apogee` etait jusqu'ici **defini et atteint par aucun appel** de navigation, et une
 * `ApogeeCard` existait sans etre montee nulle part — deux limites que ce fichier ferme en les
 * remplacant par une rangee generique pilotee par le catalogue (docs/features/scolarite.md).
 */
const PORTES: readonly {
    readonly point: string;
    readonly titre: TranslationKey;
    readonly sousTitre: TranslationKey;
    readonly icone: IconSpec;
}[] = [
    { point: 'ent', titre: 'SERVICE_ENT', sousTitre: 'SERVICE_ENT_SUBTITLE', icone: { name: 'school' } },
    { point: 'moodle', titre: 'SERVICE_MOODLE', sousTitre: 'SERVICE_MOODLE_SUBTITLE', icone: { name: 'book-open-variant' } },
    { point: 'apogee', titre: 'SERVICE_APOGEE', sousTitre: 'SERVICE_APOGEE_SUBTITLE', icone: { name: 'chart-line' } },
];

export interface ServicesSectionProps {
    theme: AppThemeType;
    teinte: string;
    messagerieDisponible: boolean;
    mailData: ScolariteMailData | null;
    coldData: ScolariteColdData | null;
    scrapeStatus: string;
    sessionFailure: UkitFailure | null;
    onMessagerie: () => void;
    onPorte: (point: string) => void;
}

export function ServicesSection({
    theme, teinte, messagerieDisponible, mailData, coldData, scrapeStatus, sessionFailure,
    onMessagerie, onPorte,
}: ServicesSectionProps) {
    const ouvertes = PORTES.filter((porte) => serviceEtablissement(porte.point) !== null);

    // Rien a ouvrir et rien a compter : la section entiere disparait plutot que de montrer un
    // en-tete au-dessus du vide.
    if (!messagerieDisponible && ouvertes.length === 0) return null;

    return (
        <>
            <SectionHeader title={Translator.get('MY_SERVICES')} theme={theme} />
            <GroupeScolarite theme={theme}>
                {messagerieDisponible ? (
                    <MailboxRow
                        mailData={mailData}
                        coldData={coldData}
                        status={scrapeStatus}
                        failure={sessionFailure}
                        color={teinte}
                        theme={theme}
                        onPress={onMessagerie}
                    />
                ) : null}

                {ouvertes.map((porte) => (
                    <LigneScolarite
                        key={porte.point}
                        theme={theme}
                        icon={porte.icone}
                        teinte={teinte}
                        titre={Translator.get(porte.titre)}
                        sousTitre={Translator.get(porte.sousTitre)}
                        chevron
                        onPress={() => onPorte(porte.point)}
                    />
                ))}
            </GroupeScolarite>
        </>
    );
}

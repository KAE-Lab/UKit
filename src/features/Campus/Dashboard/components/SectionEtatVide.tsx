/**
 * Ce qu'une section du tableau de bord montre quand son carrousel n'a rien.
 *
 * Elle ne montrait **rien du tout** : un en-tete de section, son chevron, et le vide en dessous. Ca se
 * lit comme une application cassee, et c'est d'autant plus injuste que la cause la plus frequente est
 * un **filtre** — donc quelque chose que l'utilisateur a pose lui-meme et peut defaire.
 *
 * Trois causes, trois phrases, et surtout **trois gestes differents** :
 *
 * - un filtre masque tout → on propose de tout reafficher, ici meme ;
 * - la source a echoue → on **nomme** l'echec par le titre de sa famille (« Service indisponible »),
 *   et on propose Reessayer **si la famille le justifie** — c'est la table de
 *   `shared/aetherius/failures.ts` qui decide, pas ce composant. Sinon on renvoie a l'ecran dedie.
 *   Ne rien afficher n'etait pas « rester discret », c'etait laisser croire a un bug ;
 * - il n'y a legitimement rien → on le dit, sans proposer de geste : il n'y en a aucun.
 *
 * **La panne est une carte, le reste une ligne** (jalon 7-I). Une panne est un accident de la source :
 * la section garde la hauteur de ses cartes (CarteEnPanne), et rien ne remonte dessous. Un filtre qui
 * masque tout et une absence legitime restent une ligne : l'un est un geste de l'utilisateur, l'autre
 * la geographie, et une carte vide a leur place annoncerait un contenu qui ne viendra pas.
 */

import React from 'react';

import Translator from '../../../../shared/i18n/Translator';
import type { AppThemeType } from '../../../../shared/theme/Theme';
import type { UkitFailure } from '../../../../shared/aetherius';
import { CampusNotice } from '../../components/CampusLayoutComponents';
import { CarteEnPanne, type GabaritDePanne } from './CarteEnPanne';

export interface SectionEtatVideProps {
    theme: AppThemeType;
    /** L'echec de la source, quand il y en a un. */
    failure?: UkitFailure;
    /** La source a rendu des elements, mais le filtre courant les masque tous. */
    masquesParFiltre: boolean;
    /**
     * Ce qu'on dit quand il n'y a legitimement rien. **Absent, la section ne dit rien** : c'est le cas
     * des annonces, ou une absence de contenu editorial ne merite pas de ligne.
     */
    messageVide?: string;
    /** Remet le filtre a `all`. Absent quand la section n'a pas de filtre. */
    onToutAfficher?: () => void;
    /** Ouvre l'ecran dedie, ou l'echec s'explique. */
    onOuvrir: () => void;
    /** Rejoue la source. Propose seulement si la famille d'echec est reessayable. */
    onRetry?: () => void;
    /** Le gabarit des cartes de la section, que la carte en panne reprend. */
    gabarit?: GabaritDePanne;
}

export function SectionEtatVide({
    theme, failure, masquesParFiltre, messageVide, onToutAfficher, onOuvrir, onRetry, gabarit,
}: SectionEtatVideProps) {
    if (failure !== undefined && failure.silent !== true) {
        const action = failure.retryable && onRetry !== undefined
            ? { libelle: Translator.get('RETRY'), onPress: onRetry }
            : { libelle: Translator.get('SEE_ALL'), onPress: onOuvrir };
        return <CarteEnPanne theme={theme} failure={failure} action={action} gabarit={gabarit} />;
    }

    if (masquesParFiltre && onToutAfficher !== undefined) {
        return (
            <CampusNotice
                theme={theme}
                icon="filter-outline"
                message={Translator.get('SECTION_ALL_FILTERED')}
                actionLabel={Translator.get('SHOW_ALL')}
                onAction={onToutAfficher}
            />
        );
    }

    if (messageVide === undefined) return null;
    return <CampusNotice theme={theme} icon="information-outline" message={messageVide} />;
}

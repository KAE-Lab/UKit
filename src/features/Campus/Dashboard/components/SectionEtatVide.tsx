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
 *   trois mots qui tiennent sur une ligne, et on propose Reessayer **si la famille le justifie** —
 *   c'est la table de `shared/aetherius/failures.ts` qui decide, pas ce composant. Sinon on renvoie a
 *   l'ecran dedie, ou vit le message complet. La decision du tableau de bord ne change pas — ce n'est
 *   pas ici qu'on **explique** une panne — mais ne rien afficher n'etait pas « rester discret »,
 *   c'etait laisser croire a un bug ;
 * - il n'y a legitimement rien → on le dit, sans proposer de geste : il n'y en a aucun.
 */

import React from 'react';

import Translator from '../../../../shared/i18n/Translator';
import type { AppThemeType } from '../../../../shared/theme/Theme';
import type { UkitFailure } from '../../../../shared/aetherius';
import { CampusNotice } from '../../components/CampusLayoutComponents';

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
}

export function SectionEtatVide({
    theme, failure, masquesParFiltre, messageVide, onToutAfficher, onOuvrir, onRetry,
}: SectionEtatVideProps) {
    if (failure !== undefined && failure.silent !== true) {
        const rejouable = failure.retryable && onRetry !== undefined;
        return (
            <CampusNotice
                theme={theme}
                icon="cloud-off-outline"
                message={Translator.get(failure.titleKey)}
                actionLabel={rejouable ? Translator.get('RETRY') : Translator.get('SEE_ALL')}
                onAction={rejouable ? onRetry : onOuvrir}
            />
        );
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

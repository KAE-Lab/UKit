/**
 * La feuille d'un widget en echec : la phrase que la tuile ne dit pas.
 *
 * Une tuile de 120 points ne peut pas ecrire « Ce service de ton universite ne repond pas » sans
 * tronquer, et une phrase tronquee est une impasse. Elle ne dit donc que deux mots, et c'est ici que
 * la phrase se lit — le titre et le message de l'echec, tels que `ScolariteMapping` les presente —
 * avec le geste qui va avec :
 *
 *   - **Relancer** relit ce seul widget, avec la meme reservation du navigateur que le
 *     rafraichissement global. Propose pour toute famille sauf `engine` — « un probleme de notre
 *     cote », que rejouer ne repare pas (docs/features/scolarite.md, limites) ;
 *   - **Ressaisir mes identifiants**, en lien discret, quand l'echec dit qu'il manque une
 *     information (`config`). Un refus d'identifiants, lui, n'arrive pas jusqu'ici : la tuile mene
 *     directement a la ressaisie.
 *
 * Le `detail` du moteur n'est pas affiche : c'est un message technique, journalise par ailleurs, et
 * la feuille ne diagnostique pas.
 */

import React from 'react';

import Translator from '../../../shared/i18n/Translator';
import type { AppThemeType } from '../../../shared/theme/Theme';
import type { UkitFailure } from '../../../shared/aetherius/failures';
import { Dialogue } from '../../../shared/ui/Dialogue';
import { presenterEchec } from '../services/ScolariteMapping';
import { echecDeTuile } from '../widgets/presentation';

export interface FeuilleDeWidgetProps {
    theme: AppThemeType;
    echec: UkitFailure;
    visible: boolean;
    fermer: () => void;
    /** Relit ce seul widget. Absent, ou famille qu'une relance ne repare pas : pas de bouton. */
    onRelancer?: () => void;
    /** Ouvre la fiche du compte en ressaisie. */
    onRessaisir?: () => void;
}

export function FeuilleDeWidget({ theme, echec, visible, fermer, onRelancer, onRessaisir }: FeuilleDeWidgetProps) {
    const presentation = presenterEchec(echec);
    const decision = echecDeTuile(echec);
    const ressaisie = decision.famille === 'ressaisie' || echec.kind === 'config';

    return (
        <Dialogue
            theme={theme}
            visible={visible}
            fermer={fermer}
            titre={Translator.get(presentation.titleKey)}
            corps={Translator.get(presentation.messageKey)}
            action={decision.relancable && onRelancer !== undefined
                ? { libelle: Translator.get('WIDGET_RELAUNCH'), onPress: onRelancer }
                : undefined}
            lien={ressaisie && onRessaisir !== undefined
                ? { libelle: Translator.get('REENTER_CREDENTIALS'), onPress: onRessaisir }
                : undefined}
        />
    );
}

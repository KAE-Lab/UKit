/**
 * Un echec de source, tel qu'un ecran le montre.
 *
 * Le composant vivait dans `features/Campus/components/CampusLayoutComponents.tsx` jusqu'au jalon
 * 6-E, ou le planning a eu besoin du meme rendu. Il a donc remonte dans `shared/ui/` plutot que
 * d'etre importe d'une feature a l'autre — une dependance croisee entre deux dossiers de `features/`
 * est ce que [architecture.md](../../../docs/architecture.md) demande d'eviter, et deux copies du
 * meme message auraient diverge a la premiere retouche.
 *
 * Ce qu'il decide, il ne le decide pas lui-meme : **le bouton Reessayer n'apparait que si la famille
 * d'echec est reessayable.** Le proposer sur un echec que rejouer ne repare pas — une source qui a
 * change de contrat — serait pire que de ne rien proposer. C'est la table de
 * [`failures.ts`](../aetherius/failures.ts) qui tranche.
 *
 * Il porte un **titre** et un message, et les deux viennent de la meme table : `titleKey` dit ce qui
 * s'est passe (« Service indisponible »), `messageKey` ce qu'on peut y faire (« Verifie ta connexion,
 * puis reessaie »). Ils ne se choisissent jamais separement — un titre de famille au-dessus d'un
 * message de code dirait deux choses differentes du meme echec.
 *
 * Depuis le jalon 6-J il porte aussi une **action qui n'est pas une reprise** : « colle ton lien »,
 * « connecte ton compte ». La distinction est la meme que celle du bouton Reessayer, prise par l'autre
 * bout — reessayer repare une panne, une action repare une **absence**. Un echec de famille `config`
 * n'a jamais de bouton Reessayer et peut parfaitement avoir une action, et c'est precisement le cas
 * qui a motive ce jalon : l'onglet Planning d'une universite qui attend un lien n'est pas en panne, il
 * attend un geste. Les deux ne s'affichent jamais ensemble.
 */

import React from 'react';

import Translator from '../i18n/Translator';
import { AppThemeType } from '../theme/Theme';
import { EmptyState, type EmptyStateAction } from './EmptyState';
import type { UkitFailure } from '../aetherius';

/**
 * Le geste qui remplirait l'ecran, quand il en existe un. Jamais une reprise.
 *
 * Meme forme qu'une action d'etat vide, et c'est voulu : depuis le jalon 6-K les deux blocs partagent
 * leur mise en page ([`EmptyState`](EmptyState.tsx)). Le nom local reste, il est deja importe ailleurs.
 */
export type NoticeAction = EmptyStateAction;

interface SourceFailureNoticeProps {
    failure: UkitFailure;
    theme: AppThemeType;
    onRetry?: () => void;
    action?: NoticeAction;
    /** Comme `EmptyState` : `plain` quand l'echec **est** l'ecran, `card` dans une liste qui defile. */
    variant?: 'card' | 'plain';
}

export function SourceFailureNotice({ failure, theme, onRetry, action, variant = 'card' }: SourceFailureNoticeProps) {
    // Une action proposee remplace la reprise : les deux au meme endroit rendraient la cible ambigue,
    // et un echec qui porte une action n'est de toute facon jamais reessayable (famille `config`).
    const bouton: NoticeAction | null = action
        ? action
        : failure.retryable && onRetry
            ? { label: Translator.get('RETRY'), onPress: onRetry, icon: 'refresh' }
            : null;

    return (
        <EmptyState
            variant={variant}
            tone={failure.tone}
            // Le nuage barre dit « source injoignable » — faux quand rien n'est en panne : le lien
            // iCal attendu est un geste qui manque, et son icone est celle du geste, la meme que la
            // page qui le recoit et la rangee des Reglages qui y mene.
            icon={failure.code === 'EDT_LIEN_ATTENDU' ? 'calendar-import' : 'cloud-off-outline'}
            title={Translator.get(failure.titleKey)}
            message={Translator.get(failure.messageKey)}
            theme={theme}
            action={bouton}
        />
    );
}

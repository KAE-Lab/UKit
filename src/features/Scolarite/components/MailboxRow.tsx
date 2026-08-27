import React from 'react';
import { ActivityIndicator } from 'react-native';

import { type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import type { UkitFailure } from '../../../shared/aetherius/failures';
import { presenterEchec } from '../services/ScolariteMapping';
import type { ScolariteColdData, ScolariteMailData } from '../services/ScolariteMapping';
import { CompteurScolarite, LigneScolarite } from './LigneScolarite';

/**
 * La rangee « Messagerie » : un compteur de non-lus, et la porte vers le webmail.
 *
 * Elle porte aussi **l'echec** du parcours chaud depuis le jalon 6-F. Sans ca, une messagerie
 * injoignable laissait l'indicateur tourner indefiniment : impossible de distinguer « ca charge » de
 * « ca a echoue », ce qui est exactement l'erreur avalee que la Phase 6 supprime.
 *
 * Elle a **perdu sa section a elle** : un en-tete « MESSAGERIE » pour une seule ligne etait une
 * grammaire de plus, et chez un etablissement sans webmail extractible cette section disparaissait
 * en entier. Elle vit desormais dans « Tes services », avec les portes — c'est bien ce qu'elle est,
 * une porte qui porte en plus une donnee. Elle garde sa **forme de rangee pleine largeur** parce que
 * c'est elle qui lui permet d'afficher un echec et de mener a la ressaisie ; une tuile ne le ferait
 * pas (voir ScolariteDashboard).
 */

/** Ce que la rangee annonce : l'echec s'il y en a un, sinon le compte, accorde. */
const libelle = (echec: UkitFailure | null, unread: number | null | undefined): string => {
    if (echec) return Translator.get(presenterEchec(echec).messageKey);
    if (unread == null || unread <= 0) return Translator.get('MAILBOX_NO_UNREAD');
    return Translator.get(unread === 1 ? 'MAILBOX_UNREAD_ONE' : 'MAILBOX_UNREAD_MANY', unread);
};

/**
 * Ce que la rangee montre, decide hors du rendu.
 *
 * Un echec **silencieux** est un run annule : l'utilisateur est deja parti, il n'y a rien a lui
 * dire, et la rangee se comporte comme s'il n'y avait pas eu d'echec.
 */
const etatDeLaRangee = ({ mailData, status, failure }: {
    mailData: ScolariteMailData | null;
    status: string;
    failure: UkitFailure | null;
}) => {
    const echec = failure && !failure.silent ? failure : null;
    const unread = mailData?.unreadCount;

    return {
        echec,
        unread,
        loading: !echec && !mailData && (status === 'connecting' || status === 'scraping'),
        hasUnread: !echec && unread != null && unread > 0,
    };
};

export interface MailboxRowProps {
    mailData: ScolariteMailData | null;
    coldData: ScolariteColdData | null;
    status: string;
    failure: UkitFailure | null;
    color: string;
    theme: AppThemeType;
    onPress: () => void;
}

const MailboxRow = ({ mailData, coldData, status, failure, color, theme, onPress }: MailboxRowProps) => {
    const { echec, unread, loading, hasUnread } = etatDeLaRangee({ mailData, status, failure });
    const teinte = echec ? theme.danger : color;

    return (
        <LigneScolarite
            theme={theme}
            icon={{ name: echec ? 'email-alert-outline' : 'email-outline' }}
            teinte={teinte}
            titre={libelle(echec, unread)}
            sousTitre={coldData?.emailAddress}
            attenue={echec !== null}
            onPress={onPress}
            chevron
            droite={loading
                ? <ActivityIndicator size="small" color={color} />
                : (hasUnread
                    ? <CompteurScolarite valeur={unread as number} teinte={color} theme={theme} />
                    : null)}
        />
    );
};

export default MailboxRow;

/**
 * Ou ecrire, et pourquoi une synchronisation a echoue — dit a l'utilisateur, pas seulement au menu
 * de developpement.
 *
 * Deux retours du formulaire (tries le 2026-11-10) disaient « la synchronisation a echoue » sans rien
 * d'autre, et c'est tout ce que l'application leur montrait : la raison etait enregistree
 * (`tentative.ts`) mais ne se lisait que dans le menu de developpement. Elle se classe desormais en
 * une **cause**, que les reglages traduisent en une phrase.
 *
 * Et une cause n'avait pas de garde du tout : un calendrier du telephone **en lecture seule** — les
 * jours feries, les anniversaires, un agenda partage — se laissait choisir, et chaque ecriture levait
 * une exception native illisible. Il est refuse avant d'ecrire. Le calendrier « UKit » que
 * l'application cree reste le repli : choisi, il se recree s'il a ete supprime du telephone, au lieu
 * de viser pour toujours un identifiant mort.
 *
 * Pur, sans dependance de plateforme : `expo-calendar` reste dans CalendarSyncHelpers et AppCore.
 * Teste par cible.test.ts.
 *
 * Voir docs/features/settings.md.
 */

import type { UkitFailureKind } from '../../aetherius/failures';

/** Le nom du calendrier dedie, et la valeur symbolique qui le designe dans les reglages. */
export const CALENDRIER_UKIT = 'UKit';

/** Ce qu'il faut d'un calendrier du telephone pour decider : la forme d'`expo-calendar`, reduite. */
export interface CalendrierConnu {
    readonly id: string;
    readonly title: string;
    readonly allowsModifications: boolean;
}

/**
 * Pourquoi une synchronisation n'a pas abouti, en une famille que l'ecran sait dire.
 *
 * `source-*` : l'emploi du temps n'a pas pu etre lu, l'agenda est reste tel quel. `permission` et
 * `calendrier-*` : la cible ne peut pas recevoir d'evenements, aucune lecture n'a ete faite.
 * `ecriture` : le telephone a refuse en cours de route.
 */
export type CauseEchecSynchro =
    | 'source-injoignable'
    | 'source-autre'
    | 'permission'
    | 'calendrier-introuvable'
    | 'calendrier-lecture-seule'
    | 'ecriture';

export const CAUSES: readonly CauseEchecSynchro[] = [
    'source-injoignable', 'source-autre', 'permission', 'calendrier-introuvable', 'calendrier-lecture-seule', 'ecriture',
];

/** La cible resolue : un identifiant ou ecrire, le calendrier UKit a creer, ou un refus. */
export type Cible =
    | { readonly kind: 'ecrire'; readonly id: string; readonly ukit: boolean }
    | { readonly kind: 'creer-ukit' }
    | { readonly kind: 'refus'; readonly cause: CauseEchecSynchro };

/**
 * Le calendrier UKit existant, s'il y en a un d'ecrivable.
 *
 * Par son titre, comme partout dans le depot : c'est le seul nom qu'on lui donne a la creation.
 */
function calendrierUkit(calendriers: readonly CalendrierConnu[]): CalendrierConnu | undefined {
    return calendriers.find((calendrier) => calendrier.title === CALENDRIER_UKIT && calendrier.allowsModifications);
}

/**
 * Ou ecrire, avant toute lecture de l'emploi du temps.
 *
 * Trois cas pour une cible enregistree par son identifiant : il n'existe plus (compte retire du
 * telephone, calendrier supprime), il est en lecture seule, ou il est ecrivable. Un identifiant qui
 * designe le calendrier UKit est traite comme lui : les installations d'avant le 2026-11-10 gardaient
 * l'identifiant resolu a la place de la valeur symbolique.
 */
export function resoudreCible(cible: string | number, calendriers: readonly CalendrierConnu[]): Cible {
    if (cible === CALENDRIER_UKIT) {
        const ukit = calendrierUkit(calendriers);
        return ukit !== undefined ? { kind: 'ecrire', id: ukit.id, ukit: true } : { kind: 'creer-ukit' };
    }

    const trouve = calendriers.find((calendrier) => String(calendrier.id) === String(cible));
    if (trouve === undefined) return { kind: 'refus', cause: 'calendrier-introuvable' };
    if (!trouve.allowsModifications) return { kind: 'refus', cause: 'calendrier-lecture-seule' };
    return { kind: 'ecrire', id: trouve.id, ukit: trouve.title === CALENDRIER_UKIT };
}

/**
 * Les calendriers du telephone qu'on peut choisir comme cible : ceux qui acceptent l'ecriture, hors
 * UKit, que le choix propose a part et en tete.
 */
export function calendriersChoisissables<T extends CalendrierConnu>(calendriers: readonly T[]): T[] {
    return calendriers.filter((calendrier) => calendrier.title !== CALENDRIER_UKIT && calendrier.allowsModifications);
}

/** La cause d'un echec de la source. Seule l'indisponibilite se dit autrement : elle passera seule. */
export function causeDeLaSource(kind: UkitFailureKind): CauseEchecSynchro {
    return kind === 'unavailable' ? 'source-injoignable' : 'source-autre';
}

function estUneCause(valeur: unknown): valeur is CauseEchecSynchro {
    return CAUSES.some((cause) => cause === valeur);
}

/** Relit une cause persistee ; une valeur inconnue rend `undefined`, et l'ecran dit l'echec sans cause. */
export function lireCause(valeur: unknown): CauseEchecSynchro | undefined {
    return estUneCause(valeur) ? valeur : undefined;
}

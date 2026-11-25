/**
 * Les echecs de source que l'application mesure (`source.echec`, granularite de l'heure) et les
 * connexions universitaires (`scolarite.connexion`) : le lecteur « pilotage » de docs/mesure.md, qui
 * les pose contre les sondes du matin.
 *
 * La cle d'un echec est `<hote>:<famille>` (src/shared/mesure/vocabulaire.ts) : l'hote peut porter un
 * port, donc un deux-points ; la famille est toujours apres le dernier.
 *
 * Pur : joue par `npm test` a la racine du depot (sources.test.ts).
 */

import type { Mesure } from './mesures';

export const ECHEC = 'source.echec';
export const CONNEXION = 'scolarite.connexion';

export interface CleDEchec {
    readonly hote: string;
    readonly famille: string;
}

export function decouperCle(cle: string): CleDEchec {
    const i = cle.lastIndexOf(':');
    if (i <= 0 || i === cle.length - 1) return { hote: cle === '' ? '?' : cle, famille: '?' };
    return { hote: cle.slice(0, i), famille: cle.slice(i + 1) };
}

/** Retient les echecs d'un hote, ou tous. */
export function dHote(hote: string | null): (m: Mesure) => boolean {
    return (m) => hote === null || decouperCle(m.cle).hote === hote;
}

/** Les echecs par hote ou par famille, pour un hote ou pour tous. */
export function echecsPar(mesures: readonly Mesure[], partie: keyof CleDEchec, hote: string | null = null): Map<string, number> {
    const garder = dHote(hote);
    const comptes = new Map<string, number>();
    for (const m of mesures) {
        if (m.evenement !== ECHEC || !garder(m)) continue;
        const valeur = decouperCle(m.cle)[partie];
        comptes.set(valeur, (comptes.get(valeur) ?? 0) + m.n);
    }
    return comptes;
}

/** Les familles du moteur (`FailureKind` d'Aetherius), dites pour qui lit la page. */
export const FAMILLES: Readonly<Record<string, string>> = {
    unavailable: 'injoignable',
    blocked: 'échec nommé',
    rejected: 'réponse refusée',
    data: 'page changée',
    config: 'saisie absente',
    engine: 'erreur du moteur',
    blueprint: 'Blueprint faux',
    unsupported: 'non pris en charge',
    cancelled: 'annulé',
};

/**
 * Les resultats d'un sondage dans la console (phase 8, lot 4) : par choix, les voix attestees, protegees
 * comme toute case de la console (`proteger`, docs/mesure.md) ; et les voix non attestees a part, qui ne
 * comptent pas dans l'application. Pur : joue par `npm test` a la racine (resultats.test.ts).
 */

import type { ChoixDeSondage } from '../../../../src/shared/annonces/sondage';
import { masquer, proteger, type Affiche } from '../../stats/cases';

export interface ResultatDeChoix {
    readonly id: string;
    readonly libelle: string;
    readonly voix: Affiche;
}

export interface ResultatsDuSondage {
    readonly choix: readonly ResultatDeChoix[];
    readonly attestees: number | null;
    readonly nonAttestees: number | null;
}

/** Les votes lus (`valeur`, `poids`) d'un sondage, comptes sur ses choix actuels : un choix retire perd ses voix. */
export function compterLeSondage(votes: readonly unknown[], choix: readonly ChoixDeSondage[]): ResultatsDuSondage {
    const parChoix = new Map(choix.map((c) => [c.id, 0]));
    let nonAttestees = 0;
    for (const v of votes) {
        const vote = v as { valeur?: unknown; poids?: unknown } | null;
        if (vote === null || typeof vote.valeur !== 'string' || !parChoix.has(vote.valeur)) continue;
        if (vote.poids === 0) nonAttestees++;
        else parChoix.set(vote.valeur, (parChoix.get(vote.valeur) ?? 0) + 1);
    }
    const comptes = choix.map((c) => parChoix.get(c.id) ?? 0);
    const affiches = proteger(comptes);
    return {
        choix: choix.map((c, i) => ({ id: c.id, libelle: c.libelle, voix: affiches[i] ?? null })),
        attestees: masquer(comptes.reduce((a, b) => a + b, 0)),
        nonAttestees: masquer(nonAttestees),
    };
}

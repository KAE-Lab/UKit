/**
 * Les « moi aussi » d'un probleme connu (phase 8, lot 3) : combien, dont combien d'appareils attestes, et
 * quels appareils sont touches — la plateforme, le modele, le systeme et la version que porte chaque
 * vote, et rien d'autre. Pur : joue par `npm test` a la racine (voix.test.ts).
 */

export interface AppareilTouche {
    readonly plateforme: string;
    readonly appareil: string;
    readonly systeme: string;
    readonly version: string;
    readonly n: number;
}

export interface Voix {
    readonly total: number;
    readonly attestes: number;
    readonly appareils: readonly AppareilTouche[];
}

/** Les votes lus (`sujet`, `cible`, `valeur`, `poids`) d'un probleme, comptes. */
export function compterLesVoix(votes: readonly unknown[]): Voix {
    const parAppareil = new Map<string, AppareilTouche>();
    let total = 0;
    let attestes = 0;
    for (const v of votes) {
        const vote = v as { valeur?: unknown; poids?: unknown } | null;
        if (vote === null || typeof vote.valeur !== 'string') continue;
        total++;
        if (vote.poids === 1) attestes++;
        const [plateforme = '', appareil = '', systeme = '', version = ''] = vote.valeur.split('|');
        const cle = vote.valeur;
        const connu = parAppareil.get(cle);
        parAppareil.set(cle, { plateforme, appareil, systeme, version, n: (connu?.n ?? 0) + 1 });
    }
    const appareils = [...parAppareil.values()].sort((a, b) => b.n - a.n || a.appareil.localeCompare(b.appareil));
    return { total, attestes, appareils };
}

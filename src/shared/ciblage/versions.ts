/**
 * Le comparateur de versions de l'application, borne a la forme `X.Y.Z`.
 *
 * Vingt lignes plutot qu'une dependance, et ce n'est pas de l'economie : la base garantit la forme
 * des bornes par un `check` (`^\d+\.\d+\.\d+$`, supabase/schema.sql) et la version de l'application
 * est celle d'app.config.ts, ecrite par nous. Il n'y a ni pre-release, ni `v` en prefixe, ni `6.1`
 * court a absorber — les absorber ici reviendrait a accepter dans l'application ce que la base
 * refuse a la source.
 *
 * **Une version illisible ignore les bornes** (fail open). Un message d'incident ne doit jamais etre
 * cache par un defaut de forme de notre cote : un message de trop se remarque et se corrige, un
 * incident passe sous silence ne se remarque pas. Une borne illisible ne peut pas venir de la base ;
 * si elle arrive quand meme — un cache d'une autre epoque — elle ne s'applique pas, pour la meme
 * raison.
 *
 * Pur, sans import : jouable sous vitest (versions.test.ts).
 */

const FORME = /^(\d+)\.(\d+)\.(\d+)$/;

export type Version = readonly [number, number, number];

/** `6.1.0` -> `[6, 1, 0]` ; tout le reste -> `null`. */
export function lireVersion(texte: string | null | undefined): Version | null {
    if (typeof texte !== 'string') return null;
    const correspondance = FORME.exec(texte.trim());
    if (correspondance === null) return null;
    return [Number(correspondance[1]), Number(correspondance[2]), Number(correspondance[3])];
}

/** Un comparateur de tri : -1, 0 ou 1. `null` des qu'une des deux n'est pas lisible. */
export function comparerVersions(a: string, b: string): -1 | 0 | 1 | null {
    const va = lireVersion(a);
    const vb = lireVersion(b);
    if (va === null || vb === null) return null;
    for (let rang = 0; rang < 3; rang++) {
        if (va[rang] < vb[rang]) return -1;
        if (va[rang] > vb[rang]) return 1;
    }
    return 0;
}

/**
 * La version est-elle dans la fenetre `[min, max]`, bornes incluses ?
 *
 * `null` (ou une chaine vide) vaut « pas de borne ». Une version ou une borne illisible rend la
 * borne inoperante : voir l'en-tete, c'est le sens de l'erreur choisi.
 */
export function versionDansFenetre(
    version: string | null | undefined,
    min: string | null | undefined,
    max: string | null | undefined,
): boolean {
    const courante = lireVersion(version);
    if (courante === null) return true;

    if (typeof min === 'string' && min !== '' && comparerVersions(version as string, min) === -1) return false;
    if (typeof max === 'string' && max !== '' && comparerVersions(version as string, max) === 1) return false;
    return true;
}

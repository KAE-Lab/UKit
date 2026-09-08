/**
 * Le ciblage d'un contenu publie : a qui une ligne s'adresse, et si cet appareil en fait partie.
 *
 * Partage par les annonces et les messages de service, qui portent les cinq memes colonnes
 * (jalon 6.1-B, puis la plateforme au 6.1.x-D). Le module est pur — aucune plateforme — pour que la regle se verifie sous vitest ;
 * ce que l'appareil sait de lui-meme (`ContexteDeCiblage`) vient de la couture `contexte.ts`.
 *
 * Le sens de l'erreur est **restrictif**, a l'inverse des salutations : une audience qu'on ne
 * connait pas existe pour cacher quelque chose, pas pour le montrer. Une version de l'application
 * qui rencontre une troisieme audience — publiee avant que le parc ne la connaisse — ne montre rien,
 * ce qui est l'intention de qui l'a ecrite.
 *
 * Voir docs/pilotage.md.
 */

import { versionDansFenetre } from './versions';

export type Audience = 'tous' | 'testeurs' | 'inconnue';

/** Les plateformes que le parc connait. Une troisieme, publiee avant d'exister ici, ne vise personne. */
export type Plateforme = 'ios' | 'android';
export const PLATEFORMES: readonly Plateforme[] = ['ios', 'android'];

/** Ce qu'une ligne publiee dit de qui doit la voir. */
export interface Ciblage {
    readonly audience: Audience;
    /** Les codes d'etablissement vises ; `null` = tous. */
    readonly etablissements: readonly string[] | null;
    /** La fenetre de versions de l'application, bornes incluses ; `null` = pas de borne. */
    readonly version_min: string | null;
    readonly version_max: string | null;
    /** Les plateformes visees ; `null` = les deux. Un tableau vide apres nettoyage cache (voir `plateformes`). */
    readonly plateformes: readonly Plateforme[] | null;
}

/** Ce que l'appareil sait de lui-meme au moment de presenter. */
export interface ContexteDeCiblage {
    readonly testeur: boolean;
    readonly etablissement: string;
    readonly version: string | null;
    /** `inconnue` sur une plateforme que `Platform.OS` ne nomme pas ios ni android. */
    readonly plateforme: Plateforme | 'inconnue';
}

/** Le ciblage d'une ligne qui n'en porte pas : tout le monde, partout, toujours. */
export const CIBLAGE_TOUS: Ciblage = {
    audience: 'tous',
    etablissements: null,
    version_min: null,
    version_max: null,
    plateformes: null,
};

function audience(valeur: unknown): Audience {
    if (valeur === 'tous' || valeur === 'testeurs') return valeur;
    // Une colonne absente — une ligne d'avant les colonnes, ou un cache d'une autre epoque — vaut
    // « tous » : c'est ce que la base met par defaut, et ce que le parc voyait avant le jalon.
    if (valeur === null || valeur === undefined) return 'tous';
    return 'inconnue';
}

/**
 * Les etablissements vises, reduits a une liste de codes.
 *
 * `null` et le tableau **vide** valent tous les deux « tous » : une console qui aurait decoche
 * chaque case n'a pas voulu cacher le contenu a tout le monde, elle n'a rien voulu cibler.
 */
function etablissements(valeur: unknown): readonly string[] | null {
    if (!Array.isArray(valeur)) return null;
    const codes = valeur.filter((code): code is string => typeof code === 'string' && code !== '');
    return codes.length > 0 ? codes : null;
}

function borne(valeur: unknown): string | null {
    return typeof valeur === 'string' && valeur !== '' ? valeur : null;
}

/**
 * Les plateformes visees.
 *
 * Meme lecture que les etablissements pour `null` et le tableau vide — la console qui n'a rien coche
 * n'a rien voulu cibler. Mais une valeur **inconnue est ecartee, pas ignoree** : `['tv']` rend un
 * tableau vide qui cache, parce qu'une plateforme qu'on ne connait pas n'est pas la notre — le meme
 * sens restrictif qu'une audience inconnue.
 */
function plateformes(valeur: unknown): readonly Plateforme[] | null {
    if (!Array.isArray(valeur) || valeur.length === 0) return null;
    return valeur.filter((code): code is Plateforme => PLATEFORMES.includes(code as Plateforme));
}

/** Projette les cinq colonnes d'une ligne, quelle que soit sa table. Defensif : la ligne peut venir d'un cache. */
export function projeterCiblage(ligne: {
    readonly audience?: unknown;
    readonly etablissements?: unknown;
    readonly version_min?: unknown;
    readonly version_max?: unknown;
    readonly plateformes?: unknown;
}): Ciblage {
    return {
        audience: audience(ligne.audience),
        etablissements: etablissements(ligne.etablissements),
        version_min: borne(ligne.version_min),
        version_max: borne(ligne.version_max),
        plateformes: plateformes(ligne.plateformes),
    };
}

/** Cet appareil fait-il partie de qui doit voir la ligne ? */
export function estCible(ciblage: Ciblage, contexte: ContexteDeCiblage): boolean {
    if (ciblage.audience === 'inconnue') return false;
    if (ciblage.audience === 'testeurs' && !contexte.testeur) return false;
    if (ciblage.etablissements !== null && !ciblage.etablissements.includes(contexte.etablissement)) return false;
    if (ciblage.plateformes !== null && !ciblage.plateformes.includes(contexte.plateforme as Plateforme)) return false;
    return versionDansFenetre(contexte.version, ciblage.version_min, ciblage.version_max);
}

/**
 * Le ciblage, tel que l'appareil l'applique — recopie pour la fonction d'envoi.
 *
 * La fonction `notifier` doit decider AVANT d'envoyer qui doit voir un message : la meme regle que
 * `src/shared/ciblage/` sur l'appareil, sans quoi un push atteindrait des telephones ou le message
 * ne s'afficherait pas. Deno exige des extensions explicites dans les imports et ne lit pas le
 * `tsconfig` de l'application : le module est donc recopie ici, **sans aucun import**, et un test
 * (`regles.test.ts`, joue par le `npm test` de la racine) verifie qu'il rend la meme reponse que
 * l'original sur une matrice de cas. Une divergence casse le test, pas le parc.
 */

export type Plateforme = 'ios' | 'android';
const PLATEFORMES: readonly Plateforme[] = ['ios', 'android'];

export interface Ciblage {
    readonly audience: 'tous' | 'testeurs' | 'inconnue';
    readonly etablissements: readonly string[] | null;
    readonly version_min: string | null;
    readonly version_max: string | null;
    readonly plateformes: readonly Plateforme[] | null;
}

export interface Appareil {
    readonly testeur: boolean;
    readonly etablissement: string;
    readonly version: string | null;
    readonly plateforme: Plateforme | 'inconnue';
}

const FORME_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

function lireVersion(texte: unknown): [number, number, number] | null {
    if (typeof texte !== 'string') return null;
    const m = FORME_VERSION.exec(texte.trim());
    return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])];
}

function comparer(a: string, b: string): -1 | 0 | 1 | null {
    const va = lireVersion(a);
    const vb = lireVersion(b);
    if (va === null || vb === null) return null;
    for (let rang = 0; rang < 3; rang++) {
        if (va[rang] < vb[rang]) return -1;
        if (va[rang] > vb[rang]) return 1;
    }
    return 0;
}

function versionDansFenetre(version: string | null, min: string | null, max: string | null): boolean {
    if (lireVersion(version) === null) return true;
    if (typeof min === 'string' && min !== '' && comparer(version as string, min) === -1) return false;
    if (typeof max === 'string' && max !== '' && comparer(version as string, max) === 1) return false;
    return true;
}

export function projeterCiblage(ligne: Record<string, unknown>): Ciblage {
    const audience = ligne.audience === 'tous' || ligne.audience === 'testeurs'
        ? ligne.audience
        : (ligne.audience === null || ligne.audience === undefined ? 'tous' : 'inconnue');
    const etablissements = Array.isArray(ligne.etablissements)
        ? ligne.etablissements.filter((code): code is string => typeof code === 'string' && code !== '')
        : [];
    const plateformes = Array.isArray(ligne.plateformes) && ligne.plateformes.length > 0
        ? ligne.plateformes.filter((code): code is Plateforme => PLATEFORMES.includes(code as Plateforme))
        : null;
    const borne = (valeur: unknown) => (typeof valeur === 'string' && valeur !== '' ? valeur : null);
    return {
        audience,
        etablissements: etablissements.length > 0 ? etablissements : null,
        version_min: borne(ligne.version_min),
        version_max: borne(ligne.version_max),
        plateformes,
    };
}

export function estCible(ciblage: Ciblage, appareil: Appareil): boolean {
    if (ciblage.audience === 'inconnue') return false;
    if (ciblage.audience === 'testeurs' && !appareil.testeur) return false;
    if (ciblage.etablissements !== null && !ciblage.etablissements.includes(appareil.etablissement)) return false;
    if (ciblage.plateformes !== null && !ciblage.plateformes.includes(appareil.plateforme as Plateforme)) return false;
    return versionDansFenetre(appareil.version, ciblage.version_min, ciblage.version_max);
}

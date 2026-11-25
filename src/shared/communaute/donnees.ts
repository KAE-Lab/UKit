/**
 * Ce que l'application ecrit et lit de la communaute, sans plateforme : la forme d'une contribution,
 * le texte exact que l'appareil signe, la lecture defensive d'un signalement, le cache du jour et sa
 * fusion, et la reponse de la fonction `communaute` rangee en resultat (docs/phase-8/1-base-communautaire.md).
 *
 * Pur, comme `mesure/file.ts` : l'instant arrive en parametre, rien ne touche au reseau ni au disque.
 */

export type Famille = 'jour' | 'date' | 'correction' | 'direct';
export type Poids = 0 | 1 | 2;
export type StatutDeSignalement = 'active' | 'remplacee' | 'masquee';

/** Ce que l'etudiant publie : un sujet du vocabulaire, une cible, une valeur proposee, jamais un texte. */
export interface Contribution {
    readonly sujet: string;
    /** Le lieu chez sa source : le code Croustillant, l'identifiant Affluences, `<etablissement>/<code>`. */
    readonly cible: string;
    readonly valeur: string;
    /** `AAAA-MM-JJ`, pour un signalement date seulement. */
    readonly fin?: string | null;
}

/** Un signalement tel que la base le laisse lire : ni l'appareil qui l'a ecrit, ni sa confirmation. */
export interface Signalement {
    readonly id: string;
    readonly sujet: string;
    readonly cible: string;
    readonly valeur: string;
    readonly fin: string | null;
    readonly poids: Poids;
    readonly statut: StatutDeSignalement;
    readonly creeLe: number;
    readonly expireLe: number;
    readonly majLe: number;
}

/** Les colonnes que l'application lit, nommees : un `select *` est refuse a la cle publiable. */
export const COLONNES = 'id, sujet, cible, valeur, fin, poids, statut, cree_le, expire_le, maj_le';

const STATUTS: readonly StatutDeSignalement[] = ['active', 'remplacee', 'masquee'];

function instant(valeur: unknown): number | null {
    if (typeof valeur !== 'string') return null;
    const ms = Date.parse(valeur);
    return Number.isFinite(ms) ? ms : null;
}

/** Une ligne de la base, ou `null` si elle ne porte pas ce qu'il faut : une ligne fausse ne casse rien. */
export function lireSignalement(ligne: unknown): Signalement | null {
    if (typeof ligne !== 'object' || ligne === null) return null;
    const l = ligne as Record<string, unknown>;
    const creeLe = instant(l.cree_le);
    const expireLe = instant(l.expire_le);
    const majLe = instant(l.maj_le);
    if (typeof l.id !== 'string' || typeof l.sujet !== 'string' || typeof l.cible !== 'string' || typeof l.valeur !== 'string') return null;
    if (l.poids !== 0 && l.poids !== 1 && l.poids !== 2) return null;
    if (!STATUTS.includes(l.statut as StatutDeSignalement) || creeLe === null || expireLe === null || majLe === null) return null;
    return {
        id: l.id,
        sujet: l.sujet,
        cible: l.cible,
        valeur: l.valeur,
        fin: typeof l.fin === 'string' ? l.fin : null,
        poids: l.poids,
        statut: l.statut as StatutDeSignalement,
        creeLe,
        expireLe,
        majLe,
    };
}

/**
 * Le texte exact que l'appareil signe (iOS) ou fait attester (Android), et que la fonction relit.
 * L'ordre des cles est fixe ici, mais rien n'en depend : la preuve couvre le texte envoye, pas un
 * objet recompose.
 */
export function serialiserDonnees(defi: string, cle: string, contribution: Contribution, essai: boolean): string {
    return JSON.stringify({
        defi,
        cle,
        contribution: { sujet: contribution.sujet, cible: contribution.cible, valeur: contribution.valeur, fin: contribution.fin ?? null },
        essai,
    });
}

// ---------------------------------------------------------------------------
// Les octets
// ---------------------------------------------------------------------------

export function versBase64(octets: Uint8Array): string {
    let binaire = '';
    for (const octet of octets) binaire += String.fromCharCode(octet);
    return btoa(binaire);
}

/** Le base64 standard en octets, ou `null` s'il n'en est pas. */
export function depuisBase64(texte: string): Uint8Array<ArrayBuffer> | null {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(texte)) return null;
    try {
        const binaire = atob(texte);
        const octets = new Uint8Array(binaire.length);
        for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
        return octets;
    } catch {
        return null;
    }
}

/** Le base64 standard reecrit pour une URL, sans remplissage : la forme du `requestHash`. */
export function base64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// Le cache du jour
// ---------------------------------------------------------------------------

/**
 * Les signalements du jour, gardes sur l'appareil, et le curseur de la lecture suivante : le plus
 * grand `maj_le` vu. Une lecture ne redemande que ce qui a bouge depuis — un signalement neuf, une
 * voix remplacee, une voix masquee — avec un recouvrement de deux minutes, pour qu'une ecriture validee
 * un peu apres son horodatage ne passe pas entre deux lectures. Un autre jour repart de zero.
 */
export interface CacheDuJour {
    readonly jour: string;
    readonly curseur: number | null;
    readonly signalements: readonly Signalement[];
}

export const RECOUVREMENT_MS = 2 * 60_000;

export function cacheVide(jour: string): CacheDuJour {
    return { jour, curseur: null, signalements: [] };
}

/** Le cache tel qu'il a ete ecrit, ou vide s'il est illisible ou d'un autre jour. */
export function lireCache(texte: string | null, jour: string): CacheDuJour {
    if (texte === null) return cacheVide(jour);
    try {
        const brut = JSON.parse(texte) as { jour?: unknown; curseur?: unknown; lignes?: unknown };
        if (brut.jour !== jour || !Array.isArray(brut.lignes)) return cacheVide(jour);
        const signalements = brut.lignes.map(lireSignalement).filter((s): s is Signalement => s !== null);
        return { jour, curseur: typeof brut.curseur === 'number' ? brut.curseur : null, signalements };
    } catch {
        return cacheVide(jour);
    }
}

/** Le cache a ecrire, ses signalements dans la forme meme de la base : une seule lecture les relit. */
export function ecrireCache(cache: CacheDuJour): string {
    const lignes = cache.signalements.map((s) => ({
        id: s.id, sujet: s.sujet, cible: s.cible, valeur: s.valeur, fin: s.fin, poids: s.poids, statut: s.statut,
        cree_le: new Date(s.creeLe).toISOString(), expire_le: new Date(s.expireLe).toISOString(), maj_le: new Date(s.majLe).toISOString(),
    }));
    return JSON.stringify({ jour: cache.jour, curseur: cache.curseur, lignes });
}

/** D'ou relire : le curseur moins le recouvrement, ou tout le jour si rien n'a encore ete lu. */
export function depuis(cache: CacheDuJour): string | null {
    return cache.curseur === null ? null : new Date(cache.curseur - RECOUVREMENT_MS).toISOString();
}

/** Les lignes relues fondues dans le cache, par identifiant : la version la plus recente gagne. */
export function fusionner(cache: CacheDuJour, lignes: readonly Signalement[]): CacheDuJour {
    const parId = new Map(cache.signalements.map((s) => [s.id, s]));
    let curseur = cache.curseur;
    for (const ligne of lignes) {
        const connu = parId.get(ligne.id);
        if (connu === undefined || connu.majLe <= ligne.majLe) parId.set(ligne.id, ligne);
        curseur = curseur === null ? ligne.majLe : Math.max(curseur, ligne.majLe);
    }
    return { jour: cache.jour, curseur, signalements: [...parId.values()] };
}

/** Le jour de Paris d'un instant, `AAAA-MM-JJ` — celui que la base applique a sa lecture publique. */
export function jourDeParis(maintenant: Date): string {
    try {
        return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(maintenant);
    } catch {
        // Un moteur sans fuseaux : le jour local, le parc est a Bordeaux (annonces/ordre.ts).
        const j = (n: number) => String(n).padStart(2, '0');
        return `${maintenant.getFullYear()}-${j(maintenant.getMonth() + 1)}-${j(maintenant.getDate())}`;
    }
}

// ---------------------------------------------------------------------------
// Le resultat d'une contribution
// ---------------------------------------------------------------------------

/**
 * Ce qu'une contribution est devenue. `refusee` est definitif — la meme contribution le serait encore
 * (un plafond du jour, un sujet inconnu, un appareil bloque) ; `echec` se rejoue plus tard (le reseau,
 * la base injoignable, un defi perime). `a-refaire` : la cle App Attest est a reenregistrer, ou a
 * remplacer, ou l'assertion a refaire, ce que l'envoi fait une fois de lui-meme.
 */
export type ResultatDeContribution =
    | { readonly etat: 'acceptee'; readonly poids: Poids; readonly atteste: boolean; readonly id: string | null }
    | { readonly etat: 'essai'; readonly poids: Poids; readonly atteste: boolean }
    | { readonly etat: 'refusee'; readonly raison: string }
    | { readonly etat: 'a-refaire'; readonly raison: string }
    | { readonly etat: 'echec'; readonly raison: string }
    | { readonly etat: 'sans-base' };

const A_REFAIRE = new Set(['appareil_inconnu', 'compteur_rejoue', 'assertion']);
const REJOUABLES = new Set(['defi', 'base', 'non_configuree', 'app_attest_non_configure']);

function poidsDe(valeur: unknown): Poids {
    return valeur === 1 || valeur === 2 ? valeur : 0;
}

/** La reponse HTTP de la fonction, rangee. Un corps inattendu est un echec, jamais une acceptation. */
export function lireResultat(statut: number, corps: unknown): ResultatDeContribution {
    const c = (typeof corps === 'object' && corps !== null ? corps : {}) as Record<string, unknown>;
    const raison = typeof c.raison === 'string' ? c.raison : `http_${statut}`;
    if (statut === 200 && c.statut === 'acceptee') {
        return { etat: 'acceptee', poids: poidsDe(c.poids), atteste: c.atteste === true, id: typeof c.id === 'string' ? c.id : null };
    }
    if (statut === 200 && c.statut === 'essai') return { etat: 'essai', poids: poidsDe(c.poids), atteste: c.atteste === true };
    if (A_REFAIRE.has(raison)) return { etat: 'a-refaire', raison };
    if (statut >= 500 || statut === 0 || REJOUABLES.has(raison)) return { etat: 'echec', raison };
    if (statut >= 400) return { etat: 'refusee', raison };
    return { etat: 'echec', raison: 'reponse_inattendue' };
}

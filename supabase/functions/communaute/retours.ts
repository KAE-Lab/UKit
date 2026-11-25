/**
 * Ce que la fonction `communaute` juge d'un retour natif (phase 8, lot 3 ; docs/phase-8/3-formulaire.md) :
 * le texte exact que l'appareil a signe ou fait attester, borne champ par champ, et le masquage des
 * adresses et des numeros que le texte libre pourrait porter, comme a l'import du formulaire
 * (tools/retours/nettoyage.mjs).
 *
 * Sans aucun import, comme `regles.ts` et pour la meme raison : le module est joue par le `npm test` de
 * la racine (`retours.test.ts`), dont le `tsconfig` refuse les extensions que Deno exige.
 */

export type NatureDeRetour = 'bug' | 'fonctionnalite' | 'campus';

export interface EchecJoint {
    /** Absent quand la carte d'erreur n'a pas d'echec de sa famille dans la session. */
    readonly hote?: string;
    readonly famille: string;
    /** Il y a combien de minutes, arrondi : l'heure exacte n'apprend rien de plus. */
    readonly minutes?: number;
}

/** Les blocs que l'etudiant a laisses joints ; un bloc retire est absent. */
export interface Contexte {
    readonly version?: string;
    readonly appareil?: string;
    readonly systeme?: string;
    readonly etablissement?: string;
    readonly langue?: string;
    readonly theme?: string;
    readonly onglet?: string;
    readonly reseau?: string;
    readonly echecs?: readonly EchecJoint[];
    /** Des noms d'ecran, rien d'autre (docs/phase-8/README.md, vie privee). */
    readonly parcours?: readonly string[];
    readonly erreur?: EchecJoint;
}

export interface Retour {
    /** L'identifiant du depot, tire sur l'appareil : un depot rejoue retrouve sa ligne. */
    readonly depot: string;
    readonly nature: NatureDeRetour;
    readonly texte: string;
    readonly campus: string | null;
    readonly volontaire: boolean;
    readonly contact: string | null;
    readonly probleme: string | null;
    /** L'idee publiee sous laquelle le detail se range (lot 4). */
    readonly idee: string | null;
    readonly contexte: Contexte | null;
    readonly captures: number;
    /** L'empreinte SHA-256 de la cle secrete de l'appareil, en hexadecimal ; `null` sans accord. */
    readonly cleReponse: string | null;
}

export interface DonneesDeRetour {
    readonly defi: string;
    /** La cle serveur de l'appareil, en base64 URL : la fonction la compare a celle qu'il prouve. */
    readonly cle: string;
    readonly retour: Retour;
}

export type LectureDeRetour = { readonly ok: true; readonly valeur: DonneesDeRetour } | { readonly ok: false; readonly raison: string };

export const BORNES = {
    texte: 2000,
    campus: 120,
    contact: 254,
    captures: 3,
    champ: 120,
    echecs: 5,
    parcours: 15,
} as const;

const NATURES: readonly NatureDeRetour[] = ['bug', 'fonctionnalite', 'campus'];
const CHAMPS_TEXTE = ['version', 'appareil', 'systeme', 'etablissement', 'langue', 'theme', 'onglet', 'reseau'] as const;
const CLES_DU_CONTEXTE = new Set<string>([...CHAMPS_TEXTE, 'echecs', 'parcours', 'erreur']);
const HOTE = /^[A-Za-z0-9.-]{1,100}$/;
const FAMILLE = /^[a-z_]{1,24}$/;
const ECRAN = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ADRESSE_ELECTRONIQUE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function objet(valeur: unknown): Record<string, unknown> | null {
    return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur) ? valeur as Record<string, unknown> : null;
}

/** Une chaine courte et sans caractere de controle, ou `undefined`. */
function champ(valeur: unknown, max: number = BORNES.champ): string | undefined {
    if (typeof valeur !== 'string') return undefined;
    const propre = valeur.trim();
    return propre !== '' && propre.length <= max && !CONTROLE.test(propre) ? propre : undefined;
}

function lireEchec(valeur: unknown): EchecJoint | null {
    const e = objet(valeur);
    if (e === null || typeof e.famille !== 'string' || !FAMILLE.test(e.famille)) return null;
    if (e.hote !== undefined && (typeof e.hote !== 'string' || !HOTE.test(e.hote))) return null;
    if (e.minutes !== undefined && (typeof e.minutes !== 'number' || !Number.isInteger(e.minutes) || e.minutes < 0 || e.minutes > 10_080)) return null;
    return {
        ...(e.hote !== undefined ? { hote: e.hote as string } : {}),
        famille: e.famille,
        ...(e.minutes !== undefined ? { minutes: e.minutes as number } : {}),
    };
}

/** Une liste bornee dont chaque element se lit, ou `undefined`. */
function liste<T>(valeur: unknown, max: number, lire: (element: unknown) => T | null): T[] | undefined {
    if (!Array.isArray(valeur) || valeur.length > max) return undefined;
    const lus = valeur.map(lire);
    return lus.every((lu) => lu !== null) ? lus as T[] : undefined;
}

const lireEcran = (ecran: unknown): string | null => typeof ecran === 'string' && ECRAN.test(ecran) ? ecran : null;

/**
 * Le contexte joint, ou `null` s'il est absent ; `undefined` s'il porte une cle inconnue ou une valeur
 * hors de sa forme — le retour est alors refuse, pas nettoye : l'application ne l'enverrait pas.
 */
export function lireContexte(valeur: unknown): Contexte | null | undefined {
    if (valeur === undefined || valeur === null) return null;
    const c = objet(valeur);
    if (c === null || Object.keys(c).some((cle) => !CLES_DU_CONTEXTE.has(cle))) return undefined;
    const sortie: Record<string, unknown> = {};
    for (const nom of CHAMPS_TEXTE) {
        if (c[nom] === undefined) continue;
        sortie[nom] = champ(c[nom]);
        if (sortie[nom] === undefined) return undefined;
    }
    const lus: Record<string, unknown> = {
        echecs: c.echecs === undefined ? null : liste(c.echecs, BORNES.echecs, lireEchec),
        parcours: c.parcours === undefined ? null : liste(c.parcours, BORNES.parcours, lireEcran),
        erreur: c.erreur === undefined ? null : lireEchec(c.erreur) ?? undefined,
    };
    for (const [nom, lu] of Object.entries(lus)) {
        if (lu === undefined) return undefined;
        if (lu !== null) sortie[nom] = lu;
    }
    return sortie as Contexte;
}

const refus = (raison: string): { ok: false; raison: string } => ({ ok: false, raison });

/** Un champ facultatif : absent vaut `null`, present il doit se lire, sinon `false`. */
function facultatif<T>(valeur: unknown, lire: (v: unknown) => T | undefined): T | null | false {
    if (valeur === undefined || valeur === null) return null;
    return lire(valeur) ?? false;
}

const lireUuid = (v: unknown): string | undefined => typeof v === 'string' && UUID.test(v) ? v : undefined;
const lireEmpreinte = (v: unknown): string | undefined => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v) ? v : undefined;
const lireNombreDeCaptures = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= BORNES.captures ? v : undefined;

/** La branche du campus et du volontariat : un campus pour une demande, une adresse pour un volontaire. */
function brancheValide(nature: NatureDeRetour, campus: string | null, volontaire: boolean, contact: string | null): boolean {
    if (nature === 'campus' ? campus === null : campus !== null || volontaire) return false;
    return volontaire === (contact !== null) && (contact === null || ADRESSE_ELECTRONIQUE.test(contact));
}

/** Le texte libre, borne ; une demande de campus peut n'en porter aucun. */
function lireTexte(valeur: unknown, nature: NatureDeRetour): string | null {
    const texte = typeof valeur === 'string' ? valeur.trim() : '';
    return texte.length > BORNES.texte || (nature !== 'campus' && texte.length < 3) ? null : texte;
}

function lireRetour(valeur: unknown): Retour | null {
    const r = objet(valeur);
    if (r === null || !NATURES.includes(r.nature as NatureDeRetour)) return null;
    const nature = r.nature as NatureDeRetour;
    const texte = lireTexte(r.texte, nature);
    if (texte === null || (r.volontaire !== undefined && typeof r.volontaire !== 'boolean')) return null;
    const volontaire = r.volontaire === true;
    const campus = facultatif(r.campus, (v) => champ(v, BORNES.campus));
    const contact = facultatif(r.contact, (v) => champ(v, BORNES.contact));
    const depot = lireUuid(r.depot);
    const probleme = facultatif(r.probleme, lireUuid);
    const idee = facultatif(r.idee, lireUuid);
    const cleReponse = facultatif(r.cle_reponse, lireEmpreinte);
    const captures = r.captures === undefined ? 0 : lireNombreDeCaptures(r.captures);
    const contexte = lireContexte(r.contexte);
    if (depot === undefined || campus === false || contact === false || probleme === false || idee === false || cleReponse === false
        || captures === undefined || contexte === undefined) return null;
    if (!brancheValide(nature, campus, volontaire, contact)) return null;
    return { depot, nature, texte, campus, volontaire, contact, probleme, idee, contexte, captures, cleReponse };
}

/** Les donnees signees d'un depot, relues apres la preuve. */
export function lireDonneesDeRetour(texteSigne: string): LectureDeRetour {
    let brut: unknown;
    try {
        brut = JSON.parse(texteSigne);
    } catch {
        return refus('donnees');
    }
    const d = objet(brut);
    if (d === null || typeof d.defi !== 'string' || d.defi.length > 64 || typeof d.cle !== 'string' || d.cle.length > 64) return refus('donnees');
    const retour = lireRetour(d.retour);
    if (retour === null) return refus('retour_invalide');
    return { ok: true, valeur: { defi: d.defi, cle: d.cle, retour } };
}

const ADRESSE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const NUMERO = /(?<!\d)(?:\+\d{1,3}[\s.-]?)?(?:\(?0\)?[\s.-]?)?[1-9](?:[\s.-]?\d{2}){4}(?!\d)/g;

/**
 * Les adresses et les numeros d'un texte libre, masques : les memes motifs que l'import du formulaire,
 * volontairement larges. L'adresse du volontaire, dans son champ, n'est jamais masquee. Le masque
 * peut allonger le texte : il se borne de nouveau, plutot que de faire refuser un texte deja admis.
 */
export function masquer(texte: string): string {
    // Par points de code, comme `char_length` dans la base : une coupe en unites UTF-16 laisserait une
    // moitie d'emoji, que `jsonb` refuse.
    return Array.from(texte.replace(ADRESSE, '[adresse retirée]').replace(NUMERO, '[numéro retiré]')).slice(0, BORNES.texte).join('');
}

/** Le chemin d'une capture dans l'espace `retours` : le dossier du retour, son rang. */
export function cheminDeCapture(id: string, rang: number): string {
    return `${id}/${rang}.jpg`;
}

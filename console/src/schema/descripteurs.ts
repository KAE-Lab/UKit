/**
 * Le vocabulaire des descripteurs : ce que la console sait d'une table, et rien de plus.
 *
 * Un descripteur dit quelles colonnes une table porte, comment chacune se saisit, laquelle est la
 * cle, lesquelles se montrent en liste, lesquelles se filtrent, se cherchent et se trient, et ce
 * qu'il faut savoir avant d'ecrire une ligne. C'est le schema de la console : la liste et le
 * formulaire sont generiques et ne connaissent aucune table. Sa coherence — chaque nom cite designe
 * un champ reel — est verifiee par coherence.test.ts.
 *
 * Il ne dit rien de ce que l'application fait de la donnee — ca, c'est la documentation de la
 * table, dans docs/backend.md et supabase/schema.sql, que chaque descripteur cite.
 */

import type { Ligne } from '../supabase';

export interface Option {
    readonly valeur: string;
    readonly libelle: string;
    /** En liste, une pastille de cette couleur plutot que le libelle nu : l'etat d'un retour. */
    readonly ton?: 'ok' | 'panne' | 'avert' | 'accent';
}

export type TypeDeChamp =
    | { readonly type: 'texte' }
    | { readonly type: 'zone'; readonly code?: boolean }
    | { readonly type: 'booleen' }
    | { readonly type: 'nombre' }
    | { readonly type: 'date' }
    | { readonly type: 'json' }
    | { readonly type: 'choix'; readonly options: readonly Option[] }
    /** Plusieurs valeurs d'une liste fermee, en cases a cocher ; aucune cochee = `null`, « toutes ». */
    | { readonly type: 'cases'; readonly options: readonly Option[] }
    | { readonly type: 'etablissements' }
    | { readonly type: 'version' }
    | { readonly type: 'uuid' }
    /**
     * Une image du bucket `media`, televersee depuis le formulaire. `blurhash` nomme la colonne soeur
     * qui recoit le placeholder calcule au televersement, quand la table en porte une (annonces).
     */
    | { readonly type: 'image'; readonly dossier: string | ((ligne: Ligne) => string); readonly blurhash?: string };

export interface Champ {
    readonly nom: string;
    readonly libelle: string;
    readonly type: TypeDeChamp;
    readonly aide?: string;
    readonly obligatoire?: boolean;
    readonly lectureSeule?: boolean;
    /** Ni montre ni saisi, mais envoye : une colonne que le formulaire remplit lui-meme (le blurhash). */
    readonly cache?: boolean;
    /** La valeur d'une ligne neuve. Une fonction quand elle se calcule (« maintenant »). */
    readonly defaut?: unknown;
    /** La chaine vide est une valeur, pas une absence — `visuels.image_url` : « aucune image ». */
    readonly videEstValeur?: boolean;
}

/**
 * Un geste sur une ligne existante, hors ecriture : « Notifier » un message (6.1.x-E). Il rend la
 * phrase a montrer, ou leve — le formulaire l'affiche dans son retour.
 */
export interface ActionDeLigne {
    readonly libelle: string;
    /** Une confirmation avant d'agir, pour un geste qui ne se rejoue pas. */
    readonly confirmation?: string;
    readonly disponible?: (ligne: Ligne) => boolean;
    readonly executer: (ligne: Ligne) => Promise<string>;
}

/**
 * Comment le filtre global par campus s'applique a la table : sur un ciblage (`etablissements`,
 * tableau nul pour « tous », qui reste visible), ou sur un code d'etablissement (`jetons_push`).
 */
export interface FiltreDeCampus {
    readonly type: 'ciblage' | 'code';
    readonly colonne: string;
}

export interface Descripteur {
    /** Le segment d'URL de la page, et l'identifiant de navigation. */
    readonly chemin: string;
    readonly table: string;
    readonly titre: string;
    readonly description: string;
    /** La ou les colonnes de la cle primaire. */
    readonly cle: readonly string[];
    readonly champs: readonly Champ[];
    /** Les colonnes affichees en liste, dans l'ordre. */
    readonly liste: readonly string[];
    readonly tri?: { readonly colonne: string; readonly desc?: boolean };
    /** Les champs a choix ou booleens proposes en filtre au-dessus de la liste. */
    readonly filtres?: readonly string[];
    /** Les colonnes texte que la recherche parcourt (`ilike`). */
    readonly recherche?: readonly string[];
    /** Les colonnes triables ; par defaut, celles de la liste dont le type se trie. */
    readonly triables?: readonly string[];
    readonly campus?: FiltreDeCampus;
    /** Ce qu'il faut savoir avant d'ecrire : « une ligne s'ecrit entiere », les trois etats d'un visuel. */
    readonly avertissement?: string;
    readonly creation?: boolean;
    readonly suppression?: boolean;
    /** Ou la page se range dans la navigation : ce qu'on suit (les retours) ou ce qu'on publie. */
    readonly section?: 'suivre' | 'publier';
    /** Le message d'une liste vide, quand « la premiere se cree avec le bouton » serait faux. */
    readonly vide?: string;
    /** Une regle qui ne tient pas dans un champ : rend le message d'erreur, ou `null`. */
    readonly valider?: (ligne: Ligne) => string | null;
    /** Un complement calcule juste avant l'ecriture : la cle d'un message, proposee depuis son titre. */
    readonly avantEcriture?: (ligne: Ligne, existante: Ligne | null) => Ligne;
    /** Les gestes hors ecriture sur une ligne existante. */
    readonly actions?: readonly ActionDeLigne[];
}

/** Les cinq colonnes de ciblage, partagees par les annonces et les messages (docs/pilotage.md). */
export const CIBLAGE: readonly Champ[] = [
    {
        nom: 'audience',
        libelle: 'Audience',
        type: { type: 'choix', options: [{ valeur: 'tous', libelle: 'Tout le monde' }, { valeur: 'testeurs', libelle: 'Les testeurs seulement', ton: 'avert' }] },
        defaut: 'tous',
        aide: 'Les testeurs sont les appareils enregistrés dans la table Testeurs : de quoi regarder un contenu sur son téléphone avant de l’envoyer à tout le monde.',
    },
    {
        nom: 'etablissements',
        libelle: 'Campus',
        type: { type: 'etablissements' },
        aide: 'Aucune case cochée : tous les campus.',
    },
    { nom: 'version_min', libelle: 'Version minimale', type: { type: 'version' }, aide: 'Bornes incluses, en X.Y.Z. Vide : pas de borne.' },
    { nom: 'version_max', libelle: 'Version maximale', type: { type: 'version' }, aide: '« Mets à jour » est un message dont la version maximale est la version précédente.' },
    {
        nom: 'plateformes',
        libelle: 'Plateformes',
        type: { type: 'cases', options: [{ valeur: 'ios', libelle: 'iOS' }, { valeur: 'android', libelle: 'Android' }] },
        aide: 'Aucune case cochée : les deux. Un défaut qui n’existe que sur une plateforme se dit à elle seule.',
    },
];

/** Le ciblage par campus des annonces et des messages, pour le filtre global. */
export const CAMPUS_PAR_CIBLAGE: FiltreDeCampus = { type: 'ciblage', colonne: 'etablissements' };

export function champDe(descripteur: Descripteur, nom: string): Champ | undefined {
    return descripteur.champs.find((champ) => champ.nom === nom);
}

/** Les types dont la valeur se trie en base ; un JSON, une image ou un tableau ne se trient pas. */
const TYPES_TRIABLES: ReadonlySet<string> = new Set(['texte', 'zone', 'booleen', 'nombre', 'date', 'choix', 'version', 'uuid']);

export function colonnesTriables(descripteur: Descripteur): readonly string[] {
    if (descripteur.triables !== undefined) return descripteur.triables;
    return descripteur.liste.filter((nom) => {
        const champ = champDe(descripteur, nom);
        return champ !== undefined && TYPES_TRIABLES.has(champ.type.type);
    });
}

/** La cle d'une ligne, ses colonnes jointes par `/` — la meme forme que `journal.ligne_id`. */
export function cleDeLigne(descripteur: Descripteur, ligne: Ligne): string {
    return descripteur.cle.map((colonne) => String(ligne[colonne] ?? '')).join('/');
}

/** La cle telle qu'elle voyage dans l'URL : chaque colonne encodee a part, `/` reste le separateur. */
export function cleVersUrl(descripteur: Descripteur, ligne: Ligne): string {
    return descripteur.cle.map((colonne) => encodeURIComponent(String(ligne[colonne] ?? ''))).join('/');
}

/** L'inverse : le filtre d'une ligne depuis le segment d'URL, ou `null` si la forme ne colle pas. */
export function cleDepuisUrl(descripteur: Descripteur, segment: string): Ligne | null {
    const parts = segment.split('/');
    if (parts.length !== descripteur.cle.length) return null;
    try {
        return Object.fromEntries(descripteur.cle.map((colonne, index) => [colonne, decodeURIComponent(parts[index] ?? '')]));
    } catch {
        return null;
    }
}

export function valeurParDefaut(champ: Champ): unknown {
    return typeof champ.defaut === 'function' ? (champ.defaut as () => unknown)() : champ.defaut;
}

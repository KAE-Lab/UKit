/**
 * Le vocabulaire des descripteurs : ce que la console sait d'une table, et rien de plus.
 *
 * Un descripteur dit quelles colonnes une table porte, comment chacune se saisit, laquelle est la
 * cle, lesquelles se montrent en liste, et ce qu'il faut savoir avant d'ecrire une ligne. C'est le
 * schema de la console : la liste et le formulaire sont generiques et ne connaissent aucune table.
 *
 * Il ne dit rien de ce que l'application fait de la donnee — ca, c'est la documentation de la
 * table, dans docs/backend.md et supabase/schema.sql, que chaque descripteur cite.
 */

import type { Ligne } from '../supabase';

export interface Option {
    readonly valeur: string;
    readonly libelle: string;
}

export type TypeDeChamp =
    | { readonly type: 'texte' }
    | { readonly type: 'zone'; readonly code?: boolean }
    | { readonly type: 'booleen' }
    | { readonly type: 'nombre' }
    | { readonly type: 'date' }
    | { readonly type: 'json' }
    | { readonly type: 'choix'; readonly options: readonly Option[] }
    | { readonly type: 'etablissements' }
    | { readonly type: 'version' }
    | { readonly type: 'uuid' }
    | { readonly type: 'image'; readonly dossier: string | ((ligne: Ligne) => string) };

export interface Champ {
    readonly nom: string;
    readonly libelle: string;
    readonly type: TypeDeChamp;
    readonly aide?: string;
    readonly obligatoire?: boolean;
    readonly lectureSeule?: boolean;
    /** La valeur d'une ligne neuve. Une fonction quand elle se calcule (« maintenant »). */
    readonly defaut?: unknown;
    /** La chaine vide est une valeur, pas une absence — `visuels.image_url` : « aucune image ». */
    readonly videEstValeur?: boolean;
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
    /** Ce qu'il faut savoir avant d'ecrire : « une ligne s'ecrit entiere », les trois etats d'un visuel. */
    readonly avertissement?: string;
    readonly creation?: boolean;
    readonly suppression?: boolean;
    /** Une regle qui ne tient pas dans un champ : rend le message d'erreur, ou `null`. */
    readonly valider?: (ligne: Ligne) => string | null;
    /** Un complement calcule juste avant l'ecriture : la cle d'un message, proposee depuis son titre. */
    readonly avantEcriture?: (ligne: Ligne, existante: Ligne | null) => Ligne;
}

/** Les quatre colonnes de ciblage, partagees par les annonces et les messages (docs/pilotage.md). */
export const CIBLAGE: readonly Champ[] = [
    {
        nom: 'audience',
        libelle: 'Audience',
        type: { type: 'choix', options: [{ valeur: 'tous', libelle: 'Tout le monde' }, { valeur: 'testeurs', libelle: 'Les testeurs seulement' }] },
        defaut: 'tous',
        aide: 'Les testeurs sont les appareils enregistres dans la table Testeurs : de quoi regarder un contenu sur son telephone avant de l envoyer a tout le monde.',
    },
    {
        nom: 'etablissements',
        libelle: 'Campus',
        type: { type: 'etablissements' },
        aide: 'Aucune case cochee : tous les campus.',
    },
    { nom: 'version_min', libelle: 'Version minimale', type: { type: 'version' }, aide: 'Bornes incluses, en X.Y.Z. Vide : pas de borne.' },
    { nom: 'version_max', libelle: 'Version maximale', type: { type: 'version' }, aide: '« Mets a jour » est un message dont la version maximale est la version precedente.' },
];

export function champDe(descripteur: Descripteur, nom: string): Champ | undefined {
    return descripteur.champs.find((champ) => champ.nom === nom);
}

/** La cle d'une ligne, ses colonnes jointes par `/` — la meme forme que `journal.ligne_id`. */
export function cleDeLigne(descripteur: Descripteur, ligne: Ligne): string {
    return descripteur.cle.map((colonne) => String(ligne[colonne] ?? '')).join('/');
}

export function valeurParDefaut(champ: Champ): unknown {
    return typeof champ.defaut === 'function' ? (champ.defaut as () => unknown)() : champ.defaut;
}

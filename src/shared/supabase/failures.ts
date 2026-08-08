/**
 * Traduire un echec de lecture de la base en decision d'ecran.
 *
 * Le pendant, pour la base, de ce que shared/aetherius/failures.ts fait pour le moteur — et
 * volontairement dans le **meme vocabulaire** : une seule grammaire d'echec dans l'application, quel
 * que soit ce qui a echoue. Un ecran branche sur `UkitFailure` n'a pas a savoir si la donnee venait
 * d'un Blueprint ou d'une table.
 *
 * Ce module n'importe ni React Native ni le client Supabase : il ne manipule que la forme de l'erreur
 * rendue. C'est ce qui le rend jouable hors appareil (failures.test.ts), et c'est la meme raison qui
 * a fait importer `describeFailure` du moteur plutot que du paquet React Native au jalon 6-A.
 *
 * L'import vise `../aetherius/failures` et non la porte d'entree `../aetherius` : celle-ci
 * re-exporte la facade, qui tire React Native.
 *
 * Voir docs/backend.md et docs/phase-6/6-b-supabase.md.
 */

import { ukitFailure, type UkitFailure } from '../aetherius/failures';

/** Ce que le client rend dans son champ `error`, reduit a ce dont la traduction a besoin. */
export interface SupabaseErrorLike {
    readonly message?: string;
    /** Code PostgREST (`PGRST205`) ou SQLSTATE (`42501`, `42P01`). Vide sur un echec de transport. */
    readonly code?: string;
    readonly details?: string | null;
    readonly hint?: string | null;
}

/**
 * Les codes qui disent « la base ne rend plus la forme attendue ».
 *
 * Ce sont des decalages de **schema** : une table ou une colonne que le code demande et que la base
 * n'a pas. Ils appellent une correction de notre part, pas un nouvel essai — d'ou `rejected`, que la
 * table de UKit marque non reessayable.
 */
const CODES_DE_SCHEMA = new Set([
    'PGRST200', // relation attendue introuvable dans le cache
    'PGRST202', // fonction introuvable
    'PGRST204', // colonne introuvable
    'PGRST205', // table introuvable
    '42P01', // undefined_table
    '42703', // undefined_column
]);

/**
 * Range une erreur de lecture dans une famille.
 *
 * Deux familles seulement, et l'economie est voulue :
 *
 *   - `unavailable` — transport mort, projet injoignable, cle invalide, refus RLS, base non
 *     configuree. L'utilisateur ne peut rien y faire et un nouvel essai peut aboutir : c'est la
 *     seule famille qui merite un bouton Reessayer.
 *   - `rejected` — la base a repondu, mais pas ce que le code demande : le schema a bouge. Reessayer
 *     redonnerait la meme reponse ; c'est un correctif, pas une panne.
 *
 * **Une cle fausse ne tombe pas en `config`**, alors que la tentation est grande. `config` affiche
 * « Saisis tes identifiants » : ce serait un mensonge, puisque l'utilisateur n'a aucun identifiant a
 * saisir et aucune prise sur une cle compilee dans le binaire. La verite part dans le journal, ou
 * elle sert quelqu'un qui peut agir.
 */
export function describeSupabaseFailure(error: SupabaseErrorLike | null | undefined): UkitFailure {
    if (error === null || error === undefined) {
        return ukitFailure('unavailable', 'la base n a pas repondu');
    }

    const code = typeof error.code === 'string' ? error.code : '';
    const message = typeof error.message === 'string' && error.message !== '' ? error.message : 'sans detail';
    const detail = code !== '' ? `${code} : ${message}` : message;

    return ukitFailure(CODES_DE_SCHEMA.has(code) ? 'rejected' : 'unavailable', detail);
}

/**
 * L'echec d'une application construite sans cle de base.
 *
 * Ce n'est pas un cas de bord : une application doit demarrer et s'utiliser sans jamais joindre la
 * base, et un poste de developpement sans `.env` est un cas normal. `unavailable` pour la meme raison
 * qu'une cle fausse — l'utilisateur n'a rien a corriger.
 */
export function baseNonConfiguree(): UkitFailure {
    return ukitFailure('unavailable', 'la base n est pas configuree dans ce binaire');
}

/**
 * Journalise un echec de lecture, sans le masquer.
 *
 * Meme forme que `reportFailure` du socle Aetherius, avec sa propre etiquette : les deux sous-systemes
 * se distinguent d'un coup d'oeil dans un journal d'appareil, et chacun garde son domaine de noms.
 */
export function reportSupabaseFailure(table: string, failure: UkitFailure): void {
    console.warn(`[supabase] ${table} : ${failure.kind} — ${failure.detail ?? 'sans detail'}`);
}

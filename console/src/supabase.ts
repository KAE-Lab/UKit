/**
 * Le client de la console : la cle publiable, et une session d'editeur.
 *
 * La console n'embarque que la cle `anon`, publique par conception — elle est deja dans le binaire
 * de l'application. Ce qui lui permet d'ecrire, c'est la session Supabase Auth d'un compte dont
 * l'e-mail figure dans la table editeurs (supabase/policies.sql) ; la cle de service, elle, ne va
 * que dans les scripts et les secrets de CI (docs/backend.md).
 *
 * Non type par le schema : la console ecrit dans huit tables dont les descripteurs
 * (`src/schema/`) sont la description de reference. Une ligne est un `Record<string, unknown>`,
 * et c'est le descripteur qui dit quoi en faire.
 */

import { createClient } from '@supabase/supabase-js';

export type Ligne = Record<string, unknown>;

export const supabase = createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/** Le nom du projet, pour le pied de page : l'hote sans son protocole. */
export const NOM_DU_PROJET = __SUPABASE_URL__.replace(/^https?:\/\//, '');

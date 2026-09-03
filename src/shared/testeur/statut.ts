/**
 * Cet appareil est-il un testeur ? La reponse, son cache, et sa lecture.
 *
 * La lecture ramene la liste des identifiants enregistres — la colonne `id` de `testeurs`, la seule
 * que la base laisse lire — et compare a l'identifiant local. **L'appareil n'envoie rien** : la
 * requete est la meme pour tout le monde, et c'est ce qui garde vraie la phrase de PRIVACY.md sur
 * des requetes anonymes.
 *
 * La reponse est **synchrone** pour ses lecteurs (`estTesteur`) : le presentateur des messages est
 * pur et `BdeService` filtre en ligne, aucun des deux n'attend. Elle vient du cache au demarrage,
 * puis de la base a chaque rafraichissement, dans cet ordre.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { describeSupabaseFailure, getSupabase, reportSupabaseFailure } from '../supabase';
import { identifiantInstallation } from './identifiant';

const TABLE = 'testeurs';
const CLE_CACHE = 'testeur@1';

interface Statut {
    readonly id: string;
    readonly testeur: boolean;
}

export interface RapportTesteur {
    readonly ok: boolean;
    readonly testeur?: boolean;
    readonly reason?: string;
}

let statut: Statut | null = null;

/** Vrai si l'identifiant de cet appareil figure dans la liste des testeurs, a la derniere lecture. */
export function estTesteur(): boolean {
    return statut?.testeur === true;
}

/**
 * Restaure la derniere reponse connue, sans reseau.
 *
 * Le cache porte l'identifiant avec la reponse : si le trousseau a change — reinitialisation
 * complete —, la reponse d'un autre identifiant ne vaut rien et retombe a « non ».
 */
export async function chargerStatutTesteur(): Promise<void> {
    const id = await identifiantInstallation();
    try {
        const brut = await AsyncStorage.getItem(CLE_CACHE);
        const lu = brut === null ? null : (JSON.parse(brut) as Partial<Statut> | null);
        statut = lu !== null && lu.id === id ? { id, testeur: lu.testeur === true } : { id, testeur: false };
    } catch {
        statut = { id, testeur: false };
    }
}

function rapporter(rapport: RapportTesteur): RapportTesteur {
    if (!rapport.ok) {
        console.warn(`[testeur] statut non rafraichi : ${rapport.reason ?? 'sans detail'}`);
    } else if (__DEV__) {
        console.log(`[testeur] ${rapport.testeur ? 'appareil enregistre' : 'appareil non enregistre'}`);
    }
    return rapport;
}

/** Relit la liste des testeurs. Ne leve jamais ; une base injoignable garde la derniere reponse. */
export async function rafraichirStatutTesteur(): Promise<RapportTesteur> {
    const id = await identifiantInstallation();

    const supabase = getSupabase();
    if (supabase === null) {
        return rapporter({ ok: false, reason: 'base non configuree' });
    }

    try {
        const { data, error } = await supabase.from(TABLE).select('id');
        if (error) {
            reportSupabaseFailure(TABLE, describeSupabaseFailure(error));
            return rapporter({ ok: false, reason: error.message });
        }

        const testeur = (data ?? []).some((ligne) => ligne.id === id);
        statut = { id, testeur };
        await AsyncStorage.setItem(CLE_CACHE, JSON.stringify(statut));
        return rapporter({ ok: true, testeur });
    } catch (erreur) {
        return rapporter({ ok: false, reason: erreur instanceof Error ? erreur.message : String(erreur) });
    }
}

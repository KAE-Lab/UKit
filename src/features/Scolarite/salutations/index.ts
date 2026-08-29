/**
 * La couture de plateforme des salutations : la lecture de la base, et le cache local.
 *
 * Meme forme que le catalogue des etablissements et que les Blueprints, et pour les memes raisons :
 * un **socle embarque** qui repond tout de suite et hors ligne, une **surcouche publiee** qui
 * l'etend, un **cache** pour que la surcouche survive a un lancement sans reseau.
 *
 * Ce qu'elle rend possible, et qui etait l'objet de la demande : poser un mot pour toute
 * l'application — la rentree, un jour de greve, une periode d'examens — **sans release**.
 *
 * **Rien ici n'est sur le chemin de demarrage.** La lecture ne leve pas, n'est pas attendue, et le
 * socle a deja repondu avant qu'elle ne parte. Un point de publication en panne ne change donc rien
 * a ce que l'ecran affiche.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { describeSupabaseFailure, getSupabase, reportSupabaseFailure } from '../../../shared/supabase';
import { SALUTATIONS_SOCLE } from './socle';
import type { ConditionSalutation, RegleSalutation } from './regles';

const TABLE = 'salutations';
/**
 * La cle du cache, **versionnee** — meme role qu'ailleurs : elle garde des regles **deja projetees**,
 * donc changer leur forme doit invalider ce qui a ete ecrit avant.
 */
const CLE_CACHE = 'salutations@1';
const COLONNES = 'id,priorite,condition,messages,actif';

/** La surcouche en memoire. Vide tant que rien n'a ete lu : le socle repond seul. */
let surcouche: readonly RegleSalutation[] = [];

/**
 * Les regles en vigueur : le socle **puis** la surcouche.
 *
 * L'ordre compte et il est le contrat de `choisirSalutation` : a priorite egale, la derniere gagne.
 * Une regle publiee l'emporte donc sur une regle embarquee de meme rang, ce qui est ce qu'on veut —
 * elle est arrivee apres, et quelqu'un a voulu l'ecrire.
 */
export function salutationsActives(): readonly RegleSalutation[] {
    return [...SALUTATIONS_SOCLE, ...surcouche];
}

function nombreEntier(valeur: unknown, defaut: number): number {
    return typeof valeur === 'number' && Number.isInteger(valeur) ? valeur : defaut;
}

/**
 * La condition d'une ligne, reduite a ce qui est exploitable.
 *
 * Defensive comme toutes les projections du depot : la colonne est libre cote base, et une condition
 * a demi comprise ferait afficher un message le mauvais jour. Un champ qui ne tient pas la forme est
 * **ignore** — donc la condition se relache, elle ne se durcit pas. C'est le bon sens de l'erreur :
 * un message qui apparait trop souvent se remarque et se corrige, un message qui n'apparait jamais
 * ne se remarque pas.
 */
function projeterCondition(valeur: unknown): ConditionSalutation {
    if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) return {};

    const source = valeur as Record<string, unknown>;
    const condition: {
        heures?: { de: number; a: number };
        jours?: number[];
        plage?: { du: string; au: string };
        anniversaire?: true;
    } = {};

    const heures = source.heures as { de?: unknown; a?: unknown } | undefined;
    if (heures !== undefined && heures !== null
        && typeof heures.de === 'number' && typeof heures.a === 'number') {
        condition.heures = { de: heures.de, a: heures.a };
    }

    if (Array.isArray(source.jours)) {
        const jours = source.jours.filter(
            (jour): jour is number => typeof jour === 'number' && jour >= 0 && jour <= 6,
        );
        if (jours.length > 0) condition.jours = jours;
    }

    const plage = source.plage as { du?: unknown; au?: unknown } | undefined;
    if (plage !== undefined && plage !== null
        && typeof plage.du === 'string' && typeof plage.au === 'string') {
        condition.plage = { du: plage.du, au: plage.au };
    }

    if (source.anniversaire === true) condition.anniversaire = true;

    return condition;
}

/**
 * Le texte d'une ligne, dans la langue en cours.
 *
 * Les messages publies ne passent pas par `Translator` — ils ne sont pas dans le binaire. La ligne
 * porte donc une table par langue, et le francais sert de repli : mieux vaut une phrase dans une
 * autre langue que pas de phrase du tout, puisque le repli inverse serait de perdre la regle.
 */
function texteDeLaLigne(messages: unknown, langue: string): string | null {
    if (messages === null || typeof messages !== 'object' || Array.isArray(messages)) return null;

    const table = messages as Record<string, unknown>;
    for (const cle of [langue, 'fr']) {
        const texte = table[cle];
        if (typeof texte === 'string' && texte.trim() !== '') return texte.trim();
    }
    return null;
}

function projeterLignes(lignes: readonly Record<string, unknown>[], langue: string): RegleSalutation[] {
    const regles: RegleSalutation[] = [];
    for (const ligne of lignes) {
        const texte = texteDeLaLigne(ligne.messages, langue);
        // Une ligne sans texte lisible n'a rien a afficher : la retenir ferait gagner une regle vide
        // contre le socle, donc effacerait la salutation au lieu de la remplacer.
        if (texte === null || typeof ligne.id !== 'string') continue;

        regles.push({
            id: ligne.id,
            priorite: nombreEntier(ligne.priorite, 0),
            condition: projeterCondition(ligne.condition),
            texte,
        });
    }
    return regles;
}

async function lireCache(langue: string): Promise<void> {
    try {
        const brut = await AsyncStorage.getItem(CLE_CACHE);
        if (brut === null) return;
        surcouche = projeterLignes(JSON.parse(brut) as Record<string, unknown>[], langue);
    } catch (erreur) {
        // Un cache illisible se jette sans bruit : le socle reprend la main, ce qu'il sait faire.
        console.warn(`[salutations] cache illisible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

/**
 * Relit la surcouche : le cache d'abord, la base ensuite.
 *
 * Ne rend rien et ne leve jamais — c'est un rafraichissement d'arriere-plan, appele au demarrage et
 * au retour au premier plan comme ses trois voisins (`shared/navigation/rootContainer.tsx`).
 */
export async function rafraichirSalutations(langue: string): Promise<void> {
    await lireCache(langue);

    const supabase = getSupabase();
    if (supabase === null) return;

    try {
        const { data, error } = await supabase.from(TABLE).select(COLONNES);
        if (error !== null || data === null) {
            if (error !== null) reportSupabaseFailure(TABLE, describeSupabaseFailure(error));
            return;
        }
        const lignes = (data as Record<string, unknown>[]).filter((ligne) => ligne.actif !== false);
        surcouche = projeterLignes(lignes, langue);
        await AsyncStorage.setItem(CLE_CACHE, JSON.stringify(lignes));
    } catch (erreur) {
        reportSupabaseFailure(TABLE, describeSupabaseFailure(erreur as { message?: string }));
    }
}

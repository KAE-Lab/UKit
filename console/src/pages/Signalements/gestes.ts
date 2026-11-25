/**
 * Les lectures et les gestes de la moderation : les portes de la migration 20261125030000_signalements.sql
 * et la table des etats officiels. La base refuse a qui n'est pas admin ; la console le dit avant
 * (BandeauDeDroits), elle ne protege rien.
 */

import { lireEtatOfficiel, type EtatOfficiel } from '../../../../src/shared/communaute/lieu';
import { TAILLE_DE_LOT } from '../../lib/base';
import { traduire } from '../../lib/erreurs';
import { supabase } from '../../supabase';
import { lireSignalementModere, type SignalementModere } from './moderation';

/**
 * Les signalements ecrits depuis un instant et ceux qui valent encore, par lots, sans la cle de leur
 * auteur. Par identifiant : une ligne arrivee entre deux lots decale les suivants, et la meme ligne
 * reviendrait deux fois.
 */
export async function lireLaModeration(depuis: string): Promise<SignalementModere[]> {
    const tout = new Map<string, SignalementModere>();
    for (let lot = 0; ; lot++) {
        const { data, error } = await supabase.rpc('signalements_a_moderer', { p_depuis: depuis }).range(lot * TAILLE_DE_LOT, (lot + 1) * TAILLE_DE_LOT - 1);
        if (error !== null) throw traduire(error);
        const lignes = (data ?? []) as unknown[];
        for (const ligne of lignes) {
            const lue = lireSignalementModere(ligne);
            if (lue !== null) tout.set(lue.id, lue);
        }
        if (lignes.length < TAILLE_DE_LOT) return [...tout.values()];
    }
}

/** Les etats officiels qui valaient encore depuis cet instant, et ceux d'apres. */
export async function lireLesOfficiels(depuis: string): Promise<EtatOfficiel[]> {
    const { data, error } = await supabase.from('etats_officiels').select('id, sujet, cible, valeur, fin, cree_le, expire_le').gte('expire_le', depuis).order('cree_le', { ascending: false });
    if (error !== null) throw traduire(error);
    return ((data ?? []) as unknown[]).map(lireEtatOfficiel).filter((o): o is EtatOfficiel => o !== null);
}

export async function moderer(id: string, geste: 'masquer' | 'retablir'): Promise<void> {
    const { error } = await supabase.rpc('moderer_signalement', { p_id: id, p_geste: geste });
    if (error !== null) throw traduire(error);
}

/** Bloque ou debloque l'appareil qui a ecrit ce signalement ; rend le nombre de ses voix masquees. */
export async function bloquer(id: string, bloque: boolean): Promise<number> {
    const { data, error } = await supabase.rpc('bloquer_auteur', { p_id: id, p_bloque: bloque });
    if (error !== null) throw traduire(error);
    const masquees = (data as { voix_masquees?: unknown } | null)?.voix_masquees;
    return typeof masquees === 'number' ? masquees : 0;
}

export async function publierUnOfficiel(etat: { readonly sujet: string; readonly cible: string; readonly valeur: string; readonly fin: string }): Promise<void> {
    // `expire_le` se tire de `fin` dans la base, qui juge aussi le vocabulaire (private.valider_etat_officiel).
    const { error } = await supabase.from('etats_officiels').insert(etat);
    if (error !== null) throw traduire(error);
}

export async function retirerUnOfficiel(id: string): Promise<void> {
    const { error, count } = await supabase.from('etats_officiels').delete({ count: 'exact' }).eq('id', id);
    if (error !== null) throw traduire(error);
    if (count === 0) throw new Error('Rien n’a été retiré : cet état a déjà disparu, ou les droits de ce compte ne le permettent pas.');
}

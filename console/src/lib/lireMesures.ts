/**
 * La lecture de `mesures` (7-G) : une tranche de jours a la fois, par lots de mille, dans l'ordre de la
 * cle primaire — sans ordre, deux lots pourraient se chevaucher ou laisser un trou. Un compteur en
 * retard peut encore creer une ligne pendant la lecture et decaler les lots d'un rang : la ligne lue
 * deux fois est dedoublonnee par sa cle (une ligne ne disparait jamais, la purge mise a part). Chaque
 * ligne est verifiee a la frontiere (stats/mesures.ts) ; une ligne illisible fait echouer la tranche.
 *
 * Les politiques laissent tout editeur la lire (`supabase/policies.sql`). Les testeurs viennent avec
 * le reste : la bascule de la page les reintegre sans relire.
 */

import { COLONNES_DE_MESURE, dedoublonner, lireMesure, type Mesure } from '../stats/mesures';
import type { Periode } from '../stats/periode';
import { supabase } from '../supabase';
import { TAILLE_DE_LOT } from './base';
import { traduire } from './erreurs';

const CLE_PRIMAIRE = ['jour', 'heure', 'evenement', 'cle', 'campus', 'version', 'plateforme', 'testeur'] as const;

export async function lireLaTranche(tranche: Periode): Promise<Mesure[]> {
    const mesures: Mesure[] = [];
    for (let lot = 0; ; lot++) {
        let requete = supabase.from('mesures').select(COLONNES_DE_MESURE).gte('jour', tranche.du).lte('jour', tranche.au);
        for (const colonne of CLE_PRIMAIRE) requete = requete.order(colonne);
        const { data, error } = await requete.range(lot * TAILLE_DE_LOT, (lot + 1) * TAILLE_DE_LOT - 1);
        if (error !== null) throw traduire(error);
        const lignes: readonly unknown[] = data ?? [];
        for (const ligne of lignes) mesures.push(lireMesure(ligne));
        if (lignes.length < TAILLE_DE_LOT) return dedoublonner(mesures);
    }
}

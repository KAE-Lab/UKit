/**
 * L'etat des annonces, lu sur les lignes : active (visible maintenant), programmee (publiee, mais
 * pas encore), et le reste. La regle est celle de la liste et de l'editeur (etatDAnnonce.ts) : le
 * chiffre du tableau de bord et la colonne « État » ne peuvent pas se contredire.
 *
 * Pur : joue par `npm test` a la racine du depot (annonces.test.ts).
 */

import { etatDAnnonce, type EtatDAnnonce } from '../../schema/tables/etatDAnnonce';

export interface AnnonceLegere {
    readonly id: unknown;
    readonly titre: unknown;
    readonly statut: unknown;
    readonly active: unknown;
    readonly publiee_le: unknown;
    readonly expire_le: unknown;
    readonly audience: unknown;
}

export interface EtatDesAnnonces {
    readonly actives: readonly AnnonceLegere[];
    readonly programmees: readonly AnnonceLegere[];
    readonly brouillons: number;
    readonly archivees: number;
}

function debut(annonce: AnnonceLegere): number {
    const t = typeof annonce.publiee_le === 'string' ? new Date(annonce.publiee_le).getTime() : Number.NaN;
    return Number.isNaN(t) ? 0 : t;
}

export function etatDesAnnonces(annonces: readonly AnnonceLegere[], maintenant: Date): EtatDesAnnonces {
    const lues = annonces.map((annonce) => ({ annonce, etat: etatDAnnonce(annonce, maintenant).etat }));
    const en = (etat: EtatDAnnonce) => lues.filter((lue) => lue.etat === etat).map((lue) => lue.annonce);
    return {
        actives: en('active').sort((a, b) => debut(b) - debut(a)),
        programmees: en('programmee').sort((a, b) => debut(a) - debut(b)),
        brouillons: en('brouillon').length,
        archivees: en('archivee').length,
    };
}

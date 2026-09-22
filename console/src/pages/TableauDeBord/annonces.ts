/**
 * L'etat des annonces, lu sur les lignes : active (visible maintenant), programmee (publiee, mais
 * pas encore), et le reste. La meme regle que la politique de lecture de la base (7-C).
 *
 * Pur : joue par `npm test` a la racine du depot (annonces.test.ts).
 */

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

function instant(valeur: unknown): number | null {
    if (typeof valeur !== 'string' || valeur === '') return null;
    const t = new Date(valeur).getTime();
    return Number.isNaN(t) ? null : t;
}

export function etatDesAnnonces(annonces: readonly AnnonceLegere[], maintenant: Date): EtatDesAnnonces {
    const t = maintenant.getTime();
    const publiees = annonces.filter((a) => a.statut === 'publiee' && a.active === true);
    const nonExpiree = (a: AnnonceLegere) => { const fin = instant(a.expire_le); return fin === null || fin > t; };
    const actives = publiees.filter((a) => { const debut = instant(a.publiee_le); return debut !== null && debut <= t && nonExpiree(a); });
    const programmees = publiees.filter((a) => { const debut = instant(a.publiee_le); return debut !== null && debut > t; })
        .sort((a, b) => (instant(a.publiee_le) ?? 0) - (instant(b.publiee_le) ?? 0));
    return {
        actives: actives.sort((a, b) => (instant(b.publiee_le) ?? 0) - (instant(a.publiee_le) ?? 0)),
        programmees,
        brouillons: annonces.filter((a) => a.statut === 'brouillon').length,
        archivees: annonces.filter((a) => a.statut === 'archivee').length,
    };
}

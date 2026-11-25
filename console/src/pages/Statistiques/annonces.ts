/**
 * Les annonces telles que les statistiques les nomment : le titre par l'identifiant que les compteurs
 * portent, et le partenaire, pour le rapport. Une cle que la table ne connait plus — une annonce
 * supprimee — se lit par le debut de son identifiant.
 */

import { useMemo } from 'react';

import { SANS_FILTRE, useTout } from '../../requetes/useListe';
import { lirePartenaire } from '../../schema/schemas';

export interface AnnonceNommee {
    readonly id: string;
    readonly titre: string;
    /** Le nom du partenaire, vide sans partenaire. */
    readonly partenaire: string;
}

export function useAnnoncesNommees() {
    const requete = useTout('annonces', 'id,titre,partenaire', SANS_FILTRE);
    const annonces = useMemo(() => (requete.data ?? []).map((a): AnnonceNommee => ({
        id: String(a.id),
        titre: typeof a.titre === 'string' ? a.titre : String(a.id),
        partenaire: lirePartenaire(a.partenaire).nom.trim(),
    })), [requete.data]);
    const titreDe = useMemo(() => {
        const titres = new Map(annonces.map((a) => [a.id, a.titre]));
        return (cle: string) => titres.get(cle) ?? `Annonce retirée (${cle.slice(0, 8)})`;
    }, [annonces]);
    return { annonces, titreDe, requete };
}

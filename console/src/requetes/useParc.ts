/**
 * Le parc actif (stats/parc.ts), au campus du filtre global et selon la bascule des testeurs.
 * `jetons_push` se lit en entier, en colonnes legeres, tant que le parc se compte en milliers (lot 0).
 */

import { useMemo } from 'react';

import type { Filtre } from '../stats/agregats';
import { parcActif, type Jeton } from '../stats/parc';
import { SANS_FILTRE, useTout } from './useListe';

const COLONNES_DE_JETON = 'etablissement,version,plateforme,testeur,maj_le';
/**
 * La lecture se fait par lots de mille : sans ordre, Postgres ne garantit rien d'un lot a l'autre. Le
 * jeton, seule cle unique, n'est lisible par aucun compte de la console ; `maj_le` departage presque
 * toujours, et seul un depot tombe entre deux lots peut encore deplacer une ligne.
 */
const ORDRE = { ...SANS_FILTRE, tri: [{ colonne: 'maj_le', desc: false }, { colonne: 'etablissement', desc: false }, { colonne: 'version', desc: false }] };

export function useParc({ campus, testeurs }: Filtre) {
    const requete = useTout('jetons_push', COLONNES_DE_JETON, ORDRE);
    const parc = useMemo(() => {
        if (requete.data === undefined) return undefined;
        const jetons = requete.data.filter((j) => campus === null || j.etablissement === campus) as unknown as readonly Jeton[];
        return parcActif(jetons, new Date(), testeurs);
    }, [requete.data, campus, testeurs]);
    const erreur = requete.isError ? { erreur: requete.error, relire: () => { void requete.refetch(); } } : null;
    return { parc, erreur };
}

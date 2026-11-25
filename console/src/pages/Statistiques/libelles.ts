/**
 * Les cles des compteurs, dites en clair : celles du vocabulaire de la mesure
 * (src/shared/mesure/vocabulaire.ts), et les campus par le catalogue.
 */

import { useCallback } from 'react';

import { useEtablissements } from '../../requetes/useEtablissements';

type Libelles = Readonly<Record<string, string>>;

export const PLATEFORMES: Libelles = { ios: 'iOS', android: 'Android' };
export const ONGLETS: Libelles = { planning: 'Planning', campus: 'Campus', scolarite: 'Scolarité', reglages: 'Réglages' };
export const THEMES: Libelles = { dark: 'Sombre', light: 'Clair' };
export const LANGUES: Libelles = { fr: 'Français', en: 'Anglais', es: 'Espagnol' };
export const SYNCHRO: Libelles = { on: 'Active', off: 'Inactive' };
export const NOTIFICATIONS: Libelles = { on: 'Actives', off: 'Coupées' };

export function libelleDe(libelles: Libelles): (cle: string) => string {
    return (cle) => libelles[cle] ?? cle;
}

/** Le nom d'un campus par son code ; un code que le catalogue ne connait pas reste lisible tel quel. */
export function useNomDuCampus(): (code: string) => string {
    const { etablissements } = useEtablissements();
    return useCallback((code: string) => {
        if (code === '?') return 'Sans campus';
        return etablissements.find((e) => e.code === code)?.nom ?? code;
    }, [etablissements]);
}

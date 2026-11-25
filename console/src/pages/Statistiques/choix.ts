/**
 * Ce que l'adresse des statistiques porte : la periode, choisie une fois pour toutes les pages, et la
 * bascule des testeurs, exclus par defaut (7-G) ; le campus vient du filtre global de la console. Les
 * lignes lues couvrent la periode et la precedente, celle de la variation.
 */

import { useMemo } from 'react';

import { useCampusChoisi } from '../../composants/campus';
import { useMesures, type LectureDeMesures } from '../../requetes/useMesures';
import { filtrer, type Filtre } from '../../stats/agregats';
import type { Mesure } from '../../stats/mesures';
import { duree, periodeDepuisParams, precedente, type Periode, type Prereglage } from '../../stats/periode';
import { lienVers, naviguer, useRoute } from '../../routeur';

export interface Choix {
    readonly chemin: string;
    readonly params: URLSearchParams;
    readonly periode: Periode;
    readonly precedente: Periode;
    readonly prereglage: Prereglage | null;
    readonly filtre: Filtre;
}

export function useChoix(): Choix {
    const { chemin, params } = useRoute();
    const campus = useCampusChoisi();
    const { periode, prereglage } = periodeDepuisParams(params, new Date());
    return { chemin, params, periode, precedente: precedente(periode), prereglage, filtre: { testeurs: params.get('testeurs') === '1', campus } };
}

/** Remplace des parametres de l'adresse, sans entree d'historique : un reglage de vue, pas une page. */
export function poserParams(choix: Choix, modifier: (params: URLSearchParams) => URLSearchParams | void): void {
    const suite = new URLSearchParams(choix.params);
    const rendu = modifier(suite);
    naviguer(choix.chemin, rendu ?? suite, { remplacer: true });
}

/** Les parametres qui passent d'une page a l'autre : la periode et les testeurs, pas une selection. */
export function paramsCommuns(params: URLSearchParams): URLSearchParams {
    const communs = new URLSearchParams();
    for (const cle of ['periode', 'du', 'au', 'testeurs']) {
        const valeur = params.get(cle);
        if (valeur !== null) communs.set(cle, valeur);
    }
    return communs;
}

export function lienDeStatistiques(page: string, params: URLSearchParams): string {
    return lienVers(page === '' ? '/statistiques' : `/statistiques/${page}`, params);
}

/** « sur les 7 jours d'avant » : ce a quoi une variation se compare. */
export function baseDeComparaison(periode: Periode): string {
    const n = duree(periode);
    return n === 1 ? 'sur la veille' : `sur les ${n} jours d’avant`;
}

export interface Lignes {
    readonly courantes: readonly Mesure[];
    readonly precedentes: readonly Mesure[];
}

/** Les lignes de la periode et de la precedente, filtrees ; `undefined` pendant la lecture. */
export function useLignes(choix: Pick<Choix, 'periode' | 'precedente' | 'filtre'>): { readonly lignes: Lignes | undefined; readonly lecture: LectureDeMesures } {
    const lecture = useMesures({ du: choix.precedente.du, au: choix.periode.au });
    const { periode: { du, au }, precedente: { du: duAvant, au: auAvant }, filtre: { testeurs, campus } } = choix;
    const lignes = useMemo(() => {
        if (lecture.mesures === undefined) return undefined;
        const filtre = { testeurs, campus };
        return { courantes: filtrer(lecture.mesures, { du, au }, filtre), precedentes: filtrer(lecture.mesures, { du: duAvant, au: auAvant }, filtre) };
    }, [lecture.mesures, du, au, duAvant, auAvant, testeurs, campus]);
    return { lignes, lecture };
}

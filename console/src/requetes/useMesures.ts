/**
 * Les lignes de `mesures` d'une periode, lues par semaines calees sur le calendrier (stats/periode.ts) :
 * chaque semaine est une requete TanStack Query, et le cache les reprend d'une page a l'autre — la
 * semaine du tableau de bord est celle de la vue d'ensemble. Une semaine close ne bouge presque plus
 * (seuls des compteurs en retard s'y ajoutent) ; celle d'hier et d'aujourd'hui se relit plus souvent.
 */

import { useQueries, type UseQueryResult } from '@tanstack/react-query';

import { lireLaTranche } from '../lib/lireMesures';
import { MesureIllisible, type Mesure } from '../stats/mesures';
import { decaler, jourLocal, tranchesDe, type Periode } from '../stats/periode';
import { cles } from './client';

const RECENTE = 5 * 60_000;
const CLOSE = 60 * 60_000;

export interface LectureDeMesures {
    /** Toutes les lignes des tranches, testeurs compris ; `undefined` tant qu'une tranche manque. */
    readonly mesures: readonly Mesure[] | undefined;
    readonly enErreur: boolean;
    readonly erreur: unknown;
    readonly enCours: boolean;
    readonly relire: () => void;
}

/** L'erreur a montrer a la place d'une carte, ou `null` : la forme qu'attendent les cartes des statistiques. */
export function erreurDe(lecture: LectureDeMesures): { readonly erreur: unknown; readonly relire: () => void } | null {
    return lecture.enErreur ? { erreur: lecture.erreur, relire: lecture.relire } : null;
}

function combiner(resultats: readonly UseQueryResult<Mesure[]>[]): LectureDeMesures {
    const enErreur = resultats.some((r) => r.isError);
    const complet = resultats.every((r) => r.data !== undefined);
    return {
        mesures: complet ? resultats.flatMap((r) => r.data ?? []) : undefined,
        enErreur,
        erreur: resultats.find((r) => r.isError)?.error ?? null,
        enCours: resultats.some((r) => r.isFetching),
        relire: () => { for (const r of resultats) if (r.isError) void r.refetch(); },
    };
}

export function useMesures(periode: Periode): LectureDeMesures {
    const hier = decaler(jourLocal(new Date()), -1);
    return useQueries({
        queries: tranchesDe(periode).map((tranche) => ({
            queryKey: cles.mesures(tranche.du),
            queryFn: () => lireLaTranche(tranche),
            staleTime: tranche.au >= hier ? RECENTE : CLOSE,
            // Une ligne illisible le restera : la relire ne sert a rien. Un accroc reseau, si (client.ts).
            retry: (essais: number, erreur: Error) => !(erreur instanceof MesureIllisible) && essais < 1,
        })),
        combine: combiner,
    });
}

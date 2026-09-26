/**
 * Le catalogue, pour les cases du ciblage, le filtre global par campus et la verification des codes.
 * Un echec ne bloque rien : le ciblage par campus se dit indisponible, la verification est sautee.
 */

import { useQuery } from '@tanstack/react-query';

import { listerEtablissements, type EtablissementConnu } from '../lib/base';
import { cles } from './client';

const AUCUN: readonly EtablissementConnu[] = [];

export function useEtablissements() {
    const requete = useQuery({ queryKey: cles.etablissements, queryFn: listerEtablissements, staleTime: 5 * 60_000 });
    return {
        etablissements: requete.data ?? AUCUN,
        /** `null` tant que le catalogue n'a pas repondu : la verification des codes est alors sautee. */
        codes: requete.data === undefined ? null : requete.data.map((e) => e.code),
        enEchec: requete.isError,
    };
}

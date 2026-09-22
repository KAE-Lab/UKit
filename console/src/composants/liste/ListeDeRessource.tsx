/**
 * La liste complete d'une ressource : les outils (recherche, filtres, total), la table, la pagination
 * — assembles depuis l'etat que l'URL porte.
 */

import { useEtablissements } from '../../requetes/useEtablissements';
import type { Descripteur, Option } from '../../schema/descripteurs';
import type { Ligne } from '../../supabase';
import { Filtres } from './Filtres';
import { Pagination } from './Pagination';
import { Table } from './Table';
import type { Defauts } from './etatUrl';
import { useTableServeur } from './useTableServeur';

export interface ListeDeRessourceProps {
    readonly descripteur: Descripteur;
    readonly defauts?: Defauts;
    readonly complements?: readonly { readonly id: string; readonly libelle: string; readonly options: readonly Option[] }[];
    readonly optionsEnPlus?: Readonly<Record<string, readonly Option[]>>;
    readonly lienDe?: (ligne: Ligne) => string;
}

export function ListeDeRessource({ descripteur, defauts, complements, optionsEnPlus, lienDe }: ListeDeRessourceProps) {
    const { etat, poser, requete } = useTableServeur(descripteur, defauts);
    const { codes } = useEtablissements();
    const total = requete.data?.total;
    return (
        <>
            <Filtres descripteur={descripteur} etat={etat} poser={poser} total={total ?? null} complements={complements} optionsEnPlus={optionsEnPlus} />
            <Table
                descripteur={descripteur}
                etat={etat}
                poser={poser}
                lignes={requete.data?.lignes}
                total={total}
                enChargement={requete.isPending}
                perime={requete.isPlaceholderData || (requete.isFetching && !requete.isPending)}
                erreur={requete.error}
                reessayer={() => { void requete.refetch(); }}
                codesConnus={codes}
                lienDe={lienDe}
            />
            <Pagination etat={etat} poser={poser} total={total ?? null} />
        </>
    );
}

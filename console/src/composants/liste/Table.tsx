/**
 * La liste d'une ressource : TanStack Table v9 en mode serveur — l'etat vient de l'URL, la base
 * trie, filtre et pagine (useTableServeur) — et la peau de la console.
 *
 * La regle transverse du jalon 7-E s'applique ici : en chargement, des lignes squelettes a la
 * hauteur des lignes attendues ; en echec, l'erreur prend la place des lignes, avec « Reessayer » ;
 * une page suivante en cours de lecture laisse la precedente, estompee. Une ligne s'ouvre a la
 * souris comme a « Entree » — sauf dans une table qui ne s'ouvre pas, sans cle lisible (7-H).
 */

import {
    columnFilteringFeature,
    createColumnHelper,
    globalFilteringFeature,
    rowPaginationFeature,
    rowSortingFeature,
    tableFeatures,
    useTable,
    type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, type KeyboardEvent } from 'react';

import type { EtatDeTable } from '../../lib/requete';
import { champDe, cleDeLigne, cleVersUrl, colonneCalculee, colonnesTriables, type Descripteur } from '../../schema/descripteurs';
import type { Ligne } from '../../supabase';
import { EtatVide } from '../ui/EtatVide';
import { ErreurDeLecture } from '../ui/ErreurDeLecture';
import { SqueletteDeLignes } from '../ui/Squelette';
import { Cellule, CelluleCalculee, classeDeCellule } from './Cellules';

const FONCTIONS = tableFeatures({ rowSortingFeature, rowPaginationFeature, columnFilteringFeature, globalFilteringFeature });
const aide = createColumnHelper<typeof FONCTIONS, Ligne>();
const AUCUNE: readonly Ligne[] = [];
const LIGNES_SQUELETTE_MAX = 10;

export interface TableProps {
    readonly descripteur: Descripteur;
    readonly etat: EtatDeTable;
    readonly poser: (etat: EtatDeTable) => void;
    readonly lignes: readonly Ligne[] | undefined;
    readonly total: number | undefined;
    readonly enChargement: boolean;
    readonly perime: boolean;
    readonly erreur: unknown;
    readonly reessayer: () => void;
    readonly codesConnus: readonly string[] | null;
    /** Ou mene une ligne ; par defaut, son formulaire. */
    readonly lienDe?: (ligne: Ligne) => string;
    readonly vide?: string;
}

export function Table({ descripteur, etat, poser, lignes, total, enChargement, perime, erreur, reessayer, codesConnus, lienDe, vide }: TableProps) {
    const triables = colonnesTriables(descripteur);
    const colonnes = useMemo(() => descripteur.liste.map((nom) => aide.accessor((ligne) => ligne[nom], {
        id: nom,
        header: colonneCalculee(descripteur, nom)?.libelle ?? champDe(descripteur, nom)?.libelle ?? nom,
        enableSorting: triables.includes(nom),
    })), [descripteur, triables]);
    // Un etat calcule se lit a l'instant de l'affichage, comme la pastille de l'editeur.
    const maintenant = new Date();

    const table = useTable({
        features: FONCTIONS,
        columns: colonnes,
        data: lignes ?? AUCUNE,
        // Sans cle lisible, le rang dans la page tient lieu d'identite : les lignes ne s'ouvrent pas.
        getRowId: (ligne, rang) => (descripteur.ouvrable === false ? String(rang) : cleDeLigne(descripteur, ligne)),
        manualSorting: true,
        manualFiltering: true,
        manualPagination: true,
        rowCount: total,
        enableSortingRemoval: false,
        state: { sorting: etat.sorting as SortingState, pagination: etat.pagination, globalFilter: etat.globalFilter, columnFilters: etat.columnFilters as { id: string; value: unknown }[] },
        onSortingChange: (maj) => {
            const sorting = typeof maj === 'function' ? maj(etat.sorting as SortingState) : maj;
            poser({ ...etat, sorting, pagination: { ...etat.pagination, pageIndex: 0 } });
        },
    });

    const ouvrir = (ligne: Ligne) => { window.location.hash = lienDe === undefined ? `/${descripteur.chemin}/${cleVersUrl(descripteur, ligne)}` : lienDe(ligne); };
    const auClavier = (evenement: KeyboardEvent<HTMLTableRowElement>, ligne: Ligne) => {
        if (evenement.key === 'Enter' || evenement.key === ' ') { evenement.preventDefault(); ouvrir(ligne); }
    };
    const ouvrable = descripteur.ouvrable !== false;
    const nombreDeSquelettes = Math.min(etat.pagination.pageSize, total ?? LIGNES_SQUELETTE_MAX, LIGNES_SQUELETTE_MAX);
    const rangees = table.getRowModel().rows;

    return (
        <div className="defilable">
            <table className="tableau">
                <thead>
                    {table.getHeaderGroups().map((groupe) => (
                        <tr key={groupe.id}>
                            {groupe.headers.map((entete) => {
                                const tri = entete.column.getIsSorted();
                                const libelle = <table.FlexRender header={entete} />;
                                if (!entete.column.getCanSort()) return <th key={entete.id}>{libelle}</th>;
                                const Fleche = tri === 'asc' ? ArrowUp : tri === 'desc' ? ArrowDown : ArrowUpDown;
                                return (
                                    <th key={entete.id} aria-sort={tri === 'asc' ? 'ascending' : tri === 'desc' ? 'descending' : undefined}>
                                        <button type="button" className="tri" onClick={entete.column.getToggleSortingHandler()} aria-pressed={tri !== false}>
                                            {libelle}<Fleche className="icone" aria-hidden="true" />
                                        </button>
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                </thead>
                {lignes === undefined && enChargement ? <SqueletteDeLignes lignes={nombreDeSquelettes} colonnes={descripteur.liste.length} /> : null}
                {lignes === undefined && !enChargement && erreur !== null ? (
                    <tbody><tr><td colSpan={descripteur.liste.length} style={{ height: `calc(var(--hauteur-ligne) * ${nombreDeSquelettes})` }}><ErreurDeLecture erreur={erreur} reessayer={reessayer} /></td></tr></tbody>
                ) : null}
                {lignes !== undefined && lignes.length === 0 ? (
                    <tbody><tr><td colSpan={descripteur.liste.length}><EtatVide>{vide ?? descripteur.vide ?? 'Aucune ligne pour ces filtres.'}</EtatVide></td></tr></tbody>
                ) : null}
                {lignes !== undefined && lignes.length > 0 ? (
                    <tbody className={perime ? 'perime' : undefined} aria-busy={perime}>
                        {rangees.map((rangee) => (
                            <tr
                                key={rangee.id}
                                className={ouvrable ? 'cliquable' : undefined}
                                tabIndex={ouvrable ? 0 : undefined}
                                role={ouvrable ? 'link' : undefined}
                                onClick={ouvrable ? () => ouvrir(rangee.original) : undefined}
                                onKeyDown={ouvrable ? (e) => auClavier(e, rangee.original) : undefined}
                            >
                                {rangee.getAllCells().map((cellule) => {
                                    const calculee = colonneCalculee(descripteur, cellule.column.id);
                                    if (calculee !== undefined) return <td key={cellule.id}><CelluleCalculee etat={calculee.valeur(rangee.original, maintenant)} /></td>;
                                    const champ = champDe(descripteur, cellule.column.id);
                                    return (
                                        <td key={cellule.id} className={classeDeCellule(cellule.column.id, champ)}>
                                            <Cellule champ={champ} valeur={cellule.getValue()} codesConnus={codesConnus} />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                ) : null}
            </table>
        </div>
    );
}

/**
 * Le journal : tout ce qui s'est ecrit, filtrable, exportable en JSON.
 *
 * Lu par pages de cent, les plus recentes d'abord ; l'export relit tout, par pages de mille, avec
 * les memes filtres — c'est le fichier a remettre quand quelque chose a mal tourne.
 */

import { useCallback, useEffect, useState } from 'react';

import { supabase, type Ligne } from '../supabase';
import { formaterDate } from '../lib/dates';
import { exporterJson } from '../lib/exportJson';
import { RESSOURCES } from '../schema/tables';
import { Bouton } from '../composants/Bouton';
import { EtatVide } from '../composants/EtatVide';
import { Retour } from '../composants/Retour';

const PAGE = 100;
const PAGE_EXPORT = 1000;
const OPERATIONS = ['INSERT', 'UPDATE', 'DELETE'] as const;

interface Filtres {
    readonly table: string;
    readonly operation: string;
}

function requete(filtres: Filtres, de: number, a: number) {
    let base = supabase.from('journal').select('*').order('id', { ascending: false }).range(de, a);
    if (filtres.table !== '') base = base.eq('table_name', filtres.table);
    if (filtres.operation !== '') base = base.eq('operation', filtres.operation);
    return base;
}

async function toutLire(filtres: Filtres): Promise<Ligne[]> {
    const tout: Ligne[] = [];
    for (let page = 0; ; page++) {
        const { data, error } = await requete(filtres, page * PAGE_EXPORT, (page + 1) * PAGE_EXPORT - 1);
        if (error !== null) throw new Error(error.message);
        const lignes = (data ?? []) as Ligne[];
        tout.push(...lignes);
        if (lignes.length < PAGE_EXPORT) return tout;
    }
}

function Entree({ ligne }: { readonly ligne: Ligne }) {
    return (
        <tr>
            <td className="petit">{formaterDate(ligne.quand)}</td>
            <td><span className="pastille accent">{String(ligne.table_name)}</span></td>
            <td><span className={`pastille ${ligne.operation === 'DELETE' ? 'panne' : ligne.operation === 'INSERT' ? 'ok' : ''}`}>{String(ligne.operation)}</span></td>
            <td className="mono">{String(ligne.ligne_id ?? '—')}</td>
            <td className="petit">{String(ligne.par ?? '—')}</td>
            <td>
                <details>
                    <summary className="secondaire petit">avant / après</summary>
                    <div className="diff">
                        <div><div className="titre">Avant</div><pre>{ligne.avant === null ? '—' : JSON.stringify(ligne.avant, null, 2)}</pre></div>
                        <div><div className="titre">Après</div><pre>{ligne.apres === null ? '—' : JSON.stringify(ligne.apres, null, 2)}</pre></div>
                    </div>
                </details>
            </td>
        </tr>
    );
}

export function Journal() {
    const [filtres, setFiltres] = useState<Filtres>({ table: '', operation: '' });
    const [page, setPage] = useState(0);
    const [lignes, setLignes] = useState<readonly Ligne[] | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    const charger = useCallback(async () => {
        setErreur(null);
        const { data, error } = await requete(filtres, page * PAGE, (page + 1) * PAGE - 1);
        if (error !== null) setErreur(error.message);
        else setLignes((data ?? []) as Ligne[]);
    }, [filtres, page]);

    useEffect(() => { void charger(); }, [charger]);

    const exporter = async () => {
        try {
            exporterJson(`journal-${new Date().toISOString().slice(0, 10)}.json`, await toutLire(filtres));
        } catch (echec) {
            setErreur(echec instanceof Error ? echec.message : String(echec));
        }
    };

    const tables = [...new Set(RESSOURCES.map((ressource) => ressource.table))];

    return (
        <>
            <div className="entete-page">
                <div><h1>Journal</h1><p className="sous-titre">Chaque écriture dans une table publiable : avant, après, qui, quand. Rien ne le contourne.</p></div>
                <Bouton variante="tonal" onClick={() => { void exporter(); }}>Exporter en JSON</Bouton>
            </div>
            <div className="carte">
                <div className="filtres">
                    <select value={filtres.table} onChange={(e) => { setPage(0); setFiltres({ ...filtres, table: e.target.value }); }}>
                        <option value="">Toutes les tables</option>
                        {tables.map((table) => <option key={table} value={table}>{table}</option>)}
                    </select>
                    <select value={filtres.operation} onChange={(e) => { setPage(0); setFiltres({ ...filtres, operation: e.target.value }); }}>
                        <option value="">Toutes les opérations</option>
                        {OPERATIONS.map((operation) => <option key={operation} value={operation}>{operation}</option>)}
                    </select>
                    <span className="espace" />
                    <Bouton variante="discret" disabled={page === 0} onClick={() => setPage(page - 1)}>Plus récent</Bouton>
                    <span className="secondaire petit">page {page + 1}</span>
                    <Bouton variante="discret" disabled={lignes === null || lignes.length < PAGE} onClick={() => setPage(page + 1)}>Plus ancien</Bouton>
                </div>
                {erreur !== null ? <Retour ton="erreur">{erreur}</Retour> : null}
                {lignes === null ? <p className="secondaire">Lecture…</p> : lignes.length === 0 ? <EtatVide>Aucune écriture pour ces filtres.</EtatVide> : (
                    <div className="defilable">
                        <table className="tableau">
                            <thead><tr><th>Quand</th><th>Table</th><th>Opération</th><th>Ligne</th><th>Par</th><th>Détail</th></tr></thead>
                            <tbody>{lignes.map((ligne) => <Entree key={String(ligne.id)} ligne={ligne} />)}</tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

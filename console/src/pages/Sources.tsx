/**
 * Les sources, telles que les sondes du matin les ont vues : l'etat, depuis quand, le detail.
 *
 * La table `sondes` est ecrite par le workflow des sondes (sondes/, lot B3) ; vide, la page le dit.
 */

import { useEffect, useState } from 'react';

import { supabase, type Ligne } from '../supabase';
import { depuis, formaterDate } from '../lib/dates';
import { EtatVide } from '../composants/EtatVide';
import { Retour } from '../composants/Retour';

function Detail({ detail }: { readonly detail: unknown }) {
    if (detail === null || typeof detail !== 'object') return <span className="secondaire">—</span>;
    const objet = detail as Record<string, unknown>;
    const resume = [objet.etape, objet.code].filter((valeur) => typeof valeur === 'string' && valeur !== '').join(' · ');
    return (
        <details>
            <summary className="petit">{resume === '' ? 'détail' : resume}</summary>
            <pre className="petit">{JSON.stringify(detail, null, 2)}</pre>
        </details>
    );
}

export function Sources() {
    const [lignes, setLignes] = useState<readonly Ligne[] | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    useEffect(() => {
        void supabase.from('sondes').select('*').order('source').then(({ data, error }) => {
            if (error !== null) setErreur(error.message);
            else setLignes((data ?? []) as Ligne[]);
        });
    }, []);

    const pannes = lignes?.filter((ligne) => ligne.etat === 'panne').length ?? 0;

    return (
        <>
            <div className="entete-page">
                <div><h1>Sources</h1><p className="sous-titre">Ce que les sondes du matin ont vu : une ligne par source, remplacée à chaque mesure.</p></div>
                {lignes !== null && lignes.length > 0 ? (
                    <span className={`pastille ${pannes > 0 ? 'panne' : 'ok'}`}><span className="point" />{pannes > 0 ? `${pannes} en panne` : 'tout répond'}</span>
                ) : null}
            </div>
            <div className="carte">
                {erreur !== null ? <Retour ton="erreur">{erreur}</Retour> : null}
                {lignes === null ? <p className="secondaire">Lecture…</p> : lignes.length === 0 ? (
                    <EtatVide>Aucune mesure encore : les sondes écrivent ici chaque matin, dès que le workflow tourne.</EtatVide>
                ) : (
                    <div className="defilable">
                        <table className="tableau">
                            <thead><tr><th>Source</th><th>État</th><th>Depuis</th><th>Dernière mesure</th><th>Détail</th></tr></thead>
                            <tbody>
                                {lignes.map((ligne) => (
                                    <tr key={String(ligne.source)}>
                                        <td><strong>{String(ligne.source)}</strong></td>
                                        <td><span className={`pastille ${ligne.etat === 'ok' ? 'ok' : 'panne'}`}><span className="point" />{String(ligne.etat)}</span></td>
                                        <td>{depuis(ligne.change_le)} <span className="secondaire petit">({formaterDate(ligne.change_le)})</span></td>
                                        <td>{formaterDate(ligne.mesure_le)}</td>
                                        <td><Detail detail={ligne.detail} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

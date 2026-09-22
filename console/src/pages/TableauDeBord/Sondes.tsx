/**
 * La table des sondes du matin, partagee par le tableau de bord et la page Sources : l'etat, depuis
 * quand, et le detail quand la page le demande.
 */

import { useTout, SANS_FILTRE } from '../../requetes/useListe';
import { depuis, formaterDate } from '../../lib/dates';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { EtatVide } from '../../composants/ui/EtatVide';
import { Pastille } from '../../composants/ui/Pastille';
import { SqueletteDeLignes } from '../../composants/ui/Squelette';
import type { Ligne } from '../../supabase';

const SPEC = { ...SANS_FILTRE, tri: [{ colonne: 'source', desc: false }] };

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

export function useSondes() {
    return useTout('sondes', '*', SPEC);
}

export function nombreDePannes(lignes: readonly Ligne[]): number {
    return lignes.filter((ligne) => ligne.etat === 'panne').length;
}

export function TableDesSondes({ detail = false }: { readonly detail?: boolean }) {
    const requete = useSondes();
    const colonnes = detail ? 5 : 3;
    return (
        <div className="defilable">
            <table className="tableau">
                <thead><tr><th>Source</th><th>État</th><th>Depuis</th>{detail ? <><th>Dernière mesure</th><th>Détail</th></> : null}</tr></thead>
                {requete.isPending ? <SqueletteDeLignes lignes={6} colonnes={colonnes} /> : null}
                {requete.isError ? <tbody><tr><td colSpan={colonnes} style={{ height: 'calc(var(--hauteur-ligne) * 6)' }}><ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /></td></tr></tbody> : null}
                {requete.data !== undefined && requete.data.length === 0 ? <tbody><tr><td colSpan={colonnes}><EtatVide>Aucune mesure encore : les sondes écrivent ici chaque matin, dès que le workflow tourne.</EtatVide></td></tr></tbody> : null}
                {requete.data !== undefined && requete.data.length > 0 ? (
                    <tbody>
                        {requete.data.map((ligne) => (
                            <tr key={String(ligne.source)}>
                                <td><strong>{String(ligne.source)}</strong></td>
                                <td><Pastille ton={ligne.etat === 'ok' ? 'ok' : 'panne'} point>{String(ligne.etat)}</Pastille></td>
                                <td>{depuis(ligne.change_le)} <span className="secondaire petit">({formaterDate(ligne.change_le)})</span></td>
                                {detail ? <><td>{formaterDate(ligne.mesure_le)}</td><td><Detail detail={ligne.detail} /></td></> : null}
                            </tr>
                        ))}
                    </tbody>
                ) : null}
            </table>
        </div>
    );
}

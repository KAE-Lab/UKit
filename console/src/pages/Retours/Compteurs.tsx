/**
 * Les compteurs en tete de la page Retours : par etat (cliquables, ils posent le filtre), par
 * nature, par campus demande, et les huit dernieres semaines.
 */

import type { Compteurs } from './compteurs';
import { ETATS_DE_RETOUR, NATURES_DE_RETOUR } from '../../schema/tables/retours';
import { SqueletteBloc } from '../../composants/ui/Squelette';

export function BlocDeCompteurs({ compteurs, filtreEtat, poserEtat }: {
    readonly compteurs: Compteurs | null;
    readonly filtreEtat: readonly string[] | null;
    readonly poserEtat: (etats: readonly string[] | null) => void;
}) {
    if (compteurs === null) {
        return <div className="compteurs" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <SqueletteBloc key={i} hauteur={76} />)}</div>;
    }
    const max = Math.max(1, ...compteurs.parSemaine.map((s) => s.n));
    const actif = (etats: readonly string[] | null) => JSON.stringify(filtreEtat) === JSON.stringify(etats);
    return (
        <div style={{ display: 'grid', gap: 'var(--espace-md)' }}>
            <div className="compteurs">
                <div className={`compteur ${actif(null) ? 'actif' : ''}`}>
                    <button type="button" onClick={() => poserEtat(null)} aria-pressed={actif(null)}>
                        <span className="valeur">{compteurs.total}</span><span className="libelle">Tous les retours</span>
                    </button>
                </div>
                {ETATS_DE_RETOUR.map((etat) => (
                    <div key={etat.valeur} className={`compteur ${actif([etat.valeur]) ? 'actif' : ''}`}>
                        <button type="button" onClick={() => poserEtat([etat.valeur])} aria-pressed={actif([etat.valeur])}>
                            <span className="valeur">{compteurs.parEtat[etat.valeur] ?? 0}</span><span className="libelle">{etat.libelle}</span>
                        </button>
                    </div>
                ))}
            </div>
            <div className="trois-colonnes">
                <div>
                    <h3>Par nature</h3>
                    <table className="tableau-compact"><tbody>
                        {NATURES_DE_RETOUR.map((n) => <tr key={n.valeur}><td>{n.libelle}</td><td className="nombre">{compteurs.parNature[n.valeur] ?? 0}</td></tr>)}
                    </tbody></table>
                </div>
                <div>
                    <h3>Par campus demandé</h3>
                    <table className="tableau-compact"><tbody>
                        {compteurs.parCampus.length === 0 ? <tr><td className="secondaire">—</td></tr> : compteurs.parCampus.slice(0, 6).map((c) => <tr key={c.campus}><td>{c.campus}</td><td className="nombre">{c.n}</td></tr>)}
                    </tbody></table>
                </div>
                <div>
                    <h3>Les huit dernières semaines</h3>
                    <div className="barres" role="img" aria-label={compteurs.parSemaine.map((s) => `semaine du ${s.debut} : ${s.n}`).join(', ')}>
                        {compteurs.parSemaine.map((s) => <div key={s.debut} className="barre-semaine" style={{ height: `${Math.max(3, (s.n / max) * 100)}%` }}><span>{s.n}</span></div>)}
                    </div>
                    <div className="legende-semaines">{compteurs.parSemaine.map((s) => <span key={s.debut}>{s.debut.slice(8, 10)}/{s.debut.slice(5, 7)}</span>)}</div>
                </div>
            </div>
        </div>
    );
}

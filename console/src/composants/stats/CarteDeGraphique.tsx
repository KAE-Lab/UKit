/**
 * La carte d'un graphique : son titre, le graphique charge a part, et son jumeau en tableau — chaque
 * valeur se lit aussi sans survol, au clavier et au lecteur d'ecran. Pendant la lecture, la carte garde
 * la hauteur du graphique.
 */

import { ChartLine, Table2 } from 'lucide-react';
import { lazy, Suspense, useState, type ReactNode } from 'react';

import { formaterCompte } from '../../stats/formats';
import { libelleDuJour } from '../../stats/periode';
import { Bouton } from '../ui/Bouton';
import { ErreurDeLecture } from '../ui/ErreurDeLecture';
import type { GraphiqueProps } from './Graphique';

const Graphique = lazy(() => import('./Graphique'));

/** L'attente a la hauteur du graphique (`--hauteur-graphique`) : rien ne saute quand il arrive. */
function Attente() {
    return <div className="squelette attente-de-graphique" aria-hidden="true" />;
}

export interface CarteDeGraphiqueProps extends Omit<GraphiqueProps, 'points'> {
    readonly titre: ReactNode;
    /** `undefined` pendant la lecture. */
    readonly points: GraphiqueProps['points'] | undefined;
    readonly erreur?: { readonly erreur: unknown; readonly relire: () => void } | null;
    readonly actions?: ReactNode;
}

export function CarteDeGraphique({ titre, points, forme, serie, erreur, actions }: CarteDeGraphiqueProps) {
    const [tableau, setTableau] = useState(false);
    const Icone = tableau ? ChartLine : Table2;
    const bascule = tableau ? 'Voir le graphique' : 'Voir le tableau';
    let corps: ReactNode;
    if (erreur !== null && erreur !== undefined) corps = <ErreurDeLecture erreur={erreur.erreur} reessayer={erreur.relire} />;
    else if (points === undefined) corps = <Attente />;
    else if (tableau) {
        corps = (
            <div className="defilable tableau-de-graphique">
                <table className="tableau">
                    <thead><tr><th>Jour</th><th className="nombre">{serie}</th></tr></thead>
                    <tbody>{points.map((p) => <tr key={p.jour}><td>{libelleDuJour(p.jour)}</td><td className="nombre">{formaterCompte(p.valeur)}</td></tr>)}</tbody>
                </table>
            </div>
        );
    } else corps = <Suspense fallback={<Attente />}><Graphique points={points} forme={forme} serie={serie} /></Suspense>;
    return (
        <section className="carte carte-stat">
            <header className="tete-de-carte">
                <h2>{titre}</h2>
                <div className="boutons">
                    {actions}
                    <Bouton variante="discret" compact icone={<Icone className="icone" aria-hidden="true" />} aria-pressed={tableau} title={bascule} aria-label={bascule} onClick={() => setTableau((t) => !t)} />
                </div>
            </header>
            {corps}
        </section>
    );
}

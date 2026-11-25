/**
 * Une carte de listes a barres, sur le modele de Plausible : un titre, et quand une meme mesure se lit
 * de plusieurs facons — par campus, par version, par plateforme —, un controle segmente qui passe de
 * l'une a l'autre dans la meme carte plutot que trois cartes cote a cote.
 */

import { useState, type ReactNode } from 'react';

import { ErreurDeLecture } from '../ui/ErreurDeLecture';
import { Segments } from '../ui/Segments';
import { ListeABarres, type ListeABarresProps } from './ListeABarres';

export interface VueDeListe extends ListeABarresProps {
    readonly valeur: string;
    readonly libelle: string;
}

export interface ErreurDeCarte {
    readonly erreur: unknown;
    readonly relire: () => void;
}

export function CarteDeListe({ titre, vues, actions, erreur }: {
    readonly titre: ReactNode;
    readonly vues: readonly [VueDeListe, ...VueDeListe[]];
    readonly actions?: ReactNode;
    /** Une lecture en echec prend la place de la liste, avec « Reessayer ». */
    readonly erreur?: ErreurDeCarte | null;
}) {
    const [valeur, setValeur] = useState(vues[0].valeur);
    const vue = vues.find((v) => v.valeur === valeur) ?? vues[0];
    return (
        <section className="carte carte-stat">
            <header className="tete-de-carte">
                <h2>{titre}</h2>
                <div className="boutons">
                    {actions}
                    {vues.length > 1 ? <Segments valeur={vue.valeur} options={vues.map((v) => ({ valeur: v.valeur, libelle: v.libelle }))} onChange={setValeur} etiquette={`${typeof titre === 'string' ? titre : 'Liste'} : vue`} /> : null}
                </div>
            </header>
            {erreur === null || erreur === undefined ? <ListeABarres {...vue} nomCache /> : <ErreurDeLecture erreur={erreur.erreur} reessayer={erreur.relire} />}
        </section>
    );
}

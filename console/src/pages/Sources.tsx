/**
 * Les sources, telles que les sondes du matin les ont vues : l'etat, depuis quand, le detail. La
 * seconde moitie — les echecs que l'application mesure (`source.echec`, 7-D) — a sa place reservee ;
 * 7-G la remplit.
 */

import { Activity } from 'lucide-react';

import { TableDesSondes } from './TableauDeBord/Sondes';
import { Encart } from '../composants/ui/Encart';
import { EtatVide } from '../composants/ui/EtatVide';

export function Sources() {
    return (
        <>
            <div className="entete-page">
                <div><h1>Sources</h1><p className="sous-titre">Ce que les sondes du matin ont vu : une ligne par source, remplacée à chaque mesure.</p></div>
            </div>
            <div className="carte">
                <h2>Les sondes du matin</h2>
                <TableDesSondes detail />
            </div>
            <div className="carte">
                <h2><Activity className="icone" aria-hidden="true" />Les échecs mesurés par l’application</h2>
                <Encart ton="info">Depuis la 6.3, chaque source qui ne répond pas sur un téléphone se compte (<code>source.echec</code>, docs/mesure.md), par hôte et par heure. Les tableaux arrivent avec le jalon 7-G, deux semaines après la sortie.</Encart>
                <EtatVide>Rien à montrer encore : la place est réservée.</EtatVide>
            </div>
        </>
    );
}

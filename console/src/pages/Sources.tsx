/**
 * Les sources, telles que les sondes du matin les ont vues : l'etat, depuis quand, le detail. Et, a
 * cote, ce que l'application a compte sur les telephones (`source.echec`, 7-D) sur les sept derniers
 * jours : la carte que 7-E reservait, remplie par les statistiques (lot 0 de la phase 8). La periode
 * se choisit dans les statistiques, ou la meme carte se lit sur n'importe quelle plage.
 */

import { useCampusChoisi } from '../composants/campus';
import { derniersJours, precedente } from '../stats/periode';
import { TableDesSondes } from './TableauDeBord/Sondes';
import { useLignes } from './Statistiques/choix';
import { CartesDesEchecs, useEchecs } from './Statistiques/Echecs';

export function Sources() {
    const campus = useCampusChoisi();
    const semaine = derniersJours(7, new Date());
    const { lignes, lecture } = useLignes({ periode: semaine, precedente: precedente(semaine), filtre: { testeurs: false, campus } });
    const echecs = useEchecs(lignes, semaine, null);
    return (
        <>
            <div className="entete-page">
                <div><h1>Sources</h1><p className="sous-titre">Ce que les sondes du matin ont vu : une ligne par source, remplacée à chaque mesure.</p></div>
            </div>
            <div className="pile-stats">
                <div className="carte">
                    <h2>Les sondes du matin</h2>
                    <TableDesSondes detail />
                </div>
                <CartesDesEchecs echecs={echecs} lecture={lecture} hote={null} titre="Échecs mesurés par l’application, 7 jours" />
                <p className="lien-de-suite"><a href="#/statistiques/sources">Les échecs sur une autre période, hôte par hôte</a></p>
            </div>
        </>
    );
}

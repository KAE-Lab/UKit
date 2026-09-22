/**
 * La page d'arrivee : le parc actif, l'etat des sources, les retours ouverts, les annonces actives
 * et programmees. Quatre cartes independantes : chacune charge, echoue et se relit seule.
 */

import { Activity } from 'lucide-react';

import { Pastille } from '../../composants/ui/Pastille';
import { CarteDesAnnonces, CarteDesRetours, CarteDuParc } from './Cartes';
import { nombreDePannes, TableDesSondes, useSondes } from './Sondes';

function CarteDesSources() {
    const requete = useSondes();
    const pannes = requete.data === undefined ? null : nombreDePannes(requete.data);
    return (
        <section className="carte">
            <h2>
                <span><Activity className="icone" aria-hidden="true" />Sources{pannes === null ? null : <> <Pastille ton={pannes > 0 ? 'panne' : 'ok'} point>{pannes > 0 ? `${pannes} en panne` : 'tout répond'}</Pastille></>}</span>
                <a href="#/sources">ouvrir</a>
            </h2>
            <div className="corps"><TableDesSondes /></div>
        </section>
    );
}

export function TableauDeBord() {
    return (
        <>
            <div className="entete-page">
                <div><h1>Tableau de bord</h1><p className="sous-titre">Ce qu’il faut savoir en arrivant : le parc, les sources, les retours, les annonces.</p></div>
            </div>
            <div className="bord">
                <CarteDuParc />
                <CarteDesSources />
                <CarteDesRetours />
                <CarteDesAnnonces />
            </div>
        </>
    );
}

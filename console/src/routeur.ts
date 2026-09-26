/**
 * Le routeur de la console : le fragment de l'URL, et rien d'autre.
 *
 * Une page statique sur GitHub Pages ne sait pas servir `/annonces` ; `#/annonces`, si. Le fragment
 * porte le chemin et, depuis 7-E, une requete : `#/annonces/<cle>` ouvre une ligne, et
 * `#/annonces?q=soiree&page=2` retient la recherche et la page — ce qui rend le bouton « retour »
 * et le rechargement fideles. Quelques dizaines de lignes suffisent — un routeur tiers serait la
 * seule dependance qui ne servirait qu'a ca.
 */

import { useEffect, useState } from 'react';

export interface Route {
    /** Le chemin, sans le `#` ni la requete : `/`, `/annonces`, `/annonces/nouveau`. */
    readonly chemin: string;
    readonly params: URLSearchParams;
}

/** Signale un `replaceState`, que `hashchange` ne voit pas. */
const EVENEMENT = 'ukit:navigation';

export function routeDepuisFragment(fragment: string): Route {
    const sansDiese = fragment.replace(/^#/, '');
    const [chemin = '', requete = ''] = sansDiese.split('?', 2);
    return { chemin: chemin === '' ? '/' : chemin, params: new URLSearchParams(requete) };
}

function fragment(chemin: string, params?: URLSearchParams): string {
    const requete = params === undefined ? '' : params.toString();
    return `#${chemin}${requete === '' ? '' : `?${requete}`}`;
}

export function useRoute(): Route {
    const [route, setRoute] = useState(() => routeDepuisFragment(window.location.hash));
    useEffect(() => {
        const relire = () => setRoute(routeDepuisFragment(window.location.hash));
        window.addEventListener('hashchange', relire);
        window.addEventListener(EVENEMENT, relire);
        return () => {
            window.removeEventListener('hashchange', relire);
            window.removeEventListener(EVENEMENT, relire);
        };
    }, []);
    return route;
}

/** Va a une page ; `remplacer` ne cree pas d'entree d'historique (la recherche, la page). */
export function naviguer(chemin: string, params?: URLSearchParams, options: { readonly remplacer?: boolean } = {}): void {
    const cible = fragment(chemin, params);
    if (options.remplacer === true) {
        window.history.replaceState(null, '', cible);
        window.dispatchEvent(new Event(EVENEMENT));
        return;
    }
    window.location.hash = cible;
}

export function lienVers(chemin: string, params?: URLSearchParams): string {
    return fragment(chemin, params);
}

/** `/annonces/abc/def` -> le premier segment et le reste, ou `null` pour la racine. */
export function segmentsDe(chemin: string): { readonly tete: string; readonly reste: string | null } | null {
    const propre = chemin.replace(/^\/+/, '');
    if (propre === '') return null;
    const barre = propre.indexOf('/');
    if (barre === -1) return { tete: propre, reste: null };
    const reste = propre.slice(barre + 1);
    return { tete: propre.slice(0, barre), reste: reste === '' ? null : reste };
}

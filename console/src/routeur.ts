/**
 * Le routeur de la console : le fragment de l'URL, et rien d'autre.
 *
 * Une page statique sur GitHub Pages ne sait pas servir `/annonces` ; `#/annonces`, si. Vingt lignes
 * suffisent — un routeur tiers serait la seule dependance qui ne servirait qu'a ca.
 */

import { useEffect, useState } from 'react';

function cheminCourant(): string {
    const fragment = window.location.hash.replace(/^#/, '');
    return fragment === '' ? '/' : fragment;
}

export function useChemin(): string {
    const [chemin, setChemin] = useState(cheminCourant);
    useEffect(() => {
        const relire = () => setChemin(cheminCourant());
        window.addEventListener('hashchange', relire);
        return () => window.removeEventListener('hashchange', relire);
    }, []);
    return chemin;
}

export function naviguer(chemin: string): void {
    window.location.hash = chemin;
}

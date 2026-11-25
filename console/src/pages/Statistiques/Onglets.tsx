/**
 * Les pages des statistiques, en onglets : chacune garde la periode et la bascule des testeurs. Sur un
 * telephone, la rangee defile, et l'onglet actif vient dans la vue plutot que de rester coupe au bord.
 */

import { useEffect, useRef } from 'react';

import { lienDeStatistiques, paramsCommuns } from './choix';

export const PAGES = [
    // `variation` : la page compare a la periode precedente, et le dit sous les filtres.
    { chemin: '', libelle: 'Vue d’ensemble', variation: true },
    { chemin: 'annonces', libelle: 'Annonces', variation: true },
    { chemin: 'sources', libelle: 'Sources', variation: true },
    { chemin: 'reglages', libelle: 'Réglages', variation: false },
    { chemin: 'rapport', libelle: 'Rapport partenaire', variation: false },
] as const;

export function Onglets({ actif, params }: { readonly actif: string; readonly params: URLSearchParams }) {
    const communs = paramsCommuns(params);
    const rangee = useRef<HTMLElement>(null);
    useEffect(() => {
        const onglet = rangee.current?.querySelector<HTMLElement>('[aria-current="page"]');
        const conteneur = rangee.current;
        // Le defilement de la rangee seule : `scrollIntoView` ferait aussi defiler la page.
        if (onglet !== null && onglet !== undefined && conteneur !== null) conteneur.scrollLeft = onglet.offsetLeft - conteneur.offsetLeft - 16;
    }, [actif]);
    return (
        <nav className="onglets-stats" aria-label="Pages des statistiques" ref={rangee}>
            {PAGES.map((page) => (
                <a key={page.chemin} className="onglet-stat" href={lienDeStatistiques(page.chemin, communs)} aria-current={page.chemin === actif ? 'page' : undefined}>{page.libelle}</a>
            ))}
        </nav>
    );
}

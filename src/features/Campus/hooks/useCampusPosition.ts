/**
 * La position de l'utilisateur, resolue une fois et rendue en etat.
 *
 * `positionPartagee` est une promesse ; les ecrans, eux, ont besoin d'une valeur — c'est ce que ce
 * hook ajoute, et rien de plus. Le tableau de bord et les trois listes passent tous par lui depuis
 * 6.1-C, et la resolution elle-meme est partagee entre eux (`useCampusLocation.ts`).
 *
 * Trois etats, que les hooks de donnees distinguent : `resolue` faux, la position n'est pas encore
 * connue et le chargement attend ; `resolue` vrai sans `lat` ni `lon`, il n'y a pas de position et les
 * listes se chargent sans distance ; les deux coordonnees, la position de l'etudiant.
 *
 * Voir docs/features/campus.md.
 */

import { useEffect, useState } from 'react';

import { positionPartagee } from './useCampusLocation';

export interface CampusPosition {
    /** La resolution a abouti, avec ou sans position. */
    readonly resolue: boolean;
    readonly lat?: number;
    readonly lon?: number;
}

const EN_ATTENTE: CampusPosition = { resolue: false };

export function useCampusPosition(): CampusPosition {
    const [position, setPosition] = useState<CampusPosition>(EN_ATTENTE);

    useEffect(() => {
        let monte = true;
        positionPartagee().then((resolue) => {
            if (!monte) return;
            setPosition(resolue === null ? { resolue: true } : { resolue: true, lat: resolue.lat, lon: resolue.lon });
        });
        return () => {
            monte = false;
        };
    }, []);

    return position;
}

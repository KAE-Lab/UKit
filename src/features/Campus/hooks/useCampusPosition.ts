/**
 * La position de l'utilisateur, resolue une fois et rendue en etat.
 *
 * `useCampusLocation` expose une fonction a appeler ; les ecrans de liste, eux, ont besoin d'une
 * valeur — c'est ce que ce hook ajoute, et rien de plus. Le tableau de bord fait deja la meme chose a
 * la main pour ses quatre sections, et continue : il resout une seule fois pour toutes.
 *
 * Tant que la position n'est pas connue, `lat` et `lon` valent `undefined`, ce qui est exactement le
 * signal « pas encore pret » qu'attendent les hooks de donnees.
 *
 * Voir docs/features/campus.md.
 */

import { useEffect, useState } from 'react';

import { useCampusLocation } from './useCampusLocation';

export interface CampusPosition {
    readonly lat?: number;
    readonly lon?: number;
}

export function useCampusPosition(): CampusPosition {
    const { fetchLocation } = useCampusLocation();
    const [position, setPosition] = useState<CampusPosition>({});

    useEffect(() => {
        let monte = true;
        fetchLocation().then(({ lat, lon }) => {
            if (monte) setPosition({ lat, lon });
        });
        return () => {
            monte = false;
        };
    }, [fetchLocation]);

    return position;
}

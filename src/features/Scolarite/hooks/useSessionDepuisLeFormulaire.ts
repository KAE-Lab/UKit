/**
 * Une session lancee **depuis un formulaire** garde la page a ce formulaire jusqu'a son terme.
 *
 * `LOGIN_SUCCESS` est emis au dixieme step sur vingt : les identifiants sont poses des que le CAS
 * accepte, donc `credentials` cesse d'etre nul **en plein run**. Un ecran qui aiguille sur
 * `credentials` bascule alors a mi-parcours — le formulaire et sa barre cedent la place a l'ecran de
 * chargement plein, deux vues pour le meme run. Corrige sur la fiche du compte le 2026-08-31, puis
 * constate sur le tableau de bord le soir de la sortie de la 6.0 : la garde n'avait ete posee que sur
 * l'un des deux hotes (docs/features/scolarite.md).
 *
 * Le formulaire signale son depart (`onDebut` de `ScolariteLoginView`) ; le drapeau retombe quand la
 * progression disparait — y compris sur un echec, ou le formulaire doit reprendre la main pour
 * afficher son message.
 *
 * **L'effet ne depend que de la transition de `progressionVisible`**, et c'est ce qui le rend juste :
 * `onDebut` part *avant* que la session soit visible (le moteur se libere, puis le run demarre). Un
 * effet rejoue a chaque rendu remettrait le drapeau a zero avant que la barre n'apparaisse.
 *
 * Deux hotes, le tableau de bord et la fiche du compte : une garde recopiee a deux endroits diverge,
 * et c'est exactement ce qui est arrive. Meme raison d'etre que `useEcranDeProgression`.
 */

import { useCallback, useEffect, useState } from 'react';

export interface SessionDepuisLeFormulaire {
    /** Une session lancee depuis le formulaire tourne : il garde la page. */
    readonly enCours: boolean;
    /** A brancher sur `onDebut` de `ScolariteLoginView`. */
    readonly onDebut: () => void;
}

export function useSessionDepuisLeFormulaire(progressionVisible: boolean): SessionDepuisLeFormulaire {
    const [enCours, setEnCours] = useState(false);

    useEffect(() => {
        if (!progressionVisible) setEnCours(false);
    }, [progressionVisible]);

    const onDebut = useCallback(() => setEnCours(true), []);

    return { enCours, onDebut };
}

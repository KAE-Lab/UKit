/**
 * Ce que l'interface lit des retours sans les ouvrir (lot 3) : le nombre de reponses non lues, pour la
 * pastille de l'onglet et de la rangee « Mes retours », et la proposition apres une capture, que les
 * Reglages rouvrent.
 */

import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { nonLues, type RetourConnu } from './donnees';
import { connusEnMemoire, ecrireProposition, EVENEMENT_RETOURS, lireConnus, lireProposition } from './memoire';

/** Le nombre de reponses non lues, pour la pastille : il suit chaque ecriture de « Mes retours ». */
export function useReponsesNonLues(): number {
    const [n, setN] = useState(() => nonLues(connusEnMemoire()));
    useEffect(() => {
        const abonnement = DeviceEventEmitter.addListener(EVENEMENT_RETOURS, (liste: RetourConnu[]) => setN(nonLues(liste)));
        void lireConnus().then((liste) => setN(nonLues(liste)));
        return () => abonnement.remove();
    }, []);
    return n;
}

/** « Proposer de signaler apres une capture » : l'inverse de « Ne plus proposer ». */
export function usePropositionApresCapture(): [boolean, (active: boolean) => void] {
    const [active, setActive] = useState(true);
    useEffect(() => {
        void lireProposition().then((m) => setActive(!m.jamais));
    }, []);
    const activer = useCallback((suivante: boolean) => {
        setActive(suivante);
        void lireProposition().then((m) => ecrireProposition({ jour: m.jour, jamais: !suivante }));
    }, []);
    return [active, activer];
}

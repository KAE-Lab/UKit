/**
 * « Mes retours » (lot 3) : la liste gardee sur l'appareil, relue a l'ouverture de l'ecran — la boite
 * d'envoi videe si le reseau le permet, les reponses relues sans attendre l'intervalle. Les reponses
 * nouvelles a l'ouverture restent signalees tant que l'ecran est ouvert, puis comptent comme vues.
 */

import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { EVENEMENT_RETOURS, relireLesReponses, viderLaBoite } from '../../shared/retours';
import { marquer, nonLues, type RetourConnu } from '../../shared/retours/donnees';
import { connusEnMemoire, lireConnus, modifierConnus } from '../../shared/retours/memoire';

export function useMesRetours() {
    const [retours, setRetours] = useState<readonly RetourConnu[]>(connusEnMemoire());
    const [lecture, setLecture] = useState(true);
    // Combien de reponses chaque retour avait deja de vues a l'ouverture : les suivantes sont nouvelles.
    const [vuesALOuverture, setVuesALOuverture] = useState<ReadonlyMap<string, number> | null>(null);

    useEffect(() => {
        const abonnement = DeviceEventEmitter.addListener(EVENEMENT_RETOURS, (liste: RetourConnu[]) => setRetours(liste));
        let monte = true;
        void (async () => {
            setVuesALOuverture(new Map((await lireConnus()).map((r) => [r.local, r.vues])));
            await viderLaBoite();
            await relireLesReponses(true);
            if (!monte) return;
            setLecture(false);
            await modifierConnus((liste) => (nonLues(liste) > 0 ? marquer(liste, 'vues') : liste));
        })();
        return () => {
            monte = false;
            abonnement.remove();
        };
    }, []);

    const nouvelles = (retour: RetourConnu): number => Math.max(0, retour.reponses.length - (vuesALOuverture?.get(retour.local) ?? retour.vues));
    return { retours, lecture, nouvelles };
}

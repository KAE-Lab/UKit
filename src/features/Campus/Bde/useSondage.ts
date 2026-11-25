/**
 * L'etat du sondage d'une fiche (lot 4) : le choix de l'appareil, les resultats, le vote en cours. Les
 * resultats ne se lisent qu'apres le vote, ou a la cloture : les montrer avant pousserait a suivre la
 * majorite. L'ecran compose et traduit ; tout ce qui decide vit ici ou dans `SondageService`.
 */

import { useCallback, useEffect, useState } from 'react';

import { estOuvert, type ResultatsDeSondage, type Sondage } from '../../../shared/annonces/sondage';
import { maintenantMs } from '../../../shared/services/Temps';
import { lireLesResultats, monChoix, voter, type IssueDuVote } from '../services/SondageService';

export interface EtatDuSondage {
    readonly ouvert: boolean;
    /** Le choix de cet appareil, `null` tant qu'il n'a pas vote. */
    readonly choix: string | null;
    /** `undefined` tant qu'ils ne sont pas lus ; `null` s'ils ne se lisent pas. */
    readonly resultats: ResultatsDeSondage | null | undefined;
    readonly enCours: string | null;
    readonly voter: (choix: string) => Promise<IssueDuVote | null>;
}

export function useSondage(annonce: string, sondage: Sondage): EtatDuSondage {
    const [ouvert, setOuvert] = useState(() => estOuvert(sondage, maintenantMs()));
    const [choix, setChoix] = useState<string | null>(null);
    const [resultats, setResultats] = useState<ResultatsDeSondage | null | undefined>(undefined);
    const [enCours, setEnCours] = useState<string | null>(null);

    const relire = useCallback(() => {
        void lireLesResultats(annonce, sondage).then(setResultats);
    }, [annonce, sondage]);

    useEffect(() => {
        let actif = true;
        void monChoix(annonce).then((c) => {
            if (!actif) return;
            setChoix(c);
            if (c !== null || !ouvert) relire();
        });
        return () => { actif = false; };
    // Une fois, a l'ouverture de la fiche : l'annonce arrive par les parametres de navigation.
    }, []);

    const voterPour = useCallback(async (id: string): Promise<IssueDuVote | null> => {
        if (enCours !== null || choix !== null || !ouvert) return null;
        setEnCours(id);
        try {
            const issue = await voter(annonce, id);
            if (issue === 'vote') setChoix(id);
            if (issue === 'clos') setOuvert(false);
            if (issue === 'vote' || issue === 'clos') relire();
            return issue;
        } finally {
            setEnCours(null);
        }
    }, [annonce, choix, enCours, ouvert, relire]);

    return { ouvert, choix, resultats, enCours, voter: voterPour };
}

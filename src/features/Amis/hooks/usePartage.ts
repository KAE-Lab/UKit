/**
 * Le partage de son emploi du temps (docs/phase-8/8-amis.md) : ce qui part, le prenom choisi, le lien.
 * Le prenom se garde sur l'appareil pour le partage suivant ; rien d'autre ne s'ecrit.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CLE_DU_PRENOM } from '../services/AmisStore';
import { preparerLePartage, type PreparationDuPartage } from '../services/PlanningDesAmis';
import { lienDu, nomAffichable } from '../services/lienAmi';

export type EtatDuPartage =
    | { readonly etat: 'lecture' }
    | { readonly etat: 'echec'; readonly raison: 'rien-a-partager' | 'lecture' }
    | { readonly etat: 'pret'; readonly preparation: Extract<PreparationDuPartage, { ok: true }>; readonly lien: string };

export function usePartage(): { etat: EtatDuPartage; prenom: string; changerLePrenom: (prenom: string) => void; relire: () => void } {
    const [preparation, setPreparation] = useState<PreparationDuPartage | null>(null);
    const [prenom, setPrenom] = useState('');
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        let vivant = true;
        AsyncStorage.getItem(CLE_DU_PRENOM)
            .then((garde) => { if (vivant && garde !== null) setPrenom(garde); })
            .catch(() => undefined);
        return () => { vivant = false; };
    }, []);

    useEffect(() => {
        let vivant = true;
        setPreparation(null);
        preparerLePartage()
            .then((resultat) => { if (vivant) setPreparation(resultat); })
            .catch((erreur) => {
                console.warn('[amis] partage en erreur', erreur);
                if (vivant) setPreparation({ ok: false, raison: 'lecture' });
            });
        return () => { vivant = false; };
    }, [revision]);

    const changerLePrenom = useCallback((suivant: string) => {
        setPrenom(suivant);
        const garde = nomAffichable(suivant);
        void (garde === null ? AsyncStorage.removeItem(CLE_DU_PRENOM) : AsyncStorage.setItem(CLE_DU_PRENOM, garde)).catch(() => undefined);
    }, []);

    const etat = useMemo<EtatDuPartage>(() => {
        if (preparation === null) return { etat: 'lecture' };
        if (preparation.ok === false) return { etat: 'echec', raison: preparation.raison };
        const lien = lienDu({ etablissement: preparation.etablissement, nom: prenom, contenu: preparation.contenu });
        return lien === null ? { etat: 'echec', raison: 'lecture' } : { etat: 'pret', preparation, lien };
    }, [preparation, prenom]);

    return { etat, prenom, changerLePrenom, relire: () => setRevision((r) => r + 1) };
}

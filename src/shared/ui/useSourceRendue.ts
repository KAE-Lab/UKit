/**
 * La source d'une image distante, en trois temps : l'adresse **rendue**, puis l'adresse
 * **d'origine**, puis rien — le composant montre alors son repli.
 *
 * Une transformation peut echouer : un format ou un poids hors des limites du service, un plan qui
 * changerait un jour. Sans le temps intermediaire, la panne d'un service accessoire viderait des
 * cartes dont l'image existe (jalon 7-C). Une adresse qui n'est pas transformable — Croustillant,
 * Affluences — n'a pas de premier temps : sa premiere erreur est la derniere.
 *
 * L'etat est indexe par l'adresse : une autre adresse repart du premier temps **au rendu meme**, sans
 * passer par un effet — un repli affiche une image de trop pendant un rendu, et c'est exactement le
 * flash que VisuelAvecRepli interdit (docs/theme.md).
 *
 * La largeur arrive en **points** ; ce hook est le seul a connaitre la densite de l'ecran, pour que
 * `rendu.ts` reste pur.
 */

import { useCallback, useState } from 'react';
import { PixelRatio } from 'react-native';
import type { ImageLoadEventData } from 'expo-image';

import { urlDeRendu, type OptionsDeRendu } from '../visuels/rendu';

type Temps = 'rendue' | 'origine' | 'repli';

export interface SourceRendue {
    /** L'adresse a afficher, ou `null` : le composant montre alors son repli. */
    readonly source: { readonly uri: string } | null;
    /** A poser sur **une seule** image par source : deux gestionnaires feraient deux transitions. */
    readonly onError: () => void;
    /** Journalise, en developpement, d'ou l'image est venue — reseau, memoire ou disque (docs/qualite.md). */
    readonly onLoad: (evenement: ImageLoadEventData) => void;
}

export function useSourceRendue(uri: string | null | undefined, options: OptionsDeRendu): SourceRendue {
    const [etat, setEtat] = useState<{ readonly uri: string | null | undefined; readonly temps: Temps }>({ uri, temps: 'rendue' });
    const temps: Temps = etat.uri === uri ? etat.temps : 'rendue';

    const absente = typeof uri !== 'string' || uri === '';
    const rendue = absente ? null : urlDeRendu(uri, { largeur: options.largeur * PixelRatio.get(), qualite: options.qualite });

    const onError = useCallback(() => {
        setEtat((courant) => {
            const tempsCourant: Temps = courant.uri === uri ? courant.temps : 'rendue';
            // Le second temps n'existe que si l'adresse rendue differe de l'origine.
            const suivant: Temps = tempsCourant === 'rendue' && rendue !== uri ? 'origine' : 'repli';
            if (__DEV__ && suivant === 'origine') console.info(`[visuels] rendu en echec, origine rejouee : ${uri}`);
            return { uri, temps: suivant };
        });
    }, [rendue, uri]);

    const onLoad = useCallback((evenement: ImageLoadEventData) => {
        // `none` = le reseau ; `disk` et `memory` = le cache. C'est ce que le protocole du jalon 7-C lit
        // dans Metro : un retour sur l'onglet Campus ne doit plus rien redemander.
        if (__DEV__) console.info(`[visuels] ${evenement.cacheType} ${evenement.source.url}`);
    }, []);

    if (absente || temps === 'repli') return { source: null, onError, onLoad };
    return { source: { uri: temps === 'rendue' && rendue !== null ? rendue : (uri as string) }, onError, onLoad };
}

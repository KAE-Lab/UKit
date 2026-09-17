/**
 * La visionneuse plein ecran : un visuel se lit de pres — une affiche d'annonce aujourd'hui, une
 * carte de restaurant demain.
 *
 * Facade au-dessus de `react-native-image-viewing` (pur JS : pincer pour zoomer, balayer pour
 * fermer, sur les deux plateformes — un zoom maison via ScrollView n'aurait servi qu'iOS). Les
 * ecrans parlent a cette facade, pas a la bibliotheque : la remplacer un jour ne rouvrira pas
 * chaque surface. Un seul etat porte tout : `index` designe l'image ouverte, `null` ferme.
 *
 * Elle recoit des adresses d'origine et affiche leur **rendu** plein ecran (visuels/rendu.ts) : le
 * plus grand palier utile, une qualite plus haute — une affiche se lit de pres. Elle affiche par le
 * `Image` de React Native, donc hors du cache disque d'`expo-image` : une descente par ouverture,
 * limite ecrite au jalon 7-C ; une visionneuse maison est un sujet de la 6.3.
 */

import React from 'react';
import ImageView from 'react-native-image-viewing';

import { urlDeRendu } from '../visuels/rendu';

const RENDU_PLEIN_ECRAN = { largeur: 1600, qualite: 85 } as const;

export interface VisionneuseImagesProps {
    urls: readonly string[];
    /** L'index de l'image ouverte dans `urls` — `null` : visionneuse fermee. */
    index: number | null;
    fermer: () => void;
}

export function VisionneuseImages({ urls, index, fermer }: VisionneuseImagesProps) {
    return (
        <ImageView
            images={urls.map((uri) => ({ uri: urlDeRendu(uri, RENDU_PLEIN_ECRAN) }))}
            imageIndex={index ?? 0}
            visible={index !== null}
            onRequestClose={fermer}
        />
    );
}

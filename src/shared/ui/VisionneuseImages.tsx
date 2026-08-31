/**
 * La visionneuse plein ecran : un visuel se lit de pres — une affiche d'annonce aujourd'hui, une
 * carte de restaurant demain.
 *
 * Facade au-dessus de `react-native-image-viewing` (pur JS : pincer pour zoomer, balayer pour
 * fermer, sur les deux plateformes — un zoom maison via ScrollView n'aurait servi qu'iOS). Les
 * ecrans parlent a cette facade, pas a la bibliotheque : la remplacer un jour ne rouvrira pas
 * chaque surface. Un seul etat porte tout : `index` designe l'image ouverte, `null` ferme.
 */

import React from 'react';
import ImageView from 'react-native-image-viewing';

export interface VisionneuseImagesProps {
    urls: readonly string[];
    /** L'index de l'image ouverte dans `urls` — `null` : visionneuse fermee. */
    index: number | null;
    fermer: () => void;
}

export function VisionneuseImages({ urls, index, fermer }: VisionneuseImagesProps) {
    return (
        <ImageView
            images={urls.map((uri) => ({ uri }))}
            imageIndex={index ?? 0}
            visible={index !== null}
            onRequestClose={fermer}
        />
    );
}

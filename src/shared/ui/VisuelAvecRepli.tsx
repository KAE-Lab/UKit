/**
 * Une image distante avec son visuel de repli — le repli **a la place** de l'image, jamais dessous
 * ni avant elle.
 *
 * Les cartes Campus empilaient le repli sous l'image distante, en permanence : « une carte sans
 * visuel resterait un rectangle gris ». Juste, mais sur Android l'opacite d'appui d'une carte
 * (`TouchableOpacity`) s'applique vue par vue, la ou iOS compose le groupe entier : pendant l'appui,
 * l'image devenait translucide et le repli transparaissait — un flash du visuel par defaut sous le
 * doigt, signale sur le Galaxy A8 le 2026-09-13. Ici le repli ne parait que si l'image manque ou
 * echoue : une seule couche, rien a transparaitre. **Pendant le chargement, rien** — le gris du
 * conteneur, comme toute section : un repli en attente faisait le meme flash a l'arrivee de l'image
 * (decision du proprietaire du produit, le meme jour).
 *
 * Le gain vaut aussi pour les cartes qui n'avaient **pas** de repli en cas d'echec (BU, salles) :
 * une adresse morte y montrait un rectangle gris.
 *
 * Depuis 7-C, l'image est celle d'`expo-image` : un **cache disque**, que le `Image` de React Native
 * n'a pas — chaque ouverture de l'onglet Campus redemandait chaque visuel —, une transition de la
 * duree du fondu partage, et une adresse de **rendu** aux dimensions de la carte plutot que le
 * fichier d'origine (useSourceRendue). Le repli local passe par le meme composant, sans transition :
 * un seul `contentFit` pour les deux, et rien ne transparait.
 */

import React from 'react';
import { Image, type ImageContentFit, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

import { DUREE_FONDU_MS } from './ApparitionEnFondu';
import { useSourceRendue } from './useSourceRendue';

export interface VisuelAvecRepliProps {
    /** L'adresse de l'image ; absente, le repli seul. */
    uri?: string | null;
    /** Le visuel de repli, une ressource locale (`require`). */
    repli: number;
    /** Le meme style pour l'image et son repli : ils occupent la meme place. */
    style: StyleProp<ImageStyle>;
    /** Par defaut `cover` — l'ancien `resizeMode` du style, qu'`expo-image` ne lit plus. */
    contentFit?: ImageContentFit;
    /** La largeur affichee, en points : la largeur demandee au rendu en decoule (visuels/rendu.ts). */
    largeur: number;
    /** La qualite demandee au rendu ; 70 pour une carte. */
    qualite?: number;
}

export function VisuelAvecRepli({ uri, repli, style, contentFit = 'cover', largeur, qualite = 70 }: VisuelAvecRepliProps) {
    const { source, onError, onLoad } = useSourceRendue(uri, { largeur, qualite });

    if (source === null) return <Image source={repli} style={style} contentFit={contentFit} />;
    return (
        <Image
            source={source}
            style={style}
            contentFit={contentFit}
            cachePolicy="memory-disk"
            transition={DUREE_FONDU_MS}
            recyclingKey={uri ?? null}
            onLoad={onLoad}
            onError={onError}
        />
    );
}

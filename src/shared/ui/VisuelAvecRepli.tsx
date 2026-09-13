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
 */

import React, { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';

export interface VisuelAvecRepliProps {
    /** L'adresse de l'image ; absente, le repli seul. */
    uri?: string | null;
    repli: ImageSourcePropType;
    /** Le meme style pour l'image et son repli : ils occupent la meme place. */
    style: StyleProp<ImageStyle>;
}

export function VisuelAvecRepli({ uri, repli, style }: VisuelAvecRepliProps) {
    const [echec, setEchec] = useState(false);

    // Une autre adresse repart de zero : un echec ne vaut que pour l'adresse qui l'a produit.
    useEffect(() => { setEchec(false); }, [uri]);

    if (!uri || echec) return <Image source={repli} style={style} />;
    return <Image source={{ uri }} style={style} onError={() => setEchec(true)} />;
}

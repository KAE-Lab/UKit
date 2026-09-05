/**
 * **Un chargement bref ne montre rien.**
 *
 * La regle vient d'un retour d'appareil du 2026-09-04, en verifiant le jalon 6.1-E : passer d'un jour
 * a l'autre dans le Planning fait un aller-retour de quelques dizaines de millisecondes, et
 * l'indicateur y apparaissait puis disparaissait aussitot. Ce clignotement se lit **moins bien que
 * rien** — l'oeil enregistre un accroc la ou il aurait percu une transition instantanee.
 *
 * C'est une convention connue, et son fondement est mesure : en deca d'environ un dixieme de seconde
 * une reponse est percue comme **instantanee**, et jusqu'a une seconde l'attention reste sur la
 * tache sans qu'un retour soit necessaire. Un indicateur n'a donc rien a dire avant ce seuil ; il n'a
 * de sens que lorsque l'attente devient perceptible.
 *
 * ## Le seuil, et pourquoi celui-la
 *
 * 300 ms. En dessous, la bascule paraît immediate et l'indicateur ne ferait qu'ajouter du bruit ;
 * au-dessus, l'ecran resterait muet assez longtemps pour qu'on se demande s'il a compris le geste.
 * C'est **une** constante, ici, et elle se regle en une ligne si l'appareil dit autre chose.
 *
 * ## Ce qu'on ne fait PAS : garder l'indicateur un temps minimum
 *
 * L'autre moitie de cette convention existe — une fois montre, on garde l'indicateur quelques
 * centaines de millisecondes pour qu'il ne clignote pas non plus a la sortie — et elle est
 * **volontairement ecartee ici** : elle retarde l'arrivee du contenu, c'est-a-dire qu'elle rend
 * l'application plus lente pour qu'elle en ait l'air moins. Le jalon [6.1-D] a passe une campagne
 * entiere a retirer des secondes d'attente ; en rajouter par confort serait contradictoire.
 *
 * Le clignotement de sortie est traite autrement, et sans rien ralentir : l'indicateur **apparait en
 * fondu** ([`ApparitionEnFondu`](ApparitionEnFondu.tsx)). S'il n'a vecu que cinquante millisecondes,
 * il n'aura jamais atteint sa pleine opacite — on percoit une nuance, pas un accroc.
 */

import { useEffect, useState } from 'react';

/** Ce qu'une attente doit durer avant de meriter un indicateur. */
export const DELAI_AVANT_INDICATEUR_MS = 300;

/**
 * `false` pendant les premieres millisecondes d'attente, `true` ensuite.
 *
 * Le minuteur est arme au montage et nettoye au demontage : un chargement plus court que le seuil ne
 * laisse derriere lui ni indicateur ni `setState` sur un composant demonte.
 */
export function useIndicateurRetarde(): boolean {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const minuteur = setTimeout(() => setVisible(true), DELAI_AVANT_INDICATEUR_MS);
        return () => clearTimeout(minuteur);
    }, []);

    return visible;
}

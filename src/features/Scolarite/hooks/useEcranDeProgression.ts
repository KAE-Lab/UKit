/**
 * Faut-il montrer l'ecran d'attente du parcours froid — et **jusqu'a quand** ?
 *
 * La question n'est pas seulement « le run tourne-t-il ». Sans delai de grace, l'ecran disparaissait
 * a la milliseconde ou la session s'achevait : la barre restait a 80 %, la page se substituait d'un
 * coup, et la transition se lisait comme une coupure. Ce qui manquait n'est pas une animation de plus
 * mais **le temps de la jouer** — une barre ne peut pas finir si on la demonte avant sa fin.
 *
 * Le hook garde donc l'ecran quelques centaines de millisecondes apres la fin du run. C'est court, ca
 * ne retarde rien de perceptible, et ca laisse la barre rejoindre 100 % avant de ceder la place.
 *
 * Il vit ici plutot que dans un ecran parce que **deux** ecrans le posent — le tableau de bord et la
 * fiche du compte — et qu'un delai recopie a deux endroits diverge.
 */

import { useEffect, useRef, useState } from 'react';

/** Le temps laisse a la barre pour rejoindre 100 %. Cale sur la duree de son animation de fin. */
const GRACE_MS = 520;

export interface EtatProgression {
    /** Montrer l'ecran d'attente. */
    readonly visible: boolean;
    /** Le run est fini : la barre peut viser 100 %. */
    readonly terminee: boolean;
}

export function useEcranDeProgression(
    sessionMode: string | null | undefined,
    scrapeStatus: string | null | undefined,
): EtatProgression {
    const enCours = sessionMode === 'cold'
        && (scrapeStatus === 'connecting' || scrapeStatus === 'scraping');

    const [visible, setVisible] = useState(enCours);
    const tournaitAvant = useRef(enCours);

    useEffect(() => {
        if (enCours) {
            tournaitAvant.current = true;
            setVisible(true);
            return;
        }
        // Rien a prolonger si l'ecran n'etait pas deja la : un run qui n'a jamais demarre ne doit pas
        // faire clignoter une barre.
        if (!tournaitAvant.current) return;

        tournaitAvant.current = false;
        const minuteur = setTimeout(() => setVisible(false), GRACE_MS);
        return () => clearTimeout(minuteur);
    }, [enCours]);

    return { visible, terminee: visible && !enCours };
}

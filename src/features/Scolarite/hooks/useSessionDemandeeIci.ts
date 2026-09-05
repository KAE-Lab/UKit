/**
 * Une session lancee **par un geste fait sur cet ecran-ci** y laisse la page jusqu'a son terme.
 *
 * `LOGIN_SUCCESS` est emis au dixieme step sur vingt : les identifiants sont poses des que le CAS
 * accepte, donc `credentials` cesse d'etre nul **en plein run**. Un ecran qui aiguille sur
 * `credentials` bascule alors a mi-parcours — le formulaire et sa barre cedent la place a l'ecran de
 * chargement plein, deux vues pour le meme run. Corrige sur la fiche du compte le 2026-08-31, puis
 * constate sur le tableau de bord le soir de la sortie de la 6.0 : la garde n'avait ete posee que sur
 * l'un des deux hotes (docs/features/scolarite.md).
 *
 * ## Pourquoi ce hook ne s'appelle plus « depuis le formulaire »
 *
 * Il ne connaissait qu'une origine, celle du formulaire, et **c'etait le drapeau trop etroit** : le
 * 2026-09-04, un parcours froid dont le dossier echoue apres l'ecriture des identifiants laisse la
 * page sur son encart d'echec ; toucher « Reessayer » **dans l'encart** relance un parcours froid que
 * rien n'avait annonce, `coldData` vaut toujours `null`, et l'ecran plein reprenait la main — la page
 * changeait sous le doigt de quelqu'un en train de reparer quelque chose
 * (docs/defauts-fonctionnels.md). La regle voulue n'a jamais ete « la session vient du formulaire »
 * mais **« la session vient d'un geste de l'utilisateur sur cet ecran »** ; le formulaire n'en est
 * qu'une origine parmi deux.
 *
 * Les deux origines ne se confondent pas, et c'est pour ca qu'on les nomme au lieu d'un booleen :
 *
 *   - **`formulaire`** : la page doit rester le formulaire, qui porte sa propre barre et ou l'echec
 *     doit s'afficher, la ou la saisie a eu lieu ;
 *   - **`page`** : la page doit rester ce qu'elle est — le tableau de bord et son encart, ou la fiche
 *     du compte — la progression s'y posant en encart.
 *
 * **Le geste s'annonce dans le `onPress`, jamais dans la fonction de relance.** Un parcours froid
 * repart aussi tout seul, au retour au premier plan apres une annulation (`useCycleDeVieSession`) :
 * armer le drapeau dans `retrySession` ferait tenir la page a une session que personne n'a demandee,
 * et l'ecran plein — qui est le bon rendu dans ce cas — n'apparaitrait plus jamais.
 *
 * **L'effet ne depend que de la transition de `progressionVisible`**, et c'est ce qui le rend juste :
 * le geste est annonce *avant* que la session soit visible (le moteur se libere, puis le run
 * demarre). Un effet rejoue a chaque rendu remettrait le drapeau a zero avant que la barre
 * n'apparaisse.
 *
 * Deux hotes, le tableau de bord et la fiche du compte : une garde recopiee a deux endroits diverge,
 * et c'est exactement ce qui est arrive. Meme raison d'etre que `useEcranDeProgression`.
 */

import { useCallback, useEffect, useState } from 'react';

/** D'ou vient la session en cours : de quel geste, sur quelle surface de l'ecran. */
export type OrigineDuGeste = 'formulaire' | 'page';

export interface SessionDemandeeIci {
    /** L'origine du geste qui a lance la session en cours, ou `null` si personne ne l'a demandee ici. */
    readonly origine: OrigineDuGeste | null;
    /** A brancher sur `onDebut` de `ScolariteLoginView`. */
    readonly depuisLeFormulaire: () => void;
    /** A brancher sur le `onPress` d'un geste de la page — « Reessayer » de l'encart d'echec. */
    readonly depuisLaPage: () => void;
}

export function useSessionDemandeeIci(progressionVisible: boolean): SessionDemandeeIci {
    const [origine, setOrigine] = useState<OrigineDuGeste | null>(null);

    useEffect(() => {
        if (!progressionVisible) setOrigine(null);
    }, [progressionVisible]);

    const depuisLeFormulaire = useCallback(() => setOrigine('formulaire'), []);
    const depuisLaPage = useCallback(() => setOrigine('page'), []);

    return { origine, depuisLeFormulaire, depuisLaPage };
}

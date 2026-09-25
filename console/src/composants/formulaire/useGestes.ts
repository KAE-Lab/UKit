/**
 * Les gestes hors ecriture d'une ligne existante : la supprimer — ou le geste qui le remplace, revoquer
 * un membre de l'equipe (7-H) —, et les actions du descripteur. Ils agissent sur la ligne que le
 * formulaire a chargee, pas sur la saisie a l'ecran, et rendent ce qui en resulte : une phrase, une ligne
 * a suivre, un secret a montrer une seule fois.
 */

import { messageDErreur } from '../../lib/erreurs';
import type { ActionDeLigne, CompteQuiAgit, Descripteur, ResultatDAction, Secret } from '../../schema/descripteurs';
import type { Ligne } from '../../supabase';
import type { Question } from '../ui/Confirmation';
import type { RetourDeGeste } from '../ui/Encart';

export interface Gestes {
    readonly descripteur: Descripteur;
    /** La ligne que le formulaire a chargee — ou celle qu'un geste lui a fait suivre. */
    readonly reference: Ligne | null;
    readonly compte: CompteQuiAgit;
    readonly suppression: { readonly mutateAsync: (ligne: Ligne) => Promise<string | null> };
    readonly action: { readonly mutateAsync: (v: { readonly action: ActionDeLigne; readonly ligne: Ligne; readonly compte: CompteQuiAgit }) => Promise<string | ResultatDAction> };
    readonly demander: (question: Question) => Promise<boolean>;
    readonly setRetour: (retour: RetourDeGeste | null) => void;
    readonly setActionEnCours: (libelle: string | null) => void;
    readonly montrerSecret: (secret: Secret) => void;
    readonly onSupprime: () => void;
    readonly onLigneAgie: (ligne: Ligne, retour: RetourDeGeste) => void;
}

function questionDuRetrait(descripteur: Descripteur): Question {
    const retrait = descripteur.retrait;
    if (retrait === undefined) {
        return { titre: 'Supprimer cette ligne ?', texte: 'Le journal en gardera la trace, mais l’application ne la verra plus.', confirmer: 'Supprimer', destructif: true };
    }
    return { titre: `${retrait.libelle} ?`, texte: retrait.confirmation, confirmer: retrait.libelle, destructif: true };
}

export function useGestes({ descripteur, reference, compte, suppression, action, demander, setRetour, setActionEnCours, montrerSecret, onSupprime, onLigneAgie }: Gestes) {
    const supprimer = async () => {
        if (reference === null) return;
        if (!await demander(questionDuRetrait(descripteur))) return;
        try {
            await suppression.mutateAsync(reference);
            onSupprime();
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        }
    };

    const agir = async (geste: ActionDeLigne) => {
        if (reference === null) return;
        if (geste.confirmation !== undefined && !await demander({ titre: geste.libelle, texte: geste.confirmation, confirmer: geste.libelle })) return;
        setActionEnCours(geste.libelle);
        setRetour(null);
        try {
            const resultat = await action.mutateAsync({ action: geste, ligne: reference, compte });
            if (typeof resultat === 'string') { setRetour({ ton: 'ok', texte: resultat }); return; }
            const confirmation: RetourDeGeste = { ton: resultat.ton ?? 'ok', texte: resultat.texte };
            setRetour(confirmation);
            if (resultat.secret !== undefined) montrerSecret(resultat.secret);
            if (resultat.ligne !== undefined) onLigneAgie(resultat.ligne, confirmation);
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        } finally {
            setActionEnCours(null);
        }
    };

    return { supprimer, agir };
}

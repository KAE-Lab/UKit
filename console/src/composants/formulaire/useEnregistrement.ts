/**
 * Enregistrer le formulaire : creer ou modifier la ligne — ou la creer par une fonction, quand une
 * insertion ne suffit pas (un membre de l'equipe, 7-H) —, puis dire ce qui est arrive.
 *
 * Sous verrou (7-H), une ligne modifiee entre-temps propose d'etre rechargee. La saisie reste a l'ecran
 * tant qu'on n'accepte pas, pour pouvoir la copier : un nouvel essai d'enregistrer reposerait la meme
 * question, puisque la version lue n'a pas change.
 */

import { ErreurDeConflit, messageDErreur } from '../../lib/erreurs';
import type { Descripteur, ResultatDAction } from '../../schema/descripteurs';
import type { Ligne } from '../../supabase';
import type { Question } from '../ui/Confirmation';
import type { RetourDeGeste } from '../ui/Encart';

export interface Enregistrement {
    readonly descripteur: Descripteur;
    /** La ligne que le formulaire a chargee : le verrou porte sur sa version. `null` pour une ligne neuve. */
    readonly reference: Ligne | null;
    readonly ecriture: { readonly mutateAsync: (v: { readonly valeurs: Ligne; readonly existante: Ligne | null }) => Promise<Ligne> };
    readonly creation: { readonly mutateAsync: (valeurs: Ligne) => Promise<ResultatDAction> };
    readonly demander: (question: Question) => Promise<boolean>;
    /** Le formulaire repart de cette ligne : sa saisie et sa version. */
    readonly suivre: (ligne: Ligne) => void;
    readonly setRetour: (retour: RetourDeGeste | null) => void;
    readonly onEnregistre: (ligne: Ligne, retour: RetourDeGeste) => void;
}

export function useEnregistrement({ descripteur, reference, ecriture, creation, demander, suivre, setRetour, onEnregistre }: Enregistrement) {
    const proposerDeRecharger = async (conflit: ErreurDeConflit) => {
        const recharger = await demander({
            titre: 'Modifiée entre-temps',
            texte: `${conflit.message} Recharger montre la version enregistrée, et ta saisie est perdue : copie-la d’abord si tu veux la garder.`,
            confirmer: 'Recharger',
        });
        if (recharger) {
            suivre(conflit.fraiche as Ligne);
            setRetour({ ton: 'info', texte: 'Rechargée : c’est la version enregistrée qui est à l’écran.' });
            return;
        }
        setRetour({ ton: 'erreur', texte: `${conflit.message} Ta saisie reste à l’écran ; recharge avant d’enregistrer.` });
    };

    const creerParLaFonction = async (valeurs: Ligne) => {
        const resultat = await creation.mutateAsync(valeurs);
        if (resultat.ligne === undefined) { setRetour({ ton: 'ok', texte: resultat.texte }); return; }
        suivre(resultat.ligne);
        onEnregistre(resultat.ligne, { ton: 'ok', texte: resultat.texte, secret: resultat.secret });
    };

    return async (ligne: Ligne) => {
        setRetour(null);
        const complete = descripteur.avantEcriture === undefined ? ligne : descripteur.avantEcriture(ligne, reference);
        const message = descripteur.valider === undefined ? null : descripteur.valider(complete);
        if (message !== null) { setRetour({ ton: 'erreur', texte: message }); return; }
        try {
            if (reference === null && descripteur.creer !== undefined) { await creerParLaFonction(complete); return; }
            const ecrite = await ecriture.mutateAsync({ valeurs: complete, existante: reference });
            suivre(ecrite);
            const confirmation: RetourDeGeste = { ton: 'ok', texte: 'Enregistré.' };
            setRetour(confirmation);
            onEnregistre(ecrite, confirmation);
        } catch (echec) {
            if (echec instanceof ErreurDeConflit) { await proposerDeRecharger(echec); return; }
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        }
    };
}

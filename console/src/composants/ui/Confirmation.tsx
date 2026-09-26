/**
 * Une confirmation, en dialogue accessible (Base UI AlertDialog) : elle remplace `window.confirm`
 * pour supprimer une ligne, notifier un message, quitter un formulaire modifie.
 *
 * `useConfirmation` rend une fonction qui pose la question et une promesse qui dit la reponse ; le
 * composant se monte une fois par page.
 *
 * La question affichee survit a la reponse : le dialogue s'efface en fondu, et il se vidait pendant
 * ce temps — un cadre sans titre, un bouton « Confirmer » — le temps de l'animation.
 */

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useCallback, useState, type ReactNode } from 'react';

import { Bouton } from './Bouton';

export interface Question {
    readonly titre: string;
    readonly texte: string;
    readonly confirmer?: string;
    readonly destructif?: boolean;
}

interface EnAttente {
    readonly question: Question;
    readonly repondre: (oui: boolean) => void;
}

export function useConfirmation(): { readonly demander: (question: Question) => Promise<boolean>; readonly dialogue: ReactNode } {
    const [attente, setAttente] = useState<EnAttente | null>(null);
    const [affichee, setAffichee] = useState<Question | null>(null);

    const demander = useCallback((question: Question) => new Promise<boolean>((repondre) => {
        setAffichee(question);
        setAttente({ question, repondre: (oui) => { setAttente(null); repondre(oui); } });
    }), []);

    const dialogue = (
        <AlertDialog.Root open={attente !== null} onOpenChange={(ouvert) => { if (!ouvert) attente?.repondre(false); }}>
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="voile" />
                <AlertDialog.Popup className="dialogue">
                    <AlertDialog.Title render={<h2 />}>{affichee?.titre}</AlertDialog.Title>
                    <AlertDialog.Description render={<p className="description" />}>{affichee?.texte}</AlertDialog.Description>
                    <div className="boutons fin">
                        <Bouton variante="discret" onClick={() => attente?.repondre(false)}>Annuler</Bouton>
                        <Bouton variante={affichee?.destructif === true ? 'destructif' : 'plein'} onClick={() => attente?.repondre(true)} autoFocus>
                            {affichee?.confirmer ?? 'Confirmer'}
                        </Bouton>
                    </div>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );

    return { demander, dialogue };
}

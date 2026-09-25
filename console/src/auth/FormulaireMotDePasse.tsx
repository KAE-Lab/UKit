/**
 * Choisir un mot de passe, deux fois : la page Compte, et la premiere connexion d'un compte invite
 * (PremiereConnexion.tsx). La longueur minimale est aussi celle de la base depuis 7-H : la console le
 * dit, l'authentification le refuse.
 */

import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Bouton } from '../composants/ui/Bouton';
import { PlaceDEncart, type RetourDeGeste } from '../composants/ui/Encart';

export const LONGUEUR_MINIMALE = 12;

export interface FormulaireMotDePasseProps {
    readonly titre: string;
    readonly bouton: string;
    /** Pose le mot de passe ; rend l'erreur a dire, ou `null` quand c'est fait. */
    readonly poser: (motDePasse: string) => Promise<string | null>;
    /** La phrase d'un succes ; sans elle, le formulaire se tait — la page qui le porte va changer. */
    readonly succes?: string;
}

export function FormulaireMotDePasse({ titre, bouton, poser, succes }: FormulaireMotDePasseProps) {
    const [motDePasse, setMotDePasse] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [retour, setRetour] = useState<RetourDeGeste | null>(null);
    const [enCours, setEnCours] = useState(false);

    const changer = async (evenement: FormEvent) => {
        evenement.preventDefault();
        if (motDePasse !== confirmation) {
            setRetour({ ton: 'erreur', texte: 'Les deux saisies ne correspondent pas.' });
            return;
        }
        setEnCours(true);
        setRetour(null);
        const erreur = await poser(motDePasse);
        setEnCours(false);
        if (erreur !== null) {
            setRetour({ ton: 'erreur', texte: `Mot de passe non changé : ${erreur}` });
            return;
        }
        setMotDePasse('');
        setConfirmation('');
        if (succes !== undefined) setRetour({ ton: 'ok', texte: succes });
    };

    return (
        <form className="carte formulaire" onSubmit={(evenement) => { void changer(evenement); }}>
            <h2>{titre}</h2>
            <div className="deux-colonnes">
                <div className="champ">
                    <label htmlFor="nouveau">Nouveau mot de passe</label>
                    <input id="nouveau" type="password" autoComplete="new-password" minLength={LONGUEUR_MINIMALE} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
                    <span className="aide">Douze caractères au moins. Un mot de passe connu des fuites de données est refusé.</span>
                </div>
                <div className="champ">
                    <label htmlFor="confirmation">Encore une fois</label>
                    <input id="confirmation" type="password" autoComplete="new-password" minLength={LONGUEUR_MINIMALE} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
                </div>
            </div>
            <PlaceDEncart retour={retour} />
            <div className="boutons"><Bouton variante="plein" type="submit" enAttente={enCours} icone={<KeyRound className="icone" aria-hidden="true" />}>{bouton}</Bouton></div>
        </form>
    );
}

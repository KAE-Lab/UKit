/**
 * La page du compte : qui est connecte, ses droits, changer son mot de passe, se deconnecter.
 */

import { KeyRound, LogOut } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Bouton } from '../composants/ui/Bouton';
import { Encart, PlaceDEncart, type RetourDeGeste } from '../composants/ui/Encart';
import { SqueletteTexte } from '../composants/ui/Squelette';
import { supabase } from '../supabase';
import type { Session } from './session';
import { seDeconnecter } from './useSession';

export function Compte({ session }: { readonly session: Session }) {
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
        const { error } = await supabase.auth.updateUser({ password: motDePasse });
        setEnCours(false);
        if (error !== null) {
            setRetour({ ton: 'erreur', texte: `Mot de passe non changé : ${error.message}` });
            return;
        }
        setMotDePasse('');
        setConfirmation('');
        setRetour({ ton: 'ok', texte: 'Mot de passe changé.' });
    };

    return (
        <>
            <div className="entete-page"><div><h1>Compte</h1><p className="sous-titre">Qui est connecté, et ce qu’il a le droit de faire.</p></div></div>
            <div className="carte">
                <h2>{session.email}</h2>
                <div className="place-encart">
                    {session.editeur === null ? <SqueletteTexte largeur="50%" /> : null}
                    {session.editeur === true ? <Encart ton="ok">Ce compte est éditeur : il peut écrire dans les tables publiables, et chaque écriture est journalisée.</Encart> : null}
                    {session.editeur === false ? <Encart ton="erreur">Ce compte n’est pas dans la table des éditeurs : il peut lire ce que la console montre, et chaque écriture lui sera refusée.</Encart> : null}
                </div>
                <div className="boutons">
                    <Bouton variante="tonal" onClick={() => { void seDeconnecter(); }} icone={<LogOut className="icone" aria-hidden="true" />}>Se déconnecter</Bouton>
                </div>
            </div>
            <form className="carte formulaire" onSubmit={(evenement) => { void changer(evenement); }}>
                <h2>Changer le mot de passe</h2>
                <div className="deux-colonnes">
                    <div className="champ">
                        <label htmlFor="nouveau">Nouveau mot de passe</label>
                        <input id="nouveau" type="password" autoComplete="new-password" minLength={12} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
                        <span className="aide">Douze caractères au moins.</span>
                    </div>
                    <div className="champ">
                        <label htmlFor="confirmation">Encore une fois</label>
                        <input id="confirmation" type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
                    </div>
                </div>
                <PlaceDEncart retour={retour} />
                <div className="boutons"><Bouton variante="plein" type="submit" enAttente={enCours} icone={<KeyRound className="icone" aria-hidden="true" />}>Changer</Bouton></div>
            </form>
        </>
    );
}

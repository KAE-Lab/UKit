/**
 * La page du compte : qui est connecte, ses droits, changer son mot de passe, se deconnecter.
 */

import { useState, type FormEvent } from 'react';

import { supabase } from '../supabase';
import { Bouton } from '../composants/Bouton';
import { Retour } from '../composants/Retour';
import { seDeconnecter, type Session } from './useSession';

export function Compte({ session }: { readonly session: Session }) {
    const [motDePasse, setMotDePasse] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [retour, setRetour] = useState<{ ton: 'ok' | 'erreur'; texte: string } | null>(null);

    const changer = async (evenement: FormEvent) => {
        evenement.preventDefault();
        if (motDePasse !== confirmation) {
            setRetour({ ton: 'erreur', texte: 'Les deux saisies ne correspondent pas.' });
            return;
        }
        const { error } = await supabase.auth.updateUser({ password: motDePasse });
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
            <div className="entete-page"><h1>Compte</h1></div>
            <div className="carte">
                <h2>{session.email}</h2>
                {session.editeur === null ? <p className="secondaire">Vérification des droits…</p> : null}
                {session.editeur === true ? <Retour ton="ok">Ce compte est éditeur : il peut écrire dans les tables publiables, et chaque écriture est journalisée.</Retour> : null}
                {session.editeur === false ? <Retour ton="erreur">Ce compte n’est pas dans la table des éditeurs : il peut lire ce que la console montre, et chaque écriture lui sera refusée.</Retour> : null}
                <div className="boutons">
                    <Bouton variante="tonal" onClick={() => { void seDeconnecter(); }}>Se déconnecter</Bouton>
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
                {retour !== null ? <Retour ton={retour.ton}>{retour.texte}</Retour> : null}
                <div className="boutons"><Bouton variante="plein" type="submit">Changer</Bouton></div>
            </form>
        </>
    );
}

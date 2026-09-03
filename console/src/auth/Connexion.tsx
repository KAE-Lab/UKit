/**
 * La page de connexion : e-mail et mot de passe, rien d'autre.
 *
 * Pas d'inscription — elle est desactivee dans le projet — et pas de « mot de passe oublie » : la
 * console n'envoie aucun courriel. Le compte se cree et se repare depuis le poste du publieur
 * (supabase/README.md), et la page le dit.
 */

import { useState, type FormEvent } from 'react';

import { supabase } from '../supabase';
import { Bouton } from '../composants/Bouton';
import { Retour } from '../composants/Retour';

export function Connexion() {
    const [email, setEmail] = useState('');
    const [motDePasse, setMotDePasse] = useState('');
    const [erreur, setErreur] = useState<string | null>(null);
    const [enCours, setEnCours] = useState(false);

    const soumettre = async (evenement: FormEvent) => {
        evenement.preventDefault();
        setEnCours(true);
        setErreur(null);
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
        setEnCours(false);
        if (error !== null) setErreur('Connexion refusée : vérifie l’e-mail et le mot de passe.');
    };

    return (
        <div className="connexion">
            <form className="carte formulaire" onSubmit={(evenement) => { void soumettre(evenement); }}>
                <div>
                    <h1>Console UKit</h1>
                    <p className="secondaire">Publier sans requête SQL, avec un compte, en laissant une trace.</p>
                </div>
                <div className="champ">
                    <label htmlFor="email">E-mail</label>
                    <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="champ">
                    <label htmlFor="mdp">Mot de passe</label>
                    <input id="mdp" type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
                </div>
                {erreur !== null ? <Retour ton="erreur">{erreur}</Retour> : null}
                <Bouton variante="plein" type="submit" disabled={enCours}>{enCours ? 'Connexion…' : 'Se connecter'}</Bouton>
                <p className="secondaire petit">
                    Pas d’inscription ici, et pas de mot de passe oublié : le compte se crée et se remplace depuis
                    le poste du publieur (<code>npm run console:editeur</code>).
                </p>
            </form>
        </div>
    );
}

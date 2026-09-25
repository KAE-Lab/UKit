/**
 * La page de connexion : e-mail et mot de passe, rien d'autre.
 *
 * Pas d'inscription — elle est desactivee dans le projet — et pas de « mot de passe oublie » : la
 * console n'envoie aucun courriel tant que le projet n'a pas de serveur d'envoi a lui. Un compte se cree
 * sur invitation d'un admin, qui remplace aussi un mot de passe oublie (page Equipe, jalon 7-H), et la
 * page le dit.
 */

import { LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Bouton } from '../composants/ui/Bouton';
import { PlaceDEncart, type RetourDeGeste } from '../composants/ui/Encart';
import { supabase } from '../supabase';

export function Connexion() {
    const [email, setEmail] = useState('');
    const [motDePasse, setMotDePasse] = useState('');
    const [retour, setRetour] = useState<RetourDeGeste | null>(null);
    const [enCours, setEnCours] = useState(false);

    const soumettre = async (evenement: FormEvent) => {
        evenement.preventDefault();
        setEnCours(true);
        setRetour(null);
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
        setEnCours(false);
        if (error !== null) setRetour({ ton: 'erreur', texte: 'Connexion refusée : vérifie l’e-mail et le mot de passe.' });
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
                <PlaceDEncart retour={retour} />
                <Bouton variante="plein" type="submit" enAttente={enCours} icone={<LogIn className="icone" aria-hidden="true" />}>Se connecter</Bouton>
                <p className="secondaire petit">
                    Pas d’inscription ici : un compte se crée sur invitation d’un admin de la console. Un mot de passe
                    oublié se remplace aussi par un admin, qui t’en donne un provisoire.
                </p>
            </form>
        </div>
    );
}

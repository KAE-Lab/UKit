/**
 * La premiere connexion d'un compte invite (jalon 7-H) : tant que le mot de passe est provisoire — donne
 * par un admin, transmis de vive voix —, la console ne montre que ceci. Le nouveau mot de passe et la
 * levee du drapeau partent dans la meme ecriture, et la session suit d'elle-meme.
 *
 * Le drapeau vit dans les metadonnees que le compte ecrit lui-meme : qui l'effacerait sans changer de
 * mot de passe ne ferait tort qu'a son propre compte. Il sert a l'hygiene d'un secret dicte, pas a un
 * droit, et les droits restent dans la base (docs/phase-7/7-h-console-roles.md).
 */

import { LogOut } from 'lucide-react';

import { Bouton } from '../composants/ui/Bouton';
import { supabase } from '../supabase';
import { FormulaireMotDePasse } from './FormulaireMotDePasse';
import { seDeconnecter } from './useSession';

async function choisir(motDePasse: string): Promise<string | null> {
    const { error } = await supabase.auth.updateUser({ password: motDePasse, data: { mot_de_passe_provisoire: false } });
    return error === null ? null : error.message;
}

export function PremiereConnexion({ email }: { readonly email: string }) {
    return (
        <div className="connexion">
            <div className="premiere-connexion">
                <div className="carte">
                    <h1>Bienvenue dans la console</h1>
                    <p className="secondaire">
                        Compte <strong>{email}</strong> : le mot de passe provisoire qu’un admin t’a transmis ne sert qu’à
                        cette première connexion. Choisis le tien pour continuer.
                    </p>
                </div>
                <FormulaireMotDePasse titre="Choisir ton mot de passe" bouton="Choisir et continuer" poser={choisir} />
                <div className="boutons">
                    <Bouton variante="discret" onClick={() => { void seDeconnecter(); }} icone={<LogOut className="icone" aria-hidden="true" />}>Se déconnecter</Bouton>
                </div>
            </div>
        </div>
    );
}

/**
 * La page Equipe (jalon 7-H) : la liste generique de `editeurs`, et sur une ligne le formulaire du role
 * et des campus, avec les gestes de la fonction `editeurs` — inviter, nouveau mot de passe provisoire,
 * revoquer. Un admin seul la voit : la base ne laisse lire toute la table qu'a lui, et un autre compte
 * n'y trouverait que sa propre ligne. La page le dit plutot que de montrer une liste trompeuse.
 */

import { estAdmin } from '../auth/droits';
import { useDroits } from '../auth/session';
import { EtatVide } from '../composants/ui/EtatVide';
import { SqueletteBloc } from '../composants/ui/Squelette';
import { EDITEURS } from '../schema/tables';
import { Ressource } from './Ressource';

export function Equipe({ reste }: { readonly reste: string | null }) {
    const droits = useDroits();
    if (droits === undefined) return <div className="carte" aria-busy="true"><SqueletteBloc hauteur={220} /></div>;
    if (!estAdmin(droits)) {
        return <div className="carte"><EtatVide>La page Équipe est réservée aux admins. Pour changer de rôle ou de campus, demande à l’un d’eux.</EtatVide></div>;
    }
    return <Ressource descripteur={EDITEURS} reste={reste} />;
}

/**
 * La bascule d'etablissement, la meme depuis les trois endroits qui la proposent : les Reglages,
 * l'etape d'accueil, et le lien « Tu es d'un autre campus ? » du formulaire de connexion (6.1-A).
 *
 * **Purger d'abord, selectionner ensuite.** L'ordre vient de `changerEtablissement` et il n'est pas
 * negociable — une purge jouee apres la selection courrait contre les ecrans qui se rechargent deja
 * sur le nouvel etablissement. Le `setEtablissement` qui suit persiste le code et notifie les
 * abonnes, ce qui suffit a faire repartir le planning et la session sur la bonne universite.
 *
 * L'adoucissement se pose **entre les deux** : la bascule fait apparaitre ou disparaitre des rangees
 * entieres et des onglets, et rendue d'un coup elle se lisait comme un accroc. `configureNext` ne
 * couvre que le commit suivant, et n'importe quel commit pendant la purge — une modale qui se ferme,
 * un contexte qui vide — le consommait avant la reorganisation qu'il visait (constate sur appareil
 * le 2026-08-31, deux fois).
 *
 * A part de `index.ts`, et non re-exporte par lui : ce module importe `SettingsManager`, que le
 * catalogue n'a aucune raison de connaitre — c'est l'ecran qui bascule, pas la donnee.
 */

import { SettingsManager } from '../services/AppCore';
import { adoucirLaTransition } from '../ui/transitions';
import { changerEtablissement, estDejaActif } from './index';

/** Bascule sur `code`. Rend faux, sans rien faire, quand il est deja l'etablissement actif. */
export async function basculerEtablissement(code: string): Promise<boolean> {
    if (estDejaActif(code)) return false;

    await changerEtablissement(code);
    adoucirLaTransition();
    SettingsManager.setEtablissement(code);
    return true;
}

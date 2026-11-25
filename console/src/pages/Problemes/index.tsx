/**
 * La page Problemes connus (phase 8, lot 3 ; docs/phase-8/3-formulaire.md) : la liste et le formulaire
 * generiques — publier, reformuler, corriger, clore —, et, a cote d'une ligne, ce qu'en disent les
 * etudiants : les « moi aussi », les appareils touches, et les details recus, rangés dessous.
 */

import { CeQuEnDisentLesEtudiants, type SujetSuivi } from '../../composants/communaute/CeQuEnDisentLesEtudiants';
import { PROBLEMES } from '../../schema/tables/problemes';
import { NOUVEAU, Ressource } from '../Ressource';

const SUIVI: SujetSuivi = { sujet: 'probleme.moi_aussi', colonne: 'probleme', appareils: true };

export function Problemes({ reste }: { readonly reste: string | null }) {
    return (
        <Ressource
            descripteur={PROBLEMES}
            reste={reste}
            // Une ligne neuve n'a encore ni « moi aussi » ni details : le formulaire seul, sur toute la largeur.
            apercu={reste === NOUVEAU ? undefined : (valeurs) => (typeof valeurs.id === 'string' ? <CeQuEnDisentLesEtudiants suivi={SUIVI} id={valeurs.id} /> : null)}
        />
    );
}

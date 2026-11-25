/**
 * La page Idees (phase 8, lot 4 ; docs/phase-8/4-sondages-idees-notation.md) : la boite a idees publique.
 * Un admin retient une idee des retours, la reformule et la publie, la passe en cours puis livree dans
 * telle version ; a cote d'une ligne, ses « moi aussi » et les details recus, comme un probleme connu.
 */

import { CeQuEnDisentLesEtudiants, type SujetSuivi } from '../../composants/communaute/CeQuEnDisentLesEtudiants';
import { IDEES } from '../../schema/tables/idees';
import { NOUVEAU, Ressource } from '../Ressource';

const SUIVI: SujetSuivi = { sujet: 'idee.moi_aussi', colonne: 'idee', appareils: false };

export function Idees({ reste }: { readonly reste: string | null }) {
    return (
        <Ressource
            descripteur={IDEES}
            reste={reste}
            apercu={reste === NOUVEAU ? undefined : (valeurs) => (typeof valeurs.id === 'string' ? <CeQuEnDisentLesEtudiants suivi={SUIVI} id={valeurs.id} /> : null)}
        />
    );
}

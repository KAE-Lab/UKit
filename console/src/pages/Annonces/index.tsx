/**
 * La page Annonces (7-F) : la liste generique du descripteur, avec le panneau « Ordre du
 * carrousel » a cote ; et, sur une ligne, l'editeur — le formulaire generique, l'etat de l'annonce
 * sous son titre, et l'apercu du telephone dans son panneau. L'apercu se charge a la demande : il
 * tire la police des icones, que la liste n'a pas a attendre.
 */

import { ArrowRight, ListOrdered } from 'lucide-react';
import { lazy, Suspense } from 'react';

import type { Activite } from '../../composants/formulaire/Formulaire';
import { Pastille } from '../../composants/ui/Pastille';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { lienVers } from '../../routeur';
import { ANNONCES } from '../../schema/tables/annonces';
import type { Ligne } from '../../supabase';
import { Ressource } from '../Ressource';
import { etatDAnnonce } from '../../schema/tables/etatDAnnonce';
import { Ordre } from './Ordre';

const ApercuDiffere = lazy(() => import('./apercu/Apercu').then((module) => ({ default: module.Apercu })));

function apercu(valeurs: Ligne, activite: Activite) {
    return (
        <Suspense fallback={<div aria-busy="true"><SqueletteBloc hauteur={480} /></div>}>
            <ApercuDiffere valeurs={valeurs} activite={activite} />
        </Suspense>
    );
}

/**
 * L'etat de l'annonce — visible, programmee, brouillon… — tel que les telephones le voient, et celui
 * que la saisie donnera quand il differe : « Visible → Brouillon, une fois enregistree ». Une annonce
 * neuve n'est visible de personne avant d'etre enregistree, et le dit. L'audience « testeurs » se dit
 * aussi, tant qu'elle l'est : le geste inverse est juste a cote, dans l'en-tete.
 */
function etatDeLigne(valeurs: Ligne, existante: Ligne | null) {
    const maintenant = new Date();
    const aVenir = etatDAnnonce(valeurs, maintenant);
    const enregistre = existante === null ? null : etatDAnnonce(existante, maintenant);
    const change = enregistre === null || enregistre.etat !== aVenir.etat;
    return (
        <div className="etat-ligne">
            {enregistre !== null && change ? <><Pastille ton={enregistre.ton} point>{enregistre.libelle}</Pastille><ArrowRight className="icone secondaire" aria-label="devient" /></> : null}
            <Pastille ton={aVenir.ton} point>{aVenir.libelle}</Pastille>
            {change ? <span className="petit secondaire">une fois enregistrée</span> : null}
            {valeurs.audience === 'testeurs' ? <Pastille ton="avert">Testeurs seulement</Pastille> : null}
            {aVenir.phrase !== null ? <span className="petit secondaire">{aVenir.phrase}</span> : null}
        </div>
    );
}

export function Annonces({ reste }: { readonly reste: string | null }) {
    if (reste === 'ordre') return <Ordre />;
    return (
        <Ressource
            descripteur={ANNONCES}
            reste={reste}
            boutons={<a className="bouton tonal" href={lienVers('/annonces/ordre')}><span className="contenu-bouton"><ListOrdered className="icone" aria-hidden="true" />Ordre du carrousel</span></a>}
            apercu={apercu}
            etatDeLigne={etatDeLigne}
        />
    );
}

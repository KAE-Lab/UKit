/**
 * La page Annonces (7-F) : la liste generique du descripteur, avec le panneau « Ordre du
 * carrousel » a cote ; et, sur une ligne, l'editeur — le formulaire generique, l'apercu du
 * telephone dans sa colonne de droite, et l'encart qui dit quand l'annonce est en audience
 * « testeurs ». L'apercu se charge a la demande : il tire la police des icones, que la liste n'a
 * pas a attendre.
 */

import { ListOrdered } from 'lucide-react';
import { lazy, Suspense } from 'react';

import { Encart } from '../../composants/ui/Encart';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { lienVers } from '../../routeur';
import { ANNONCES } from '../../schema/tables/annonces';
import type { Ligne } from '../../supabase';
import { Ressource } from '../Ressource';
import { Ordre } from './Ordre';

const ApercuDiffere = lazy(() => import('./apercu/Apercu').then((module) => ({ default: module.Apercu })));

function apercu(valeurs: Ligne) {
    return (
        <Suspense fallback={<div aria-busy="true"><SqueletteBloc hauteur={480} /></div>}>
            <ApercuDiffere valeurs={valeurs} />
        </Suspense>
    );
}

/** En tete d'une ligne enregistree en audience « testeurs » : le geste inverse est dans les boutons du formulaire. */
function enTeteDeLigne(existante: Ligne | null) {
    if (existante === null || existante.audience !== 'testeurs') return null;
    return (
        <div className="carte compacte" style={{ marginBottom: 'var(--espace-md)' }}>
            <Encart ton="info">Cette annonce est en audience « testeurs » : seuls les appareils enregistrés la voient. « Rendre à tout le monde » la publie au parc entier.</Encart>
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
            enTeteDeLigne={enTeteDeLigne}
        />
    );
}

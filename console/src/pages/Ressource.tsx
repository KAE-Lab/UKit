/**
 * La page generique d'une ressource : la liste, ou le formulaire d'une ligne (`/<chemin>/<cle>`)
 * ou d'une ligne neuve (`/<chemin>/nouveau`). L'URL porte l'etat : recharger garde la page, et le
 * retour a la liste garde ses filtres.
 */

import { Plus } from 'lucide-react';

import { useDroits } from '../auth/session';
import { LectureSeule } from '../composants/LectureSeule';
import { Formulaire } from '../composants/formulaire/Formulaire';
import { ListeDeRessource } from '../composants/liste/ListeDeRessource';
import { Bouton } from '../composants/ui/Bouton';
import { Encart } from '../composants/ui/Encart';
import { ErreurDeLecture } from '../composants/ui/ErreurDeLecture';
import { EtatVide } from '../composants/ui/EtatVide';
import { SqueletteBloc, SqueletteTexte } from '../composants/ui/Squelette';
import { useLigne } from '../requetes/useListe';
import { cleDepuisUrl, cleVersUrl, type Descripteur } from '../schema/descripteurs';
import { naviguer, useRoute } from '../routeur';
import type { Ligne } from '../supabase';

export const NOUVEAU = 'nouveau';

/** Le formulaire d'une ligne lue par sa cle : squelette, puis la ligne, ou son absence. */
function LigneExistante({ descripteur, segment, retour, onEnregistre }: { readonly descripteur: Descripteur; readonly segment: string; readonly retour: () => void; readonly onEnregistre: (ligne: Ligne) => void }) {
    const cle = cleDepuisUrl(descripteur, segment);
    const requete = useLigne(descripteur, cle);
    if (cle === null || (requete.isSuccess && requete.data === null)) {
        return <div className="carte"><EtatVide>Cette ligne n’existe pas, ou plus.</EtatVide><div className="boutons" style={{ justifyContent: 'center' }}><Bouton variante="tonal" onClick={retour}>Retour à la liste</Bouton></div></div>;
    }
    if (requete.isError) return <div className="carte"><ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /></div>;
    if (requete.data === undefined || requete.data === null) {
        return <div className="carte formulaire" aria-busy="true"><SqueletteTexte largeur="30%" /><SqueletteBloc hauteur={40} /><SqueletteBloc hauteur={40} /><SqueletteBloc hauteur={120} /><SqueletteBloc hauteur={40} /></div>;
    }
    return <Formulaire key={segment} descripteur={descripteur} existante={requete.data} onEnregistre={onEnregistre} onSupprime={retour} onAnnule={retour} />;
}

export function Ressource({ descripteur, reste }: { readonly descripteur: Descripteur; readonly reste: string | null }) {
    const droits = useDroits();
    const { params } = useRoute();
    const chemin = `/${descripteur.chemin}`;
    const retourALaListe = () => naviguer(chemin, params);
    const apresEcriture = (ligne: Ligne) => naviguer(`${chemin}/${cleVersUrl(descripteur, ligne)}`, params, { remplacer: true });

    return (
        <>
            <div className="entete-page">
                <div>
                    <h1>{descripteur.titre}</h1>
                    <p className="sous-titre">{descripteur.description}</p>
                </div>
                {reste === null && descripteur.creation !== false ? (
                    <Bouton variante="plein" disabled={droits === false} onClick={() => naviguer(`${chemin}/${NOUVEAU}`, params)} icone={<Plus className="icone" aria-hidden="true" />}>Nouvelle ligne</Bouton>
                ) : null}
            </div>
            {descripteur.creation !== false || descripteur.table === 'retours' ? <LectureSeule /> : null}
            {descripteur.avertissement !== undefined ? <div className="carte compacte" style={{ marginBottom: 'var(--espace-md)' }}><Encart ton="avert">{descripteur.avertissement}</Encart></div> : null}
            {reste === null ? (
                <div className="carte"><ListeDeRessource descripteur={descripteur} lienDe={(ligne) => `${chemin}/${cleVersUrl(descripteur, ligne)}${params.size > 0 ? `?${params.toString()}` : ''}`} /></div>
            ) : reste === NOUVEAU ? (
                <Formulaire descripteur={descripteur} existante={null} onEnregistre={apresEcriture} onSupprime={retourALaListe} onAnnule={retourALaListe} />
            ) : (
                <LigneExistante descripteur={descripteur} segment={reste} retour={retourALaListe} onEnregistre={apresEcriture} />
            )}
        </>
    );
}

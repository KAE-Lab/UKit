/**
 * La page generique d'une ressource : la liste, ou le formulaire d'une ligne (`/<chemin>/<cle>`)
 * ou d'une ligne neuve (`/<chemin>/nouveau`). L'URL porte l'etat : recharger garde la page, et le
 * retour a la liste garde ses filtres. Une page qui merite mieux qu'une liste — les annonces — la
 * complete plutot que de la recopier : des boutons en tete, un apercu a cote du formulaire, un
 * encart au-dessus d'une ligne.
 */

import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useDroits } from '../auth/session';
import { LectureSeule } from '../composants/LectureSeule';
import { Formulaire } from '../composants/formulaire/Formulaire';
import { ListeDeRessource } from '../composants/liste/ListeDeRessource';
import { Bouton } from '../composants/ui/Bouton';
import { Encart, type RetourDeGeste } from '../composants/ui/Encart';
import { ErreurDeLecture } from '../composants/ui/ErreurDeLecture';
import { EtatVide } from '../composants/ui/EtatVide';
import { SqueletteBloc, SqueletteTexte } from '../composants/ui/Squelette';
import { useLigne } from '../requetes/useListe';
import { cleDepuisUrl, cleVersUrl, type Descripteur } from '../schema/descripteurs';
import { naviguer, useRoute } from '../routeur';
import type { Ligne } from '../supabase';

export const NOUVEAU = 'nouveau';

export interface ComplementsDePage {
    /** Des boutons de plus dans l'en-tete de la liste. */
    readonly boutons?: ReactNode;
    /** Ce que la ligne en cours de saisie donnera, a cote du formulaire. */
    readonly apercu?: (valeurs: Ligne) => ReactNode;
    /** Un encart au-dessus du formulaire, selon la ligne enregistree (`null` pour une ligne neuve). */
    readonly enTeteDeLigne?: (existante: Ligne | null) => ReactNode;
}

interface LigneExistanteProps extends ComplementsDePage {
    readonly descripteur: Descripteur;
    readonly segment: string;
    readonly retour: () => void;
    readonly onEnregistre: (ligne: Ligne, retour: RetourDeGeste) => void;
    readonly retourInitial: RetourDeGeste | null;
}

/** Le formulaire d'une ligne lue par sa cle : squelette, puis la ligne, ou son absence. */
function LigneExistante({ descripteur, segment, retour, onEnregistre, retourInitial, apercu, enTeteDeLigne }: LigneExistanteProps) {
    const cle = cleDepuisUrl(descripteur, segment);
    const requete = useLigne(descripteur, cle);
    if (cle === null || (requete.isSuccess && requete.data === null)) {
        return <div className="carte"><EtatVide>Cette ligne n’existe pas, ou plus.</EtatVide><div className="boutons" style={{ justifyContent: 'center' }}><Bouton variante="tonal" onClick={retour}>Retour à la liste</Bouton></div></div>;
    }
    if (requete.isError) return <div className="carte"><ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /></div>;
    if (requete.data === undefined || requete.data === null) {
        return <div className="carte formulaire" aria-busy="true"><SqueletteTexte largeur="30%" /><SqueletteBloc hauteur={40} /><SqueletteBloc hauteur={40} /><SqueletteBloc hauteur={120} /><SqueletteBloc hauteur={40} /></div>;
    }
    return (
        <>
            {enTeteDeLigne?.(requete.data)}
            <Formulaire key={segment} descripteur={descripteur} existante={requete.data} apercu={apercu} retourInitial={retourInitial} onEnregistre={onEnregistre} onSupprime={retour} onAnnule={retour} />
        </>
    );
}

export interface RessourceProps extends ComplementsDePage {
    readonly descripteur: Descripteur;
    readonly reste: string | null;
}

export function Ressource({ descripteur, reste, boutons, apercu, enTeteDeLigne }: RessourceProps) {
    const droits = useDroits();
    const { params } = useRoute();
    const chemin = `/${descripteur.chemin}`;
    const retourALaListe = () => naviguer(chemin, params);
    // Une ecriture qui change l'adresse — une ligne neuve, une copie — remonte le formulaire : la
    // phrase du geste voyage avec la navigation, et ne vaut que pour l'adresse qui vient d'etre ouverte.
    const [retourDeNavigation, setRetourDeNavigation] = useState<{ readonly segment: string; readonly retour: RetourDeGeste } | null>(null);
    const apresEcriture = (ligne: Ligne, retour: RetourDeGeste) => {
        const segment = cleVersUrl(descripteur, ligne);
        setRetourDeNavigation({ segment, retour });
        naviguer(`${chemin}/${segment}`, params, { remplacer: true });
    };
    const retourInitial = retourDeNavigation !== null && retourDeNavigation.segment === reste ? retourDeNavigation.retour : null;

    return (
        <>
            <div className="entete-page">
                <div>
                    <h1>{descripteur.titre}</h1>
                    <p className="sous-titre">{descripteur.description}</p>
                </div>
                {reste === null ? (
                    <div className="boutons">
                        {boutons}
                        {descripteur.creation !== false ? (
                            <Bouton variante="plein" disabled={droits === false} onClick={() => naviguer(`${chemin}/${NOUVEAU}`, params)} icone={<Plus className="icone" aria-hidden="true" />}>Nouvelle ligne</Bouton>
                        ) : null}
                    </div>
                ) : null}
            </div>
            {descripteur.creation !== false || descripteur.table === 'retours' ? <LectureSeule /> : null}
            {descripteur.avertissement !== undefined ? <div className="carte compacte" style={{ marginBottom: 'var(--espace-md)' }}><Encart ton="avert">{descripteur.avertissement}</Encart></div> : null}
            {reste === null ? (
                <div className="carte"><ListeDeRessource descripteur={descripteur} lienDe={(ligne) => `${chemin}/${cleVersUrl(descripteur, ligne)}${params.size > 0 ? `?${params.toString()}` : ''}`} /></div>
            ) : reste === NOUVEAU ? (
                <>
                    {enTeteDeLigne?.(null)}
                    <Formulaire descripteur={descripteur} existante={null} apercu={apercu} onEnregistre={apresEcriture} onSupprime={retourALaListe} onAnnule={retourALaListe} />
                </>
            ) : (
                <LigneExistante descripteur={descripteur} segment={reste} retour={retourALaListe} onEnregistre={apresEcriture} retourInitial={retourInitial} apercu={apercu} enTeteDeLigne={enTeteDeLigne} />
            )}
        </>
    );
}

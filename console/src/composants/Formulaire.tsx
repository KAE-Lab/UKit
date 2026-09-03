/**
 * Le formulaire d'une ressource : creer ou modifier une ligne, la supprimer. Generique — le
 * descripteur dit les champs, `useFormulaire` dit quoi en faire.
 */

import type { FormEvent } from 'react';

import type { Ligne } from '../supabase';
import type { EtablissementConnu } from '../lib/base';
import type { Descripteur } from '../schema/descripteurs';
import { Bouton } from './Bouton';
import { ChampEditeur } from './Champs';
import { Retour } from './Retour';
import { useFormulaire } from './useFormulaire';

export interface FormulaireProps {
    readonly descripteur: Descripteur;
    readonly existante: Ligne | null;
    readonly etablissements: readonly EtablissementConnu[];
    readonly onEnregistre: (ligne: Ligne) => void;
    readonly onSupprime: () => void;
    readonly onAnnule: () => void;
}

export function Formulaire({ descripteur, existante, etablissements, onEnregistre, onSupprime, onAnnule }: FormulaireProps) {
    const { saisies, erreurs, retour, enCours, changer, soumettre, effacer, ligne } = useFormulaire(descripteur, existante);

    const soumission = async (evenement: FormEvent) => {
        evenement.preventDefault();
        const ecrite = await soumettre();
        if (ecrite !== null) onEnregistre(ecrite);
    };

    const suppression = async () => {
        if (!window.confirm('Supprimer cette ligne ? Le journal en gardera la trace.')) return;
        if (await effacer()) onSupprime();
    };

    return (
        <form className="carte formulaire" onSubmit={(evenement) => { void soumission(evenement); }}>
            <h2>{existante === null ? 'Nouvelle ligne' : 'Modifier'}</h2>
            {descripteur.champs.map((champ) => (
                <ChampEditeur
                    key={champ.nom}
                    champ={champ}
                    saisie={saisies[champ.nom] ?? ''}
                    onChange={(saisie) => changer(champ.nom, saisie)}
                    ligne={ligne}
                    etablissements={etablissements}
                    erreur={erreurs[champ.nom]}
                    // Une cle ne se change pas sur une ligne existante : ce serait une autre ligne.
                    desactive={champ.lectureSeule === true || (existante !== null && descripteur.cle.includes(champ.nom))}
                />
            ))}
            {retour !== null ? <Retour ton={retour.ton}>{retour.texte}</Retour> : null}
            <div className="boutons">
                <Bouton variante="plein" type="submit" disabled={enCours}>{enCours ? 'Ecriture…' : 'Enregistrer'}</Bouton>
                <Bouton variante="discret" onClick={onAnnule} disabled={enCours}>Retour a la liste</Bouton>
                <span className="espace" />
                {existante !== null && descripteur.suppression !== false ? (
                    <Bouton variante="destructif" onClick={() => { void suppression(); }} disabled={enCours}>Supprimer</Bouton>
                ) : null}
            </div>
        </form>
    );
}

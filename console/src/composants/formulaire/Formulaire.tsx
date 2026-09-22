/**
 * Le formulaire d'une ressource : creer ou modifier une ligne, la supprimer, agir dessus.
 * Generique — le descripteur dit les champs, zod dit ce qui part (schemas.ts), react-hook-form
 * tient l'etat. Un seul bouton passe en attente a la fois, a largeur fixe ; les retours prennent
 * la place reservee ; un formulaire modifie qu'on quitte demande confirmation.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Send, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useDroits } from '../../auth/session';
import { messageDErreur } from '../../lib/erreurs';
import { useEcriture } from '../../requetes/useEcriture';
import { useEtablissements } from '../../requetes/useEtablissements';
import type { ActionDeLigne, Descripteur } from '../../schema/descripteurs';
import { saisiesDe, schemaDuDescripteur, type Saisies } from '../../schema/schemas';
import type { Ligne } from '../../supabase';
import { Bouton } from '../ui/Bouton';
import { useConfirmation, type Question } from '../ui/Confirmation';
import { PlaceDEncart, type RetourDeGeste } from '../ui/Encart';
import { ChampEditeur } from './champs/Champ';
import { Lecture } from './Lecture';

export interface FormulaireProps {
    readonly descripteur: Descripteur;
    readonly existante: Ligne | null;
    /** Les champs en lecture seule que la page rend elle-meme (les reponses d'un retour). */
    readonly masquer?: readonly string[];
    readonly onEnregistre: (ligne: Ligne) => void;
    readonly onSupprime: () => void;
    readonly onAnnule: () => void;
}

/** Avertit avant de quitter la page ou l'onglet avec des saisies non enregistrees. */
function useGardeDeSortie(modifie: boolean): void {
    useEffect(() => {
        if (!modifie) return undefined;
        const garder = (evenement: BeforeUnloadEvent) => { evenement.preventDefault(); };
        window.addEventListener('beforeunload', garder);
        return () => window.removeEventListener('beforeunload', garder);
    }, [modifie]);
}

interface Gestes {
    readonly existante: Ligne | null;
    readonly suppression: { readonly mutateAsync: (ligne: Ligne) => Promise<void> };
    readonly action: { readonly mutateAsync: (v: { readonly action: ActionDeLigne; readonly ligne: Ligne }) => Promise<string> };
    readonly demander: (question: Question) => Promise<boolean>;
    readonly setRetour: (retour: RetourDeGeste | null) => void;
    readonly setActionEnCours: (libelle: string | null) => void;
    readonly onSupprime: () => void;
}

/** Les gestes hors ecriture d'une ligne existante : supprimer, et les actions du descripteur. */
function useGestes({ existante, suppression, action, demander, setRetour, setActionEnCours, onSupprime }: Gestes) {
    const supprimer = async () => {
        if (existante === null) return;
        if (!await demander({ titre: 'Supprimer cette ligne ?', texte: 'Le journal en gardera la trace, mais l’application ne la verra plus.', confirmer: 'Supprimer', destructif: true })) return;
        try {
            await suppression.mutateAsync(existante);
            onSupprime();
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        }
    };

    const agir = async (geste: ActionDeLigne) => {
        if (existante === null) return;
        if (geste.confirmation !== undefined && !await demander({ titre: geste.libelle, texte: geste.confirmation, confirmer: geste.libelle })) return;
        setActionEnCours(geste.libelle);
        setRetour(null);
        try {
            setRetour({ ton: 'ok', texte: await action.mutateAsync({ action: geste, ligne: existante }) });
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        } finally {
            setActionEnCours(null);
        }
    };

    return { supprimer, agir };
}

export function Formulaire({ descripteur, existante, masquer = [], onEnregistre, onSupprime, onAnnule }: FormulaireProps) {
    const droits = useDroits();
    const lectureSeule = droits === false;
    const { etablissements, codes } = useEtablissements();
    const schema = useMemo(() => schemaDuDescripteur(descripteur, { etablissements: codes }), [descripteur, codes]);
    const formulaire = useForm<Saisies, unknown, Ligne>({ resolver: zodResolver(schema), defaultValues: saisiesDe(descripteur, existante) });
    const valeurs = useWatch({ control: formulaire.control });
    const { ecriture, suppression, action } = useEcriture(descripteur);
    const { demander, dialogue } = useConfirmation();
    const [retour, setRetour] = useState<RetourDeGeste | null>(null);
    const [actionEnCours, setActionEnCours] = useState<string | null>(null);
    const modifie = formulaire.formState.isDirty;
    useGardeDeSortie(modifie);

    const enregistrer = formulaire.handleSubmit(async (ligne) => {
        setRetour(null);
        const complete = descripteur.avantEcriture === undefined ? ligne : descripteur.avantEcriture(ligne, existante);
        const message = descripteur.valider === undefined ? null : descripteur.valider(complete);
        if (message !== null) { setRetour({ ton: 'erreur', texte: message }); return; }
        try {
            const ecrite = await ecriture.mutateAsync({ valeurs: complete, existante });
            formulaire.reset(saisiesDe(descripteur, ecrite));
            setRetour({ ton: 'ok', texte: 'Enregistré.' });
            onEnregistre(ecrite);
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        }
    });

    const { supprimer, agir } = useGestes({ existante, suppression, action, demander, setRetour, setActionEnCours, onSupprime });

    const annuler = async () => {
        if (modifie && !await demander({ titre: 'Quitter sans enregistrer ?', texte: 'Les modifications de ce formulaire seront perdues.', confirmer: 'Quitter' })) return;
        onAnnule();
    };

    const editables = descripteur.champs.filter((champ) => champ.lectureSeule !== true && champ.cache !== true && !masquer.includes(champ.nom));
    const lisibles = descripteur.champs.filter((champ) => champ.lectureSeule === true && !masquer.includes(champ.nom));
    const actions = existante === null ? [] : (descripteur.actions ?? []).filter((geste) => geste.disponible === undefined || geste.disponible(existante));
    const occupe = ecriture.isPending || suppression.isPending || actionEnCours !== null;
    const erreursDeChamp = formulaire.formState.errors;
    const nombreDErreurs = Object.keys(erreursDeChamp).length;

    return (
        <form className="carte formulaire" onSubmit={(evenement) => { void enregistrer(evenement); }} noValidate aria-busy={occupe}>
            <h2>{existante === null ? 'Nouvelle ligne' : 'Modifier'}</h2>
            {editables.map((champ) => (
                <Controller
                    key={champ.nom}
                    control={formulaire.control}
                    name={champ.nom}
                    render={({ field, fieldState }) => (
                        <ChampEditeur
                            champ={champ}
                            saisie={field.value ?? ''}
                            onChange={field.onChange}
                            poserAutre={(nom, saisie) => formulaire.setValue(nom, saisie, { shouldDirty: true })}
                            ligne={valeurs as Ligne}
                            etablissements={etablissements}
                            codesConnus={codes}
                            erreur={fieldState.error?.message}
                            enErreur={fieldState.error !== undefined}
                            // Une cle ne se change pas sur une ligne existante : ce serait une autre ligne.
                            desactive={lectureSeule || (existante !== null && descripteur.cle.includes(champ.nom))}
                        />
                    )}
                />
            ))}
            {existante !== null ? <Lecture champs={lisibles} ligne={existante} /> : null}
            <PlaceDEncart retour={retour ?? (nombreDErreurs > 0 ? { ton: 'erreur', texte: `${nombreDErreurs} champ${nombreDErreurs > 1 ? 's' : ''} à corriger avant d’enregistrer.` } : null)} />
            <div className="boutons">
                <Bouton variante="plein" type="submit" enAttente={ecriture.isPending} disabled={occupe || lectureSeule} icone={<Save className="icone" aria-hidden="true" />}>Enregistrer</Bouton>
                <Bouton variante="discret" onClick={() => { void annuler(); }} disabled={occupe} icone={<Undo2 className="icone" aria-hidden="true" />}>Retour à la liste</Bouton>
                {actions.map((geste) => (
                    <Bouton key={geste.libelle} variante="tonal" onClick={() => { void agir(geste); }} enAttente={actionEnCours === geste.libelle} disabled={occupe || lectureSeule} icone={<Send className="icone" aria-hidden="true" />}>
                        {geste.libelle}
                    </Bouton>
                ))}
                <span className="espace" />
                {existante !== null && descripteur.suppression !== false ? (
                    <Bouton variante="destructif" onClick={() => { void supprimer(); }} enAttente={suppression.isPending} disabled={occupe || lectureSeule} icone={<Trash2 className="icone" aria-hidden="true" />}>Supprimer</Bouton>
                ) : null}
            </div>
            {dialogue}
        </form>
    );
}

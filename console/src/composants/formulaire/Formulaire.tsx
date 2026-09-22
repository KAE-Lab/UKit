/**
 * Le formulaire d'une ressource : creer ou modifier une ligne, la supprimer, agir dessus.
 * Generique — le descripteur dit les champs, zod dit ce qui part (schemas.ts), react-hook-form
 * tient l'etat. Un seul bouton passe en attente a la fois, a largeur fixe ; les retours prennent
 * la place reservee ; un formulaire modifie qu'on quitte demande confirmation.
 *
 * Depuis 7-F : les champs se rangent par `groupe` quand le descripteur en nomme ; un `apercu`
 * rend, dans une colonne collante a droite, ce que la ligne en cours de saisie donnera ; une
 * action peut rendre la ligne qui en resulte, que le formulaire suit ; et les actions restent
 * inertes tant qu'une saisie n'est pas enregistree — elles agissent sur la ligne enregistree, pas
 * sur ce qui est a l'ecran.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Send, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';

import { useDroits } from '../../auth/session';
import type { EtablissementConnu } from '../../lib/base';
import { messageDErreur } from '../../lib/erreurs';
import { useEcriture } from '../../requetes/useEcriture';
import { useEtablissements } from '../../requetes/useEtablissements';
import type { ActionDeLigne, Champ, Descripteur } from '../../schema/descripteurs';
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
    /** Ce que la ligne en cours de saisie donnera, rendu a cote du formulaire (l'apercu d'une annonce). */
    readonly apercu?: (valeurs: Ligne) => ReactNode;
    /**
     * Le retour a montrer des le montage : celui d'une ecriture qui a change l'adresse de la ligne —
     * une ligne neuve, une copie — et que la page a porte a travers la navigation.
     */
    readonly retourInitial?: RetourDeGeste | null;
    /** Une ligne ecrite, avec la phrase a montrer ; la page navigue vers son adresse s'il le faut. */
    readonly onEnregistre: (ligne: Ligne, retour: RetourDeGeste) => void;
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
    readonly action: { readonly mutateAsync: (v: { readonly action: ActionDeLigne; readonly ligne: Ligne }) => Promise<string | { readonly texte: string; readonly ligne?: Ligne }> };
    readonly demander: (question: Question) => Promise<boolean>;
    readonly setRetour: (retour: RetourDeGeste | null) => void;
    readonly setActionEnCours: (libelle: string | null) => void;
    readonly onSupprime: () => void;
    readonly onLigneAgie: (ligne: Ligne, retour: RetourDeGeste) => void;
}

/** Les gestes hors ecriture d'une ligne existante : supprimer, et les actions du descripteur. */
function useGestes({ existante, suppression, action, demander, setRetour, setActionEnCours, onSupprime, onLigneAgie }: Gestes) {
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
        if (geste.confirmation !== undefined && !await demander({ titre: geste.libelle, texte: geste.confirmation, confirmer: geste.libelle, destructif: geste.destructif })) return;
        setActionEnCours(geste.libelle);
        setRetour(null);
        try {
            const resultat = await action.mutateAsync({ action: geste, ligne: existante });
            if (typeof resultat === 'string') { setRetour({ ton: 'ok', texte: resultat }); return; }
            const confirmation: RetourDeGeste = { ton: 'ok', texte: resultat.texte };
            setRetour(confirmation);
            if (resultat.ligne !== undefined) onLigneAgie(resultat.ligne, confirmation);
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        } finally {
            setActionEnCours(null);
        }
    };

    return { supprimer, agir };
}

interface ChampsProps {
    readonly champs: readonly Champ[];
    readonly control: Control<Saisies, unknown, Ligne>;
    readonly valeurs: Ligne;
    readonly etablissements: readonly EtablissementConnu[];
    readonly codes: readonly string[] | null;
    readonly poserAutre: (nom: string, saisie: Saisies[string]) => void;
    readonly desactiver: (champ: Champ) => boolean;
}

/** Les champs editables, ranges par groupe quand le descripteur en nomme ; a plat sinon. */
function Champs({ champs, control, valeurs, etablissements, codes, poserAutre, desactiver }: ChampsProps) {
    const rendre = (champ: Champ) => (
        <Controller
            key={champ.nom}
            control={control}
            name={champ.nom}
            render={({ field, fieldState }) => (
                <ChampEditeur
                    champ={champ}
                    saisie={field.value ?? ''}
                    onChange={field.onChange}
                    poserAutre={poserAutre}
                    ligne={valeurs}
                    etablissements={etablissements}
                    codesConnus={codes}
                    erreur={fieldState.error?.message}
                    enErreur={fieldState.error !== undefined}
                    desactive={desactiver(champ)}
                />
            )}
        />
    );
    const groupes: { readonly nom: string | null; readonly champs: Champ[] }[] = [];
    for (const champ of champs) {
        const dernier = groupes[groupes.length - 1];
        if (dernier !== undefined && dernier.nom === (champ.groupe ?? null)) dernier.champs.push(champ);
        else groupes.push({ nom: champ.groupe ?? null, champs: [champ] });
    }
    return (
        <>
            {groupes.map((groupe, rang) => (groupe.nom === null
                ? groupe.champs.map(rendre)
                : <fieldset key={`${groupe.nom}-${rang}`} className="groupe"><legend>{groupe.nom}</legend>{groupe.champs.map(rendre)}</fieldset>
            ))}
        </>
    );
}

interface BoutonsProps {
    readonly descripteur: Descripteur;
    readonly existante: Ligne | null;
    readonly actions: readonly ActionDeLigne[];
    readonly occupe: boolean;
    readonly lectureSeule: boolean;
    readonly modifie: boolean;
    readonly enregistrementEnCours: boolean;
    readonly suppressionEnCours: boolean;
    readonly actionEnCours: string | null;
    readonly annuler: () => void;
    readonly agir: (geste: ActionDeLigne) => void;
    readonly supprimer: () => void;
}

/** La rangee des boutons : enregistrer, revenir, les actions du descripteur, supprimer. */
function Boutons({ descripteur, existante, actions, occupe, lectureSeule, modifie, enregistrementEnCours, suppressionEnCours, actionEnCours, annuler, agir, supprimer }: BoutonsProps) {
    return (
        <div className="boutons">
            <Bouton variante="plein" type="submit" enAttente={enregistrementEnCours} disabled={occupe || lectureSeule} icone={<Save className="icone" aria-hidden="true" />}>Enregistrer</Bouton>
            <Bouton variante="discret" onClick={annuler} disabled={occupe} icone={<Undo2 className="icone" aria-hidden="true" />}>Retour à la liste</Bouton>
            {actions.map((geste) => (
                <Bouton
                    key={geste.libelle}
                    variante={geste.destructif === true ? 'destructif' : 'tonal'}
                    onClick={() => agir(geste)}
                    enAttente={actionEnCours === geste.libelle}
                    disabled={occupe || lectureSeule || modifie}
                    title={modifie ? 'Enregistre d’abord : ce geste agit sur la ligne enregistrée.' : undefined}
                    icone={<Send className="icone" aria-hidden="true" />}
                >
                    {geste.libelle}
                </Bouton>
            ))}
            <span className="espace" />
            {existante !== null && descripteur.suppression !== false ? (
                <Bouton variante="destructif" onClick={supprimer} enAttente={suppressionEnCours} disabled={occupe || lectureSeule} icone={<Trash2 className="icone" aria-hidden="true" />}>Supprimer</Bouton>
            ) : null}
        </div>
    );
}

export function Formulaire({ descripteur, existante, masquer = [], apercu, retourInitial, onEnregistre, onSupprime, onAnnule }: FormulaireProps) {
    const droits = useDroits();
    const lectureSeule = droits === false;
    const { etablissements, codes } = useEtablissements();
    const schema = useMemo(() => schemaDuDescripteur(descripteur, { etablissements: codes }), [descripteur, codes]);
    const formulaire = useForm<Saisies, unknown, Ligne>({ resolver: zodResolver(schema), defaultValues: saisiesDe(descripteur, existante) });
    const valeurs = useWatch({ control: formulaire.control }) as Ligne;
    const { ecriture, suppression, action } = useEcriture(descripteur);
    const { demander, dialogue } = useConfirmation();
    const [retour, setRetour] = useState<RetourDeGeste | null>(retourInitial ?? null);
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
            const confirmation: RetourDeGeste = { ton: 'ok', texte: 'Enregistré.' };
            setRetour(confirmation);
            onEnregistre(ecrite, confirmation);
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        }
    });

    // Une action qui rend une ligne : le formulaire la suit — la meme, modifiee, ou une autre (dupliquer).
    const onLigneAgie = (ligne: Ligne, confirmation: RetourDeGeste) => { formulaire.reset(saisiesDe(descripteur, ligne)); onEnregistre(ligne, confirmation); };
    const { supprimer, agir } = useGestes({ existante, suppression, action, demander, setRetour, setActionEnCours, onSupprime, onLigneAgie });

    const annuler = async () => {
        if (modifie && !await demander({ titre: 'Quitter sans enregistrer ?', texte: 'Les modifications de ce formulaire seront perdues.', confirmer: 'Quitter' })) return;
        onAnnule();
    };

    const editables = descripteur.champs.filter((champ) => champ.lectureSeule !== true && champ.cache !== true && !masquer.includes(champ.nom));
    const lisibles = descripteur.champs.filter((champ) => champ.lectureSeule === true && !masquer.includes(champ.nom));
    const actions = existante === null ? [] : (descripteur.actions ?? []).filter((geste) => geste.disponible === undefined || geste.disponible(existante));
    const occupe = ecriture.isPending || suppression.isPending || actionEnCours !== null;
    const nombreDErreurs = Object.keys(formulaire.formState.errors).length;

    const corps = (
        <div className="formulaire-corps">
            <h2>{existante === null ? 'Nouvelle ligne' : 'Modifier'}</h2>
            <Champs
                champs={editables}
                control={formulaire.control}
                valeurs={valeurs}
                etablissements={etablissements}
                codes={codes}
                poserAutre={(nom, saisie) => formulaire.setValue(nom, saisie, { shouldDirty: true })}
                // Une cle ne se change pas sur une ligne existante : ce serait une autre ligne.
                desactiver={(champ) => lectureSeule || (existante !== null && descripteur.cle.includes(champ.nom))}
            />
            {existante !== null ? <Lecture champs={lisibles} ligne={existante} /> : null}
            <PlaceDEncart retour={retour ?? (nombreDErreurs > 0 ? { ton: 'erreur', texte: `${nombreDErreurs} champ${nombreDErreurs > 1 ? 's' : ''} à corriger avant d’enregistrer.` } : null)} />
            <Boutons
                descripteur={descripteur}
                existante={existante}
                actions={actions}
                occupe={occupe}
                lectureSeule={lectureSeule}
                modifie={modifie}
                enregistrementEnCours={ecriture.isPending}
                suppressionEnCours={suppression.isPending}
                actionEnCours={actionEnCours}
                annuler={() => { void annuler(); }}
                agir={(geste) => { void agir(geste); }}
                supprimer={() => { void supprimer(); }}
            />
        </div>
    );

    return (
        <form className={`carte formulaire ${apercu === undefined ? '' : 'avec-apercu'}`} onSubmit={(evenement) => { void enregistrer(evenement); }} noValidate aria-busy={occupe}>
            {corps}
            {apercu === undefined ? null : <aside className="formulaire-apercu" aria-label="Aperçu">{apercu(valeurs)}</aside>}
            {dialogue}
        </form>
    );
}

/**
 * Le formulaire d'une ressource : creer ou modifier une ligne, la supprimer, agir dessus.
 * Generique — le descripteur dit les champs, zod dit ce qui part (schemas.ts), react-hook-form
 * tient l'etat. Un seul bouton passe en attente a la fois, a largeur fixe ; un formulaire modifie
 * qu'on quitte demande confirmation, par le bouton comme par un lien de la console.
 *
 * Sa forme, depuis la passe d'ergonomie de 7-F :
 *
 * - **en haut**, ce qu'on edite — le titre de la ligne, son etat quand la page sait le dire — et
 *   les gestes sur la ligne enregistree (EnTete.tsx) ;
 * - **au milieu**, les champs, ranges par groupe (Champs.tsx) ;
 * - **en bas**, la barre d'enregistrement, collee au bas de la fenetre tant que le formulaire defile,
 *   avec l'etat de la saisie et Ctrl+S (BarreDEnregistrement.tsx) ;
 * - **a cote**, quand la page en donne un, l'apercu : un panneau a lui, qui recoit la saisie en cours
 *   et ce que l'editeur touche — le champ qui a le focus, la ligne du curseur.
 *
 * Les gestes restent inertes tant qu'une saisie n'est pas enregistree : ils agissent sur la ligne
 * enregistree, pas sur ce qui est a l'ecran.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useDroits } from '../../auth/session';
import { messageDErreur } from '../../lib/erreurs';
import { useEcriture } from '../../requetes/useEcriture';
import { useEtablissements } from '../../requetes/useEtablissements';
import type { ActionDeLigne, Descripteur } from '../../schema/descripteurs';
import { saisiesDe, schemaDuDescripteur, type Saisies } from '../../schema/schemas';
import type { Ligne } from '../../supabase';
import { useConfirmation, type Question } from '../ui/Confirmation';
import type { RetourDeGeste } from '../ui/Encart';
import { BarreDEnregistrement } from './BarreDEnregistrement';
import { Champs } from './Champs';
import { EnTeteDeFormulaire } from './EnTete';
import { AUCUNE_ACTIVITE, libelleDeLigne, statutDeLaSaisie, type Activite } from './etatDuFormulaire';
import { QUITTER_SANS_ENREGISTRER, raccourciDEnregistrement, useGardeDeNavigation, useGardeDeSortie, useRaccourciDEnregistrement } from './gardes';
import { Lecture } from './Lecture';

export interface FormulaireProps {
    readonly descripteur: Descripteur;
    readonly existante: Ligne | null;
    /** Les champs en lecture seule que la page rend elle-meme (les reponses d'un retour). */
    readonly masquer?: readonly string[];
    /** Ce que la ligne en cours de saisie donnera, dans un panneau a cote du formulaire (l'apercu d'une annonce). */
    readonly apercu?: (valeurs: Ligne, activite: Activite) => ReactNode;
    /**
     * L'etat de la ligne, dit sous son titre (une annonce visible, programmee, en brouillon) : celui
     * de la ligne enregistree, et celui que la saisie donnera quand il differe.
     */
    readonly etat?: (valeurs: Ligne, existante: Ligne | null) => ReactNode;
    /** Le titre du formulaire est celui de la page (`h1`) : la page n'en porte pas d'autre. */
    readonly titreDePage?: boolean;
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
        if (geste.confirmation !== undefined && !await demander({ titre: geste.libelle, texte: geste.confirmation, confirmer: geste.libelle })) return;
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

/** Le champ d'un element du formulaire, par l'attribut que chaque champ porte. */
function champDe(cible: EventTarget): string | null {
    return cible instanceof Element ? cible.closest('[data-champ]')?.getAttribute('data-champ') ?? null : null;
}

/**
 * Ce que l'editeur touche : le champ qui a le focus ou qu'on vient de toucher — un televersement
 * ouvre le selecteur de fichiers sans donner le focus a rien —, et la ligne du curseur.
 */
function useActivite() {
    const [activite, setActivite] = useState<Activite>(AUCUNE_ACTIVITE);
    const suivre = (nom: string | null) => setActivite((courante) => (courante.champ === nom ? courante : { champ: nom, ligne: null }));
    return {
        activite,
        suivreLeFocus: (evenement: FocusEvent<HTMLFormElement>) => suivre(champDe(evenement.target)),
        suivreLeGeste: (evenement: PointerEvent<HTMLFormElement>) => { const nom = champDe(evenement.target); if (nom !== null) suivre(nom); },
        // Le focus passe a un element hors du formulaire — un onglet de l'apercu, la navigation : plus
        // rien n'est en cours d'edition. Un focus qui ne va nulle part — le selecteur de fichiers d'un
        // televersement, un clic dans le vide — garde le champ en cours.
        quitterLeFocus: (evenement: FocusEvent<HTMLFormElement>) => {
            const suivant = evenement.relatedTarget;
            if (suivant instanceof Node && !evenement.currentTarget.contains(suivant)) setActivite(AUCUNE_ACTIVITE);
        },
        signalerLigne: (nom: string, ligne: number) => setActivite((courante) => (courante.champ === nom && courante.ligne === ligne ? courante : { champ: nom, ligne })),
    };
}

/** Ce que le formulaire montre d'un descripteur : les champs a saisir, ceux a lire, et les gestes permis sur la ligne. */
function parties(descripteur: Descripteur, masquer: readonly string[], existante: Ligne | null) {
    return {
        editables: descripteur.champs.filter((champ) => champ.lectureSeule !== true && champ.cache !== true && !masquer.includes(champ.nom)),
        lisibles: descripteur.champs.filter((champ) => champ.lectureSeule === true && !masquer.includes(champ.nom)),
        actions: existante === null ? [] : (descripteur.actions ?? []).filter((geste) => geste.disponible === undefined || geste.disponible(existante)),
    };
}

export function Formulaire({ descripteur, existante, masquer = [], apercu, etat, titreDePage = false, retourInitial, onEnregistre, onSupprime, onAnnule }: FormulaireProps) {
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
    const { activite, suivreLeFocus, suivreLeGeste, quitterLeFocus, signalerLigne } = useActivite();
    const modifie = formulaire.formState.isDirty;
    const occupe = ecriture.isPending || suppression.isPending || actionEnCours !== null;
    useGardeDeSortie(modifie);
    useGardeDeNavigation(modifie, demander);
    // Une saisie reprise rend perime le retour du geste precedent (« Enregistre. ») : la barre dit ce qui est vrai maintenant.
    useEffect(() => { if (modifie) setRetour(null); }, [modifie]);

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
    useRaccourciDEnregistrement(() => { if (!occupe && !lectureSeule) void enregistrer(); });

    // Une action qui rend une ligne : le formulaire la suit — la meme, modifiee, ou une autre (dupliquer).
    const onLigneAgie = (ligne: Ligne, confirmation: RetourDeGeste) => { formulaire.reset(saisiesDe(descripteur, ligne)); onEnregistre(ligne, confirmation); };
    const { supprimer, agir } = useGestes({ existante, suppression, action, demander, setRetour, setActionEnCours, onSupprime, onLigneAgie });
    const annuler = async () => {
        if (modifie && !await demander(QUITTER_SANS_ENREGISTRER)) return;
        onAnnule();
    };

    const { editables, lisibles, actions } = parties(descripteur, masquer, existante);

    return (
        <div className={`edition ${apercu === undefined ? '' : 'avec-apercu'}`}>
            <form className="carte formulaire" onSubmit={(evenement) => { void enregistrer(evenement); }} onFocus={suivreLeFocus} onPointerDown={suivreLeGeste} onBlur={quitterLeFocus} noValidate aria-busy={occupe}>
                <EnTeteDeFormulaire
                    titre={libelleDeLigne(valeurs, existante, descripteur.nouvelle)}
                    titreDePage={titreDePage}
                    etat={etat?.(valeurs, existante)}
                    actions={actions}
                    suppression={existante !== null && descripteur.suppression !== false}
                    actionEnCours={actionEnCours}
                    suppressionEnCours={suppression.isPending}
                    inerte={occupe || lectureSeule}
                    modifie={modifie}
                    agir={(geste) => { void agir(geste); }}
                    supprimer={() => { void supprimer(); }}
                />
                <Champs
                    champs={editables}
                    control={formulaire.control}
                    valeurs={valeurs}
                    etablissements={etablissements}
                    codes={codes}
                    poserAutre={(nom, saisie) => formulaire.setValue(nom, saisie, { shouldDirty: true })}
                    // Une cle ne se change pas sur une ligne existante : ce serait une autre ligne.
                    desactiver={(champ) => lectureSeule || (existante !== null && descripteur.cle.includes(champ.nom))}
                    signalerLigne={signalerLigne}
                />
                {existante !== null ? <Lecture champs={lisibles} ligne={existante} /> : null}
                <BarreDEnregistrement
                    statut={statutDeLaSaisie(retour, Object.keys(formulaire.formState.errors).length, modifie)}
                    enregistrementEnCours={ecriture.isPending}
                    occupe={occupe}
                    lectureSeule={lectureSeule}
                    raccourci={lectureSeule ? null : raccourciDEnregistrement(navigator.userAgent)}
                    annuler={() => { void annuler(); }}
                />
            </form>
            {apercu === undefined ? null : <aside className="carte apercu-panneau" aria-label="Aperçu">{apercu(valeurs, activite)}</aside>}
            {dialogue}
        </div>
    );
}

export type { Activite };

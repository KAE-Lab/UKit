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
 * Depuis 7-H, il reflete le role du compte : une ligne qu'il ne peut pas modifier se lit sans se
 * saisir, un geste qu'il ne peut pas faire ne se propose pas, et un redacteur borne ne coche que ses
 * campus. La base decide de toute facon ; le formulaire le dit avant. Il travaille sur la ligne qu'il a
 * chargee — la reference —, pas sur la derniere relue : c'est sur sa version que porte le verrou.
 *
 * Les gestes restent inertes tant qu'une saisie n'est pas enregistree : ils agissent sur la ligne
 * enregistree, pas sur ce qui est a l'ecran.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { borneDe, peutEcrire, peutModifierLigne, peutSupprimer } from '../../auth/droits';
import { useCompteQuiAgit } from '../../auth/session';
import { useEcriture } from '../../requetes/useEcriture';
import { useEtablissements } from '../../requetes/useEtablissements';
import type { CompteQuiAgit, Descripteur, Secret } from '../../schema/descripteurs';
import { saisiesDe, schemaDuDescripteur, type Saisies } from '../../schema/schemas';
import type { Ligne } from '../../supabase';
import { useConfirmation } from '../ui/Confirmation';
import type { RetourDeGeste } from '../ui/Encart';
import { SecretUnique } from '../ui/SecretUnique';
import { BarreDEnregistrement } from './BarreDEnregistrement';
import { Champs } from './Champs';
import { EnTeteDeFormulaire } from './EnTete';
import { AUCUNE_ACTIVITE, libelleDeLigne, statutDeLaSaisie, type Activite } from './etatDuFormulaire';
import { QUITTER_SANS_ENREGISTRER, raccourciDEnregistrement, useGardeDeNavigation, useGardeDeSortie, useRaccourciDEnregistrement } from './gardes';
import { Lecture } from './Lecture';
import { useEnregistrement } from './useEnregistrement';
import { useGestes } from './useGestes';

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
     * une ligne neuve, une copie — et que la page a porte a travers la navigation, secret compris.
     */
    readonly retourInitial?: RetourDeGeste | null;
    /** Une ligne ecrite, avec la phrase a montrer ; la page navigue vers son adresse s'il le faut. */
    readonly onEnregistre: (ligne: Ligne, retour: RetourDeGeste) => void;
    readonly onSupprime: () => void;
    readonly onAnnule: () => void;
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

/**
 * Ce que le formulaire montre d'un descripteur, pour ce compte : les champs a saisir et a lire, s'il
 * saisit, les gestes qu'il peut faire, la borne de ses campus. Tant que les droits ne sont pas lus, rien
 * n'est retire — la base refuserait de toute facon.
 */
function parties(descripteur: Descripteur, masquer: readonly string[], reference: Ligne | null, compte: CompteQuiAgit) {
    const { droits } = compte;
    const connus = droits !== undefined;
    // Creer demande le droit sur la table ; modifier, le droit sur la ligne chargee — une annonce d'un
    // autre campus se lit sans se modifier, et se duplique pourtant, sur les campus du redacteur.
    const creer = !connus || peutEcrire(droits, descripteur.table);
    const modifier = reference === null ? creer : !connus || peutModifierLigne(droits, descripteur.table, reference);
    const retrait = descripteur.retrait;
    return {
        editables: descripteur.champs.filter((champ) => champ.lectureSeule !== true && champ.cache !== true && !masquer.includes(champ.nom)),
        lisibles: descripteur.champs.filter((champ) => champ.lectureSeule === true && !masquer.includes(champ.nom)),
        actions: reference === null ? [] : (descripteur.actions ?? []).filter((geste) => (geste.disponible === undefined || geste.disponible(reference, compte))
            && (geste.ecrit === 'copie' ? creer : modifier)),
        retirable: reference !== null && descripteur.suppression !== false && (!connus || peutSupprimer(droits))
            && (retrait?.disponible === undefined || retrait.disponible(reference, compte)),
        lectureSeule: !modifier,
        borne: borneDe(droits),
    };
}

/**
 * Le retour du dernier geste, dit dans la barre, et le secret qu'il porte, montre une seule fois : ceux
 * qu'une ecriture a fait voyager a travers la navigation, au montage.
 */
function useRetour(retourInitial: RetourDeGeste | null | undefined) {
    const [retour, setRetour] = useState<RetourDeGeste | null>(retourInitial ?? null);
    const [secret, setSecret] = useState<Secret | null>(retourInitial?.secret ?? null);
    return { retour, setRetour, secret, setSecret };
}

/** La saisie de depart : la ligne, ou les defauts d'une ligne neuve — ceux d'un redacteur borne visent ses campus. */
function saisiesInitiales(descripteur: Descripteur, existante: Ligne | null, borne: readonly string[] | null): Saisies {
    const saisies = saisiesDe(descripteur, existante);
    if (existante !== null || borne === null || descripteur.campus?.type !== 'ciblage') return saisies;
    return { ...saisies, [descripteur.campus.colonne]: [...borne] };
}

export function Formulaire({ descripteur, existante, masquer = [], apercu, etat, titreDePage = false, retourInitial, onEnregistre, onSupprime, onAnnule }: FormulaireProps) {
    const compte = useCompteQuiAgit();
    const [reference, setReference] = useState<Ligne | null>(existante);
    const { editables, lisibles, actions, retirable, lectureSeule, borne } = parties(descripteur, masquer, reference, compte);
    const { etablissements, codes } = useEtablissements();
    const schema = useMemo(() => schemaDuDescripteur(descripteur, { etablissements: codes, borne }), [descripteur, codes, borne]);
    const formulaire = useForm<Saisies, unknown, Ligne>({ resolver: zodResolver(schema), defaultValues: saisiesInitiales(descripteur, existante, borne) });
    const valeurs = useWatch({ control: formulaire.control }) as Ligne;
    const { ecriture, creation, suppression, action } = useEcriture(descripteur);
    const { demander, dialogue } = useConfirmation();
    const { retour, setRetour, secret, setSecret } = useRetour(retourInitial);
    const [actionEnCours, setActionEnCours] = useState<string | null>(null);
    const { activite, suivreLeFocus, suivreLeGeste, quitterLeFocus, signalerLigne } = useActivite();
    const modifie = formulaire.formState.isDirty;
    const occupe = ecriture.isPending || creation.isPending || suppression.isPending || actionEnCours !== null;
    useGardeDeSortie(modifie);
    useGardeDeNavigation(modifie, demander);
    // Une saisie reprise rend perime le retour du geste precedent (« Enregistre. ») : la barre dit ce qui est vrai maintenant.
    useEffect(() => { if (modifie) setRetour(null); }, [modifie]);

    // Le formulaire repart d'une ligne — ecrite, rendue par un geste, rechargee — : sa saisie, et sa version.
    const suivre = (ligne: Ligne) => { formulaire.reset(saisiesDe(descripteur, ligne)); setReference(ligne); };
    const soumettre = useEnregistrement({ descripteur, reference, ecriture, creation, demander, suivre, setRetour, onEnregistre });
    const enregistrer = formulaire.handleSubmit(soumettre);
    useRaccourciDEnregistrement(() => { if (!occupe && !lectureSeule) void enregistrer(); });

    // Une action qui rend une ligne : le formulaire la suit — la meme, modifiee, ou une autre (dupliquer).
    const onLigneAgie = (ligne: Ligne, confirmation: RetourDeGeste) => { suivre(ligne); onEnregistre(ligne, confirmation); };
    const { supprimer, agir } = useGestes({ descripteur, reference, compte, suppression, action, demander, setRetour, setActionEnCours, montrerSecret: setSecret, onSupprime, onLigneAgie });
    const annuler = async () => {
        if (modifie && !await demander(QUITTER_SANS_ENREGISTRER)) return;
        onAnnule();
    };

    return (
        <div className={`edition ${apercu === undefined ? '' : 'avec-apercu'}`}>
            <form className="carte formulaire" onSubmit={(evenement) => { void enregistrer(evenement); }} onFocus={suivreLeFocus} onPointerDown={suivreLeGeste} onBlur={quitterLeFocus} noValidate aria-busy={occupe}>
                <EnTeteDeFormulaire
                    titre={libelleDeLigne(valeurs, reference, descripteur.nouvelle)}
                    titreDePage={titreDePage}
                    etat={etat?.(valeurs, reference)}
                    actions={actions}
                    suppression={retirable}
                    libelleDeSuppression={descripteur.retrait?.libelle}
                    actionEnCours={actionEnCours}
                    suppressionEnCours={suppression.isPending}
                    inerte={occupe}
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
                    borne={borne}
                    poserAutre={(nom, saisie) => formulaire.setValue(nom, saisie, { shouldDirty: true })}
                    // Une cle ne se change pas sur une ligne existante : ce serait une autre ligne.
                    desactiver={(champ) => lectureSeule || (reference !== null && descripteur.cle.includes(champ.nom))}
                    signalerLigne={signalerLigne}
                />
                {reference !== null ? <Lecture champs={lisibles} ligne={reference} /> : null}
                <BarreDEnregistrement
                    statut={statutDeLaSaisie(retour, Object.keys(formulaire.formState.errors).length, modifie)}
                    enregistrementEnCours={ecriture.isPending || creation.isPending}
                    occupe={occupe}
                    lectureSeule={lectureSeule}
                    raccourci={lectureSeule ? null : raccourciDEnregistrement(navigator.userAgent)}
                    annuler={() => { void annuler(); }}
                />
            </form>
            {apercu === undefined ? null : <aside className="carte apercu-panneau" aria-label="Aperçu">{apercu(valeurs, activite)}</aside>}
            {dialogue}
            <SecretUnique secret={secret} fermer={() => setSecret(null)} />
        </div>
    );
}

export type { Activite };

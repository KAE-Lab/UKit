import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import SecureStoreService from '../../../shared/services/SecureStoreService';
import { SettingsManager } from '../../../shared/services/AppCore';
import { getCodeEtablissementActif, portailPublie } from '../../../shared/etablissements';
import Translator from '../../../shared/i18n/Translator';
import type { UkitFailure } from '../../../shared/aetherius';
import { rangerCertificat } from './CertificatService';
import { cleDeMessage, type ScolariteColdData } from './ScolariteMapping';
import { useWidgets, type EtatDesWidgets } from '../widgets/useWidgets';
import type { PropositionsDossier } from './PropositionsDossier';
import { lirePropositionsEnAttente, propositionsDe } from './PropositionsEnAttente';
import {
    deroulerSession,
    fermerSessionDistante,
    type EtapeSession,
    type ResultatSession,
} from './ScolariteSession';

/**
 * Contexte central de l'onglet Scolarite.
 *
 * Il garde ce qu'il a toujours porte — l'etat de session, le choix froid/chaud, l'ecriture en
 * `SecureStore`, la progression affichee — et perd ce que le jalon 6-F a remplace : la machine a
 * etats pilotee par des messages de WebView, les sept types d'evenements, et le garde-fou global de
 * 60 s. La session est desormais une **sequence de runs** (services/ScolariteSession.ts), et les
 * delais sont declares step par step dans les Blueprints.
 *
 * Donnees froides : prenom, numero etudiant, INE, adresse mail, date de naissance. Lues une fois, au
 * premier login, et gardees en `SecureStore`.
 * Donnees chaudes : le nombre de messages non lus. Relues a chaque lancement, en memoire seulement.
 *
 * Deux ecritures, deux declencheurs, et il ne faut pas les confondre :
 *
 *   - **les identifiants** s'ecrivent sur `LOGIN_SUCCESS`, l'evenement que le Blueprint emet quand
 *     le CAS a accepte. C'est la preuve qu'ils sont bons, et un mot de passe errone ne laisse donc
 *     aucune trace ;
 *   - **les donnees froides** ne s'ecrivent que si le run va au bout, `assert` compris. Un decalage
 *     des identifiants GWT fait echouer l'assertion, et rien d'incorrect n'atteint le trousseau —
 *     c'est le filet que le code d'origine n'avait pas.
 *
 * **Une session a la fois.** Il y a une WebView montee, donc un run navigateur a la fois : une
 * seconde demande est refusee **explicitement et bruyamment** plutot que mise en file — une file
 * cacherait une seconde session derriere un delai inexplique, et l'utilisateur ne saurait pas
 * laquelle il regarde. Le service pose la meme garde de son cote (ScolariteSession.ts) ; les deux
 * ceintures sont voulues, celle-ci attrapant ce que l'autre laisserait passer.
 *
 * Voir docs/features/scolarite.md et docs/phase-6/6-f-scolarite.md.
 */

export type ScrapeStatus = 'idle' | 'connecting' | 'scraping' | 'done' | 'error';

export interface Identifiants {
    readonly username: string;
    readonly password: string;
}

export interface ResultatValidation {
    readonly success: boolean;
    readonly error?: string;
}

export interface CredentialsValue {
    readonly credentials: Identifiants | null;
    readonly credentialsLoaded: boolean;
    readonly coldData: ScolariteColdData | null;
    /**
     * Ce que les widgets savent : leurs valeurs, leurs echecs, celui qui se lit en ce moment.
     *
     * Il remplace `mailData`, qui portait le seul compteur de messages **sans le persister** — d'ou
     * l'indicateur tournant a chaque lancement et le vide hors ligne. Les widgets, eux, s'ouvrent sur
     * leur derniere valeur connue et se rafraichissent dessous.
     */
    readonly widgets: EtatDesWidgets;
    /**
     * Le certificat automatique est en train de se ranger.
     *
     * Ce run continue APRES la barre du parcours froid — c'est le dernier de la chaine, et le plus
     * long. La tuile des documents s'en sert pour poser le meme indicateur de lecture que les
     * widgets : sans lui, rien n'indiquait qu'un travail se poursuivait, et l'absence de piece se
     * lisait comme un echec (signale sur appareil le 2026-08-29).
     */
    readonly certificatEnCours: boolean;
    readonly scrapeStatus: ScrapeStatus;
    readonly scrapeProgress: EtapeSession | null;
    readonly sessionMode: 'cold' | 'hot';
    /** Le dernier echec de session, deja traduit en decision d'ecran. `null` si tout va bien. */
    readonly sessionFailure: UkitFailure | null;
    /**
     * L'etablissement selectionne publie-t-il **un** portail, quel qu'il soit ?
     *
     * `false` fait disparaitre le formulaire de connexion au profit d'un message : une universite qui
     * n'expose ni dossier ni messagerie n'a rien derriere quoi s'authentifier, et lui demander des
     * identifiants serait promettre un service qui n'existe pas. Le cas est reel des qu'un
     * etablissement arrive au catalogue sans portail ecrit (jalon 6-J).
     */
    readonly portailDisponible: boolean;
    /**
     * Ce que le dossier a livre **en plus** de l'identite, et qu'un ecran proposera d'appliquer.
     *
     * Present apres un parcours froid, et pour la duree de la session seulement : rien ne les
     * persiste, volontairement. Une nouvelle lecture du dossier — « Actualiser le dossier », une
     * reconnexion — les reproposera, et c'est le bon comportement puisqu'elle est un geste
     * volontaire ; les garder ferait ressurgir un jour une proposition vieille de six mois.
     */
    readonly propositions: PropositionsDossier | null;
    /** Les oublier : la modale disparait, et rien n'est ecrit. Refuser, ou avoir applique. */
    readonly oublierPropositions: () => void;
    readonly validateAndSave: (username: string, password: string) => Promise<ResultatValidation>;
    readonly retrySession: () => void;
    /** Redemander un parcours froid, sans passer par une deconnexion. */
    readonly rafraichirDossier: () => void;
    readonly logout: () => Promise<void>;
}

const CredentialsContext = createContext<CredentialsValue | null>(null);

export const useCredentials = (): CredentialsValue => useContext(CredentialsContext) as CredentialsValue;

/** Le message a afficher pour un echec : le code du Blueprint s'il en a un, sa famille sinon. */
function messageDEchec(failure: UkitFailure): string {
    return Translator.get(cleDeMessage(failure));
}

/**
 * L'etat d'une session, d'un seul tenant.
 *
 * Les trois champs changent **toujours** ensemble : un statut qui avance sans que la progression
 * suive, ou un echec qui reste affiche apres une reprise, sont les deux defauts que trois `useState`
 * separes laissaient possibles.
 */
interface EtatSession {
    readonly status: ScrapeStatus;
    readonly progress: EtapeSession | null;
    readonly failure: UkitFailure | null;
}

const AU_REPOS: EtatSession = { status: 'idle', progress: null, failure: null };

/**
 * L'etat final d'une session.
 *
 * `idle` pour un echec **silencieux** : un run annule veut dire que l'utilisateur est parti, et
 * afficher une erreur a son retour serait signaler une panne qui n'a pas eu lieu.
 */
function etatFinal(resultat: ResultatSession): EtatSession {
    const failure = resultat.failure ?? null;
    if (failure === null) return { status: 'done', progress: null, failure: null };
    return { status: failure.silent ? 'idle' : 'error', progress: null, failure };
}

/**
 * Ce qu'un chargement du trousseau rend a l'ecran, d'un seul tenant.
 *
 * Un objet plutot que trois parametres : ils arrivent toujours ensemble, et la signature etait
 * recopiee a trois endroits — un quatrieme champ y aurait ete oublie une fois sur deux.
 */
interface SessionDuTrousseau {
    readonly credentials: Identifiants | null;
    readonly cold: ScolariteColdData | null;
    readonly enAttente: PropositionsDossier | null;
}

type PoserSession = (session: SessionDuTrousseau) => void;

/**
 * Le premier chargement : ce que le trousseau porte, puis la session qui va avec.
 *
 * Le parcours se deduit des donnees froides — deja la, parcours chaud ; absentes, parcours froid.
 * C'est ce qui evite de relire trois pages lourdes a chaque lancement.
 */
async function chargerSessionDuTrousseau(
    lancerSession: (mode: 'cold' | 'hot') => void,
    poser: PoserSession,
    vivant: () => boolean,
): Promise<void> {
    const [creds, cold, propositions] = await Promise.all([
        SecureStoreService.getCredentials(),
        SecureStoreService.getColdData(),
        SecureStoreService.getPropositions(),
    ]);
    if (!vivant()) return;

    // Ce qui attendait une reponse revient avec le reste, et sera **redecide** contre le planning du
    // moment : c'est ce qui rattrape une connexion faite quand le planning etait encore vide.
    const enAttente = propositionsDe(lirePropositionsEnAttente(propositions), getCodeEtablissementActif());

    poser({ credentials: creds, cold: (cold as ScolariteColdData | null) ?? null, enAttente });
    /*
     * **Un dossier deja lu ne declenche plus rien.**
     *
     * On jouait ici un parcours « chaud » dont tout le role etait de relire la boite de reception.
     * Ce n'est plus une session mais un widget : il s'ouvre sur sa derniere valeur connue, et ne
     * rejoue que s'il est perime. Le lancement de l'application ne coute donc plus un run de moteur
     * a quelqu'un qui ouvre l'onglet Planning et rien d'autre.
     */
    if (creds && cold === null) lancerSession('cold');
}

function useChargementInitial(lancerSession: (mode: 'cold' | 'hot') => void, poser: PoserSession): void {
    useEffect(() => {
        let monte = true;
        void chargerSessionDuTrousseau(lancerSession, poser, () => monte);
        return () => { monte = false; };
    }, [lancerSession, poser]);
}

/**
 * Le cycle de vie d'une session face a celui de l'application.
 *
 * **Annuler en arriere-plan** evite le defaut classique de ce motif : une WebView cachee qui survit
 * a l'ecran qui l'a demandee. Sur `background` seulement, jamais sur `inactive` : iOS emet
 * `inactive` pour un centre de controle tire ou une invite systeme — dont l'invite biometrique de
 * cet onglet — et annuler la session a ce moment-la la tuerait sans raison.
 *
 * **Reprendre au retour**, et seulement si l'on avait soi-meme annule : sans ca, poser son telephone
 * pendant un premier login laisserait l'onglet vide jusqu'au prochain demarrage de l'application.
 * La reprise est bornee a ce cas precis — un echec reel, lui, ne se rejoue pas tout seul.
 *
 * **L'effet ne se rejoue jamais**, et c'est la ligne la plus importante du fichier. Son nettoyage
 * annule la session en cours ; le lier a une fonction qui change — `reprendre` depend de
 * `credentials`, que `LOGIN_SUCCESS` met a jour **pendant** la session — faisait se desabonner puis
 * se reabonner en plein run, donc annuler ce qu'on venait de lancer. Le symptome etait un
 * « cancelled » sur le second Blueprint et un onglet vide, sans que rien n'ait echoue. La fonction
 * passe donc par une reference, relue au moment de l'appel.
 */
function useCycleDeVieSession(
    sessionRef: React.RefObject<AbortController | null>,
    reprendre: () => void,
): void {
    const annulee = useRef(false);
    const reprendreRef = useRef(reprendre);
    reprendreRef.current = reprendre;

    useEffect(() => {
        const abonnement = AppState.addEventListener('change', (etat) => {
            if (etat === 'background' && sessionRef.current !== null) {
                annulee.current = true;
                sessionRef.current.abort();
            } else if (etat === 'active' && annulee.current) {
                annulee.current = false;
                reprendreRef.current();
            }
        });
        return () => {
            abonnement.remove();
            sessionRef.current?.abort();
        };
    }, [sessionRef]);
}

/**
 * La deconnexion : couper la session en cours, puis vider le trousseau.
 *
 * Dans cet ordre, et pas l'inverse : une session encore vivante rendrait ses donnees apres
 * l'effacement, et les reecrirait. Le run annule, lui, n'ecrit rien (voir `lancerSession`).
 */
function useDeconnexion(
    sessionRef: React.RefObject<AbortController | null>,
    oublier: () => void,
): () => Promise<void> {
    return useCallback(async () => {
        sessionRef.current?.abort();
        await SecureStoreService.deleteCredentials();
        await SecureStoreService.deleteColdData();
        // Les valeurs de widgets sont des donnees du compte : les laisser ferait retrouver le
        // compteur de messages de quelqu'un d'autre a la connexion suivante.
        await SecureStoreService.deleteWidgets();
        // Ce qui attendait une reponse appartenait a ce compte : le garder ferait poser la question
        // au suivant, avec les UE du precedent.
        await ecrireEnAttente(null);
        oublier();
        /*
         * **Apres le local, jamais avant.** Depuis que les parcours de portail persistent leur
         * session (`options.session.persist`), le cookie de ticket CAS survit au run : l'effacer
         * cote serveur fait partie du geste, sinon on retirerait le trousseau en laissant un
         * navigateur integre authentifie au compte qu'on vient de quitter.
         *
         * L'ordre compte et il est deliberé : cet appel touche le reseau et peut trainer. Le placer
         * avant laisserait quelqu'un dont le portail ne repond pas **toujours connecte localement**
         * — c'est-a-dire un bouton « Se deconnecter » qui ne deconnecte pas. Il ne leve jamais.
         */
        await fermerSessionDistante();
    }, [oublier, sessionRef]);
}

/**
 * Changer d'etablissement **rebascule** la session : on oublie celle d'avant, on relit celle d'apres.
 *
 * Ce provider est monte au-dessus de toute la pile : il ne se demonte pas, et son etat survivait donc
 * a la bascule. Le symptome mesure sur appareil au jalon 6-G : apres un retour a Bordeaux, l'onglet
 * affichait encore le prenom de l'etudiant de l'autre universite — la pire forme du defaut que cette
 * phase supprime, une donnee fausse qui a l'air juste. Oublier reste donc indispensable.
 *
 * **Oublier ne suffit plus depuis que le trousseau cloisonne** (2026-08-22). Avant, la bascule vidait
 * le magasin : ne garder aucune memoire etait exactement juste, puisqu'il n'y avait plus rien a lire.
 * Desormais l'entree de l'etablissement d'arrivee existe peut-etre, et s'arreter a l'oubli
 * demanderait de se reconnecter a une fac ou l'on est deja connecte — le defaut d'origine, deplace
 * d'un cran.
 *
 * La relecture est sure parce que l'ordre l'est : `SettingsManager.setEtablissement` pose le code
 * actif **avant** de notifier, donc le trousseau interroge ici est deja celui de la fac d'arrivee.
 */
function useBasculerAuChangementDEtablissement(
    sessionRef: React.RefObject<AbortController | null>,
    oublier: () => void,
    lancerSession: (mode: 'cold' | 'hot') => void,
    poser: PoserSession,
): void {
    const oublierRef = useRef(oublier);
    oublierRef.current = oublier;
    const lancerRef = useRef(lancerSession);
    lancerRef.current = lancerSession;
    const poserRef = useRef(poser);
    poserRef.current = poser;

    useEffect(() => {
        let monte = true;
        const surChangement = () => {
            sessionRef.current?.abort();
            oublierRef.current();
            void chargerSessionDuTrousseau(
                (mode) => lancerRef.current(mode),
                (session) => poserRef.current(session),
                () => monte,
            );
        };
        SettingsManager.on('etablissement', surChangement);
        return () => {
            monte = false;
            SettingsManager.unsubscribe('etablissement', surChangement);
        };
    }, [sessionRef]);
}


/**
 * Valider un couple d'identifiants, et ne l'ecrire que si le CAS l'accepte.
 *
 * **La session distante se ferme d'abord, et c'est indispensable depuis que la session persiste.**
 * Le Blueprint n'ecrit les identifiants que sur `LOGIN_SUCCESS`, qu'il n'emet que s'il a reellement
 * traverse un formulaire — c'est la preuve que le couple est bon. Or avec une session vivante, le CAS
 * reconnait le ticket et renvoie directement au service **sans jamais afficher de champ** : le run
 * traverserait sans rien verifier.
 *
 * Le cas dangereux n'est pas theorique, c'est celui de « Ressaisir mes identifiants » : quelqu'un dont
 * le mot de passe a change tape le nouveau, une session de l'ancien est encore ouverte, et sans cette
 * fermeture **un mot de passe faux serait enregistre comme s'il etait bon**. C'est exactement la
 * donnee fausse qui a l'air juste que cette phase supprime.
 *
 * Fermer d'abord garantit que le formulaire apparaisse, donc que la garde de l'`emit` soit vraie,
 * donc que l'ecriture soit meritee. `finally` et non `then` : une fermeture qui echoue ne doit pas
 * empecher quelqu'un de se reconnecter.
 */
function useValidation(
    lancerSession: (mode: 'cold' | 'hot', candidat?: Identifiants | null, remplacer?: boolean) => boolean,
    setColdData: (cold: ScolariteColdData | null) => void,
    validationRef: React.MutableRefObject<((resultat: ResultatValidation) => void) | null>,
    libererLeMoteur: () => Promise<void>,
): (username: string, password: string) => Promise<ResultatValidation> {
    return useCallback((username: string, password: string) => {
        return new Promise<ResultatValidation>((resolve) => {
            validationRef.current = resolve;
            /*
             * **On ne ferme plus rien avant de valider.** On l'a fait, et la mesure du 2026-08-27 a
             * montre que ca ne marchait pas : fermer la session au CAS laisse le SERVICE garder la
             * sienne, donc le formulaire ne reapparaissait pas et rien n'etait prouve. La preuve est
             * desormais **demandee** par un Blueprint dedie (`renew=true`), en tete de la session.
             *
             * Il reste a liberer le moteur : la session de fond du lancement peut encore courir, et
             * une seule tourne a la fois.
             */
            void libererLeMoteur().finally(() => {
                // Un nouveau login invalide les donnees froides : elles appartiennent au compte
                // precedent. Seulement si la session demarre, sinon on effacerait pour rien.
                // Un geste, la aussi : quelqu'un qui valide ses identifiants ne doit pas etre
                // refuse parce qu'un parcours de fond n'a pas fini.
                if (lancerSession('cold', { username, password }, true)) setColdData(null);
            });
        });
    }, [lancerSession, libererLeMoteur, setColdData, validationRef]);
}

/**
 * Les deux facons de redemander une session, et ce qui les separe.
 *
 * `retrySession` **deduit** le mode de la presence des donnees froides : c'est le bon comportement
 * par defaut, et c'est ce que fait le bouton Reessayer. `rafraichirDossier` le **force** en froid,
 * ce que rien ne permettait — rafraichir une identite perimee, nom change ou annee d'inscription
 * passee, obligeait a se deconnecter et a tout ressaisir (jalon 6-K, docs/defauts-fonctionnels.md).
 *
 * Dans les deux cas les donnees froides ne sont effacees **que si la session demarre**, meme
 * precaution que `validateAndSave` : sinon on les perdrait pour rien.
 */
function useReprises(
    credentials: Identifiants | null,
    coldData: ScolariteColdData | null,
    lancerSession: (mode: 'cold' | 'hot', candidat?: Identifiants | null, remplacer?: boolean) => boolean,
    setColdData: (cold: ScolariteColdData | null) => void,
    rafraichirWidgets: (options?: { readonly force?: boolean }) => Promise<void>,
) {
    /*
     * « Reessayer » ne veut pas dire la meme chose selon ce qu'on a deja.
     *
     * Sans identite lue, il n'y a rien a reprendre : c'est un parcours froid. Avec, l'identite est
     * acquise et ce qui a pu echouer, ce sont les **services** — on les rejoue, tous, sans regarder
     * leur peremption, parce que c'est un geste et qu'un geste doit se voir.
     */
    const retrySession = useCallback(() => {
        if (credentials === null) return;
        if (coldData === null) lancerSession('cold');
        else void rafraichirWidgets({ force: true });
    }, [coldData, credentials, lancerSession, rafraichirWidgets]);

    const rafraichirDossier = useCallback(() => {
        if (credentials === null) return;
        // `remplacer` : c'est un geste, pas une reprise automatique. Sans lui, demander une
        // actualisation pendant le parcours chaud du lancement se faisait refuser sans que l'ecran
        // le dise — le bouton paraissait mort.
        if (lancerSession('cold', null, true)) setColdData(null);
    }, [credentials, lancerSession, setColdData]);

    return { retrySession, rafraichirDossier };
}

/**
 * Les deux reactions du provider a ce qu'une session rapporte : le CAS a accepte, et le run est fini.
 *
 * Sorties du provider pour le garder sous la limite de lignes — meme decoupage que `useReprises` et
 * `useValidation`. Elles ne dependent que de ce qu'on leur passe.
 */
function useReactionsDeSession(
    setEtat: React.Dispatch<React.SetStateAction<EtatSession>>,
    setCredentials: (c: Identifiants | null) => void,
    setColdData: (c: ScolariteColdData | null) => void,
    rafraichirWidgets: (options?: { readonly force?: boolean }) => Promise<void>,
    poserPropositions: (p: PropositionsDossier) => void,
    finirValidation: (r: ResultatValidation) => void,
    rangerAvecIndicateur: () => Promise<void>,
) {
// Le CAS a accepte : on ecrit les identifiants, et seulement eux. L'ecran de connexion peut
// disparaitre des maintenant, la suite se joue derriere l'ecran de progression.
const surLoginReussi = useCallback((candidat: Identifiants | null) => {
    setEtat((precedent) => ({ ...precedent, status: 'scraping' }));
    if (candidat === null) return;
    void SecureStoreService.saveCredentials(candidat.username, candidat.password).then(() => {
        setCredentials(candidat);
    });
    finirValidation({ success: true });
}, [finirValidation]);

// Les champs d'un resultat sont independants : ce qui a ete lu se garde meme si la suite a echoue.
const appliquerResultat = useCallback((resultat: ResultatSession) => {
    if (resultat.cold !== undefined) {
        setColdData(resultat.cold);
        void SecureStoreService.saveColdData(resultat.cold);
        /*
         * **Le dossier lu, on enchaine sur les widgets, et de force.**
         *
         * Le parcours froid vient d'ouvrir une session CAS que `session.persist` garde vivante : les
         * quatre lectures qui suivent la traversent sans redemander un mot de passe, et c'est le
         * moment le moins cher de toute la vie de l'application pour les jouer.
         *
         * `force` parce qu'une valeur en cache appartient au compte **precedent** : quelqu'un qui
         * vient de se connecter, ou de changer de mot de passe, ne doit pas voir le compteur de
         * l'autre. La peremption ne le sait pas ; ce geste, si.
         */
        /*
         * **Puis le certificat de scolarite — APRES les widgets, et pas a cote.**
         *
         * C'est le seul moment ou l'application a une session CAS vivante ET une raison de croire que
         * le dossier a change. Chez un etablissement qui ne declare pas de source — le cas general —
         * l'appel sort immediatement.
         *
         * L'enchainement n'est pas une preference de style : lance en parallele, ce run d'une
         * vingtaine de secondes prenait le moteur **entre deux widgets** et retardait le second
         * d'autant. Mesure sur appareil le 2026-08-29, en meme temps que la collision qui faisait
         * refuser des connexions (voir `MoteurNavigateur`).
         *
         * Ni attendu ni observe : ranger un document n'a rien a dire a l'ecran de connexion, et un
         * portail muet ne doit pas retarder l'arrivee sur le tableau de bord.
         */
        void rafraichirWidgets({ force: true }).then(() => rangerAvecIndicateur());
    }
    // Ni appliquees ni oubliees : c'est la modale qui demande, et l'etudiant qui tranche. Elles
    // sont en revanche **gardees** jusqu'a sa reponse (voir `usePropositions`).
    if (resultat.propositions !== undefined) poserPropositions(resultat.propositions);
    /*
     * **Une validation en attente se solde TOUJOURS a la fin du run.**
     *
     * Elle ne se resolvait jusqu'ici que sur `LOGIN_SUCCESS` ou sur un echec. Depuis que l'`emit`
     * est conditionnel — il n'a lieu que si le CAS a reellement affiche un formulaire — un run qui
     * va au bout **sans** formulaire ne resolvait plus rien : la promesse restait pendante et la
     * reference armee. Le `LOGIN_SUCCESS` d'un run *ulterieur* la resolvait alors, et l'ecran du
     * compte se refermait tout seul au milieu d'un rafraichissement. Mesure sur appareil.
     *
     * Sur le chemin nominal, `surLoginReussi` a deja resolu et remis la reference a `null` :
     * l'appel ci-dessous est alors sans effet. Il ne mord que sur le cas ou le CAS ne s'est pas
     * prononce — et il le solde en **echec**, parce que c'est la verite : sans formulaire, les
     * identifiants saisis n'ont ete verifies par personne, et `surLoginReussi` ne les a donc pas
     * ecrits. Annoncer un succes afficherait « connecte » sur un trousseau vide.
     */
    if (resultat.failure !== undefined) {
        finirValidation({ success: false, error: messageDEchec(resultat.failure) });
    } else {
        finirValidation({ success: false, error: Translator.get('CREDENTIALS_UNVERIFIED') });
    }
    setEtat(etatFinal(resultat));
}, [finirValidation, poserPropositions, rafraichirWidgets, rangerAvecIndicateur]);

    return { surLoginReussi, appliquerResultat };
}

/**
 * Ecrit — ou retire, avec `null` — l'entree de l'etablissement actif dans la table des propositions.
 *
 * Le meme cloisonnement que partout ailleurs dans le trousseau : on ne touche jamais qu'a l'entree
 * de la fac active, sans quoi une proposition acceptee chez l'une effacerait celle qui attendait
 * chez l'autre.
 */
async function ecrireEnAttente(propositions: PropositionsDossier | null): Promise<void> {
    const table = { ...lirePropositionsEnAttente(await SecureStoreService.getPropositions()) };
    const code = getCodeEtablissementActif();

    if (propositions === null) delete table[code];
    else table[code] = propositions;

    await SecureStoreService.savePropositions(table);
}

/**
 * Ce que le dossier a propose, et le geste qui l'oublie.
 *
 * **Elles survivent au redemarrage**, et c'est une correction du 2026-08-24 : les UE a masquer se
 * calculent contre le planning, or le planning d'une universite est vide tout l'ete — exactement la
 * periode ou l'on installe l'application. Sans persistance, une connexion d'ete perdait la
 * proposition definitivement, puisque les lancements suivants sont des parcours **chauds** qui ne
 * relisent pas le dossier.
 *
 * Une entree disparait quand l'etudiant a tranche, accepte ou refuse, et pas avant. Rien d'autre ne
 * la retient : elle est **redecidee** a chaque fois contre le planning et les filtres du moment, donc
 * une proposition qui n'a plus lieu d'etre s'eteint toute seule (`PropositionsDecision`).
 */
function usePropositions() {
    const [propositions, setPropositions] = useState<PropositionsDossier | null>(null);

    /** Poser : en memoire pour l'ecran, au trousseau pour le prochain lancement. */
    const poserPropositions = useCallback((lues: PropositionsDossier) => {
        setPropositions(lues);
        void ecrireEnAttente(lues);
    }, []);

    /** L'etudiant a tranche : l'ecran se tait, et rien n'attend plus. */
    const oublierPropositions = useCallback(() => {
        setPropositions(null);
        void ecrireEnAttente(null);
    }, []);

    return { propositions, setPropositions, poserPropositions, oublierPropositions };
}

/**
 * La promesse de `validateAndSave` en attente, et son solde — une seule fois.
 *
 * Une paire ref + geste, sortie du provider pour la meme raison que ses voisines : lui tenir la
 * discipline (remettre la reference a `null` avant de resoudre) sans qu'il ait a la connaitre.
 */
function useValidationEnAttente() {
    const validationRef = useRef<((resultat: ResultatValidation) => void) | null>(null);

    const finirValidation = useCallback((resultat: ResultatValidation) => {
        const resoudre = validationRef.current;
        validationRef.current = null;
        resoudre?.(resultat);
    }, []);

    return { validationRef, finirValidation };
}

/**
 * L'indicateur du rangement automatique du certificat, et l'encadrement qui le tient.
 *
 * Un hook a part pour une paire etat + geste, comme `usePropositions` : le provider n'a pas a porter
 * la discipline du try/finally, il recoit un `ranger` qui la garantit.
 */
function useCertificat() {
    const [certificatEnCours, setCertificatEnCours] = useState(false);

    const rangerAvecIndicateur = useCallback(async () => {
        // L'indicateur encadre le run, quoi qu'il rende : un `sans-source` le fait a peine
        // clignoter, un vrai rangement le tient les vingt secondes qu'il dure.
        setCertificatEnCours(true);
        try {
            await rangerCertificat();
        } finally {
            setCertificatEnCours(false);
        }
    }, []);

    return { certificatEnCours, rangerAvecIndicateur };
}

const useCredentialsSession = (): CredentialsValue => {
    const [credentials, setCredentials] = useState<Identifiants | null>(null);
    const [credentialsLoaded, setCredentialsLoaded] = useState(false);

    const [sessionMode, setSessionMode] = useState<'cold' | 'hot'>('cold');
    const [coldData, setColdData] = useState<ScolariteColdData | null>(null);
    const { propositions, setPropositions, poserPropositions, oublierPropositions } = usePropositions();
    const [etat, setEtat] = useState<EtatSession>(AU_REPOS);
    const { certificatEnCours, rangerAvecIndicateur } = useCertificat();

    /*
     * Les widgets vivent a cote de la session, pas dedans.
     *
     * `credentials !== null` les arme : sans compte il n'y a rien a lire, et les laisser courir
     * jouerait des Blueprints qui echoueraient sur un formulaire de connexion. `credentialsLoaded`
     * evite en plus la salve du premier rendu, avant que le trousseau ait rendu sa reponse.
     */
    const widgets = useWidgets(credentialsLoaded && credentials !== null);

    /** La session en cours : son controleur d'annulation, ou `null`. Aussi le verrou de non-reentrance. */
    const sessionRef = useRef<AbortController | null>(null);
    /**
     * La session **en vol**, pour que la suivante puisse attendre qu'elle ait rendu le moteur.
     *
     * Distincte de `sessionRef`, qui dit *laquelle est la courante* : celle-ci dit *quand la
     * precedente aura fini de mourir*. Les deux sont necessaires, et les confondre ferait attendre
     * une session qu'on n'a pas annulee.
     */
    const sessionEnVolRef = useRef<Promise<unknown> | null>(null);
    const { validationRef, finirValidation } = useValidationEnAttente();

    /**
     * Demarre une session, ou la refuse : une seule a la fois (voir l'en-tete du module).
     *
     * Rend `false` quand elle a refuse, pour que l'appelant n'aille pas defaire un etat au nom d'une
     * session qui n'a jamais commence.
     */
    const { surLoginReussi, appliquerResultat } = useReactionsDeSession(
        setEtat, setCredentials, setColdData, widgets.rafraichir, poserPropositions, finirValidation,
        rangerAvecIndicateur,
    );

    /**
     * Liberer le moteur avant un geste qui doit **absolument** pouvoir jouer un Blueprint.
     *
     * `fermerSessionDistante` appelle le moteur directement, sans passer par le verrou de
     * `ScolariteSession` — donc sans etre mise en file, mais aussi sans etre protegee : lancee
     * pendant un run, elle est refusee par le moteur et **avale son echec**. La session CAS restait
     * alors ouverte, le parcours suivant ne voyait aucun formulaire, et la validation se soldait en
     * « impossible de verifier tes identifiants » sur des identifiants pourtant justes.
     */
    const libererLeMoteur = useCallback(async () => {
        sessionRef.current?.abort();
        sessionRef.current = null;
        const enVol = sessionEnVolRef.current;
        if (enVol !== null) await enVol.catch(() => undefined);
    }, []);

    const lancerSession = useCallback((
        mode: 'cold' | 'hot',
        candidat: Identifiants | null = null,
        remplacer = false,
    ): boolean => {
        if (sessionRef.current !== null) {
            /*
             * **Une demande explicite gagne sur une session de fond.**
             *
             * Le refus sec etait juste tant que toutes les sessions se valaient : deux runs a la fois
             * sont impossibles, et une file cacherait la seconde derriere un delai inexplique. Mais
             * il traitait de la meme facon deux choses differentes — un double appui accidentel, et
             * quelqu'un qui demande « actualise mon dossier » pendant que le parcours chaud du
             * lancement tourne encore. Le second se faisait refuser **en silence a l'ecran**, avec
             * pour seule trace un avertissement dans le terminal.
             *
             * Une demande portee par un geste passe donc devant. Le refus reste pour tout le reste.
             */
            if (!remplacer) {
                console.warn('[scolarite] session deja en cours : la seconde demande est refusee');
                finirValidation({ success: false, error: Translator.get('ERROR_INTERNAL') });
                return false;
            }
            sessionRef.current.abort();
            // Remise a `null` **synchrone** : le `finally` du run remplace ne s'executera qu'au tour
            // suivant, et sa garde `=== controleur` l'empechera d'effacer la session qui arrive.
            sessionRef.current = null;
        }

        const controleur = new AbortController();
        sessionRef.current = controleur;

        setSessionMode(mode);
        setEtat({ status: 'connecting', progress: 'connecting', failure: null });

        /*
         * **On attend que la precedente ait relache le moteur.**
         *
         * Annuler ne libere pas immediatement : l'abandon se propage au run, dont le `finally` rend
         * le verrou d'`ScolariteSession` au tour suivant. Repartir aussitot faisait donc refuser la
         * nouvelle session par ce verrou-la — celui du moteur, pas celui de l'application — et le
         * symptome etait deroutant : une connexion qui allait au bout sans jamais voir de formulaire,
         * donc sans preuve, donc soldee en « impossible de verifier tes identifiants ».
         *
         * Ce n'est **pas** la file d'attente que le module refuse : on ne met pas deux demandes
         * concurrentes en attente l'une de l'autre, on laisse celle qu'on vient d'annuler finir de
         * mourir. La distinction est ce qui garde la regle « une seule session a la fois » intacte.
         */
        const precedente = sessionEnVolRef.current;
        const demarrer = async () => {
            if (precedente !== null) await precedente.catch(() => undefined);
            return deroulerSession(mode, {
                onEtape: (etape) => setEtat((precedent) => ({ ...precedent, progress: etape })),
                onLoginSuccess: () => surLoginReussi(candidat),
                signal: controleur.signal,
                ...(candidat !== null
                    ? { secrets: { portail_user: candidat.username, portail_pass: candidat.password } }
                    : {}),
            });
        };

        sessionEnVolRef.current = demarrer()
            .then((resultat) => {
                // Une session annulee n'ecrit rien. Le cas qui l'impose n'est pas theorique : une
                // deconnexion pendant la session remettrait dans le trousseau l'identite que
                // `logout` vient d'effacer.
                if (controleur.signal.aborted) {
                    setEtat(AU_REPOS);
                    return;
                }
                appliquerResultat(resultat);
            })
            .finally(() => {
                const etaitCourante = sessionRef.current === controleur;
                if (etaitCourante) sessionRef.current = null;
                /*
                 * Un run annule laisse une promesse de validation en attente : la resoudre ici evite
                 * qu'un ecran de connexion reste bloque sur son indicateur.
                 *
                 * **Mais seulement si ce run est encore celui qui court.** Un run *remplace* par une
                 * demande explicite se terminerait sinon en soldant la promesse de celui qui l'a
                 * remplace — l'ecran afficherait une erreur reseau sur une session qui se deroule
                 * parfaitement.
                 */
                if (etaitCourante) {
                    finirValidation({ success: false, error: Translator.get('LOGIN_NETWORK_ERROR') });
                }
            });

        return true;
    }, [appliquerResultat, finirValidation, surLoginReussi]);

    const poserTrousseau = useCallback((session: SessionDuTrousseau) => {
        setCredentials(session.credentials);
        setCredentialsLoaded(true);
        if (session.cold !== null) setColdData(session.cold);
        // `setPropositions` et non `poserPropositions` : elles **viennent** du trousseau, les
        // reecrire ne ferait que recopier ce qu'on vient de lire.
        setPropositions(session.enAttente);
    }, [setPropositions]);

    useChargementInitial(lancerSession, poserTrousseau);

    const { retrySession, rafraichirDossier } = useReprises(
        credentials, coldData, lancerSession, setColdData, widgets.rafraichir,
    );

    useCycleDeVieSession(sessionRef, retrySession);

    const validateAndSave = useValidation(lancerSession, setColdData, validationRef, libererLeMoteur);

    /** Tout oublier, sans toucher au magasin : la deconnexion et la bascule d'etablissement le partagent. */
    const oublier = useCallback(() => {
        setCredentials(null);
        setColdData(null);
        // L'etat seul : la table du trousseau appartient a `logout`, qui l'efface, et a la bascule
        // d'etablissement, qui doit au contraire la laisser intacte pour la fac qu'on quitte. Les
        // widgets suivent exactement la meme regle.
        widgets.reinitialiser();
        setPropositions(null);
        setEtat(AU_REPOS);
    }, [setPropositions, widgets]);

    const logout = useDeconnexion(sessionRef, oublier);
    useBasculerAuChangementDEtablissement(sessionRef, oublier, lancerSession, poserTrousseau);

    return {
        credentials, credentialsLoaded, coldData, widgets, certificatEnCours, sessionMode,
        scrapeStatus: etat.status, scrapeProgress: etat.progress, sessionFailure: etat.failure,
        // `portailPublie()` et non `portailDisponible(role)` : la question est « y a-t-il quelque chose
        // derriere quoi s'authentifier », pas « ce nom est-il jouable ». Une ligne de catalogue mal
        // ecrite laisse donc le formulaire visible et fait dire le probleme par la session, ce qui est
        // le bon endroit — le masquer ferait disparaitre l'onglet sans que personne sache pourquoi.
        portailDisponible: portailPublie(),
        propositions, oublierPropositions, validateAndSave, retrySession, rafraichirDossier, logout,
    };
};

export const CredentialsProvider = ({ children }: { children: React.ReactNode }) => {
    const value = useCredentialsSession();

    return (
        <CredentialsContext.Provider value={value}>
            {children}
        </CredentialsContext.Provider>
    );
};

export default CredentialsContext;

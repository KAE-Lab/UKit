import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import SecureStoreService from '../../../shared/services/SecureStoreService';
import { SettingsManager } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import type { UkitFailure } from '../../../shared/aetherius';
import { cleDeMessage, type ScolariteColdData, type ScolariteMailData } from './ScolariteMapping';
import {
    deroulerSession,
    portailDisponible,
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
    readonly mailData: ScolariteMailData | null;
    readonly scrapeStatus: ScrapeStatus;
    readonly scrapeProgress: EtapeSession | null;
    readonly sessionMode: 'cold' | 'hot';
    /** Le dernier echec de session, deja traduit en decision d'ecran. `null` si tout va bien. */
    readonly sessionFailure: UkitFailure | null;
    /**
     * L'etablissement selectionne publie-t-il une messagerie extractible ?
     *
     * `false` fait **disparaitre** la ligne de messagerie, il ne la met pas en erreur : chez une fac
     * dont le webmail passe par une authentification que l'application ne sait pas jouer, il n'y a
     * rien qui echoue — il n'y a rien a montrer. Afficher une panne permanente pour un service qui
     * n'existe pas serait un mensonge affiche a chaque lancement.
     */
    readonly messagerieDisponible: boolean;
    readonly validateAndSave: (username: string, password: string) => Promise<ResultatValidation>;
    readonly retrySession: () => void;
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
 * Le premier chargement : ce que le trousseau porte, puis la session qui va avec.
 *
 * Le parcours se deduit des donnees froides — deja la, parcours chaud ; absentes, parcours froid.
 * C'est ce qui evite de relire trois pages lourdes a chaque lancement.
 */
function useChargementInitial(
    lancerSession: (mode: 'cold' | 'hot') => void,
    poser: (creds: Identifiants | null, cold: ScolariteColdData | null) => void,
): void {
    useEffect(() => {
        let monte = true;
        void Promise.all([
            SecureStoreService.getCredentials(),
            SecureStoreService.getColdData(),
        ]).then(([creds, cold]) => {
            if (!monte) return;
            poser(creds, (cold as ScolariteColdData | null) ?? null);
            if (creds) lancerSession(cold ? 'hot' : 'cold');
        });
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
        oublier();
    }, [oublier, sessionRef]);
}

/**
 * Changer d'etablissement deconnecte, y compris de ce que ce contexte garde en memoire.
 *
 * `changerEtablissement` vide bien le trousseau, mais ce provider est monte **au-dessus de toute la
 * pile** : il ne se demonte pas, et son etat survivait donc a la bascule. Le symptome mesure sur
 * appareil (jalon 6-G) : apres un retour a Bordeaux, l'onglet affichait encore le prenom de
 * l'etudiant de l'autre universite, avec un trousseau pourtant vide — la pire forme du defaut que
 * cette phase supprime, une donnee fausse qui a l'air juste.
 *
 * On n'efface **que la memoire** : le magasin, lui, a deja ete vide par la purge, et le refaire ici
 * ferait dependre la correction de l'ordre des abonnements.
 */
function useOublierAuChangementDEtablissement(
    sessionRef: React.RefObject<AbortController | null>,
    oublier: () => void,
): void {
    const oublierRef = useRef(oublier);
    oublierRef.current = oublier;

    useEffect(() => {
        const surChangement = () => {
            sessionRef.current?.abort();
            oublierRef.current();
        };
        SettingsManager.on('etablissement', surChangement);
        return () => SettingsManager.unsubscribe('etablissement', surChangement);
    }, [sessionRef]);
}

const useCredentialsSession = (): CredentialsValue => {
    const [credentials, setCredentials] = useState<Identifiants | null>(null);
    const [credentialsLoaded, setCredentialsLoaded] = useState(false);

    const [sessionMode, setSessionMode] = useState<'cold' | 'hot'>('cold');
    const [coldData, setColdData] = useState<ScolariteColdData | null>(null);
    const [mailData, setMailData] = useState<ScolariteMailData | null>(null);
    const [etat, setEtat] = useState<EtatSession>(AU_REPOS);

    /** La session en cours : son controleur d'annulation, ou `null`. Aussi le verrou de non-reentrance. */
    const sessionRef = useRef<AbortController | null>(null);
    const validationRef = useRef<((resultat: ResultatValidation) => void) | null>(null);

    /** Resout la promesse de `validateAndSave`, une seule fois. */
    const finirValidation = useCallback((resultat: ResultatValidation) => {
        const resoudre = validationRef.current;
        validationRef.current = null;
        resoudre?.(resultat);
    }, []);

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

    // Les trois champs d'un resultat sont independants : un dossier lu se garde meme si la
    // messagerie a echoue ensuite. Deux Blueprints, deux sorts.
    const appliquerResultat = useCallback((resultat: ResultatSession) => {
        if (resultat.cold !== undefined) {
            setColdData(resultat.cold);
            void SecureStoreService.saveColdData(resultat.cold);
        }
        if (resultat.mail !== undefined) setMailData(resultat.mail);
        if (resultat.failure !== undefined) {
            finirValidation({ success: false, error: messageDEchec(resultat.failure) });
        }
        setEtat(etatFinal(resultat));
    }, [finirValidation]);

    /**
     * Demarre une session, ou la refuse : une seule a la fois (voir l'en-tete du module).
     *
     * Rend `false` quand elle a refuse, pour que l'appelant n'aille pas defaire un etat au nom d'une
     * session qui n'a jamais commence.
     */
    const lancerSession = useCallback((mode: 'cold' | 'hot', candidat: Identifiants | null = null): boolean => {
        if (sessionRef.current !== null) {
            console.warn('[scolarite] session deja en cours : la seconde demande est refusee');
            finirValidation({ success: false, error: Translator.get('ERROR_INTERNAL') });
            return false;
        }

        const controleur = new AbortController();
        sessionRef.current = controleur;

        setSessionMode(mode);
        setMailData(null);
        setEtat({ status: 'connecting', progress: mode === 'cold' ? 'connecting' : 'mailbox', failure: null });

        void deroulerSession(mode, {
            onEtape: (etape) => setEtat((precedent) => ({ ...precedent, progress: etape })),
            onLoginSuccess: () => surLoginReussi(candidat),
            signal: controleur.signal,
            ...(candidat !== null
                ? { secrets: { portail_user: candidat.username, portail_pass: candidat.password } }
                : {}),
        })
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
                if (sessionRef.current === controleur) sessionRef.current = null;
                // Un run annule laisse une promesse de validation en attente : la resoudre ici evite
                // qu'un ecran de connexion reste bloque sur son indicateur.
                finirValidation({ success: false, error: Translator.get('LOGIN_NETWORK_ERROR') });
            });

        return true;
    }, [appliquerResultat, finirValidation, surLoginReussi]);

    const poserTrousseau = useCallback((creds: Identifiants | null, cold: ScolariteColdData | null) => {
        setCredentials(creds);
        setCredentialsLoaded(true);
        if (cold !== null) setColdData(cold);
    }, []);

    useChargementInitial(lancerSession, poserTrousseau);

    const retrySession = useCallback(() => {
        if (credentials === null) return;
        lancerSession(coldData === null ? 'cold' : 'hot');
    }, [coldData, credentials, lancerSession]);

    useCycleDeVieSession(sessionRef, retrySession);

    const validateAndSave = useCallback((username: string, password: string) => {
        return new Promise<ResultatValidation>((resolve) => {
            validationRef.current = resolve;
            // Un nouveau login invalide les donnees froides : elles appartiennent au compte
            // precedent. Seulement si la session demarre, sinon on effacerait pour rien.
            if (lancerSession('cold', { username, password })) setColdData(null);
        });
    }, [lancerSession]);

    /** Tout oublier, sans toucher au magasin : la deconnexion et la bascule d'etablissement le partagent. */
    const oublier = useCallback(() => {
        setCredentials(null);
        setColdData(null);
        setMailData(null);
        setEtat(AU_REPOS);
    }, []);

    const logout = useDeconnexion(sessionRef, oublier);
    useOublierAuChangementDEtablissement(sessionRef, oublier);

    return {
        credentials, credentialsLoaded, coldData, mailData, sessionMode,
        scrapeStatus: etat.status,
        scrapeProgress: etat.progress,
        sessionFailure: etat.failure,
        // Lu a chaque rendu plutot que memorise : le catalogue peut changer sous l'application — un
        // rafraichissement au retour au premier plan, ou une bascule d'etablissement — et une valeur
        // figee au montage ferait survivre une ligne de messagerie a l'universite qui la portait.
        messagerieDisponible: portailDisponible('messagerie'),
        validateAndSave, retrySession, logout,
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

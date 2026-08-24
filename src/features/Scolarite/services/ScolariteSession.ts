/**
 * La session universitaire, jouee par le moteur embarque.
 *
 * Ce module remplace `ScolariteWebSession.tsx` : 323 lignes de WebView cachee pilotee par du
 * JavaScript en gabarits de chaine, quatre scripts declenches selon l'URL de fin de chargement, une
 * machine a etats de phases et trois `MutationObserver` recopies. Il ne reste ici que ce que le
 * moteur ne peut pas savoir : quel Blueprint jouer, quand, et ce que l'application fait du resultat.
 *
 * **Deux Blueprints, pas un**, parce que l'application distingue deja deux parcours :
 *
 *   - froid (premier login)   : le dossier, puis la messagerie ;
 *   - chaud (lancements suivants) : la messagerie seule.
 *
 * Chacun ouvre son service, qui rebondit lui-meme sur l'authentification unifiee. Une panne de l'un
 * n'emporte donc pas l'autre.
 *
 * **Les noms viennent du catalogue** depuis le jalon 6-G, plus de constantes : ils sont propres a
 * l'etablissement (`ukit.portail.bordeaux.dossier`), et un etablissement ajoute a distance apporte
 * les siens. Un champ a `null` n'est pas une panne mais un **service absent** — une fac dont le
 * webmail n'est pas extractible est un cas normal, et l'ecran n'affiche alors pas la carte.
 *
 * Voir docs/features/scolarite.md, docs/phase-6/6-f-scolarite.md et docs/phase-6/6-g-etablissements.md.
 */

import { getEtablissementActif } from '../../../shared/etablissements';
import {
    estNomDePortail,
    reportFailure,
    runBlueprint,
    serviceAbsent,
    ukitFailure,
    type RunBlueprintOptions,
    type RunnableBlueprintName,
    type UkitFailure,
} from '../../../shared/aetherius';
import {
    natureDeSortie,
    tracerLectureDossier,
} from '../../../shared/services/PropositionsTrace';
import { projeterPropositions, type PropositionsDossier } from './PropositionsDossier';
import {
    projeterDossier,
    projeterMessagerie,
    type ScolariteColdData,
    type ScolariteMailData,
} from './ScolariteMapping';

/** Les quatre etapes que l'ecran de progression affiche, inchangees depuis toujours. */
export type EtapeSession = 'connecting' | 'profile' | 'dossier' | 'mailbox';

export type DossierResultat =
    | { readonly ok: true; readonly cold: ScolariteColdData; readonly propositions: PropositionsDossier }
    | { readonly ok: false; readonly failure: UkitFailure };

export type MessagerieResultat =
    | { readonly ok: true; readonly mail: ScolariteMailData }
    | { readonly ok: false; readonly failure: UkitFailure };

export interface OptionsSession {
    /**
     * Le couple a valider, quand il n'est pas encore dans le trousseau.
     *
     * Absent sur le chemin nominal : le Blueprint declare ses secrets et le resolver les fournit.
     * Voir `RunBlueprintOptions.secrets`.
     */
    readonly secrets?: Readonly<Record<string, string>>;
    /** L'avancement, tel que l'ecran de progression le montre. */
    readonly onEtape?: (etape: EtapeSession) => void;
    /** Le CAS a accepte les identifiants. C'est ce qui autorise a les ecrire. */
    readonly onLoginSuccess?: () => void;
    readonly signal?: RunBlueprintOptions['signal'];
}

/**
 * Le nom du Blueprint d'un role, pour l'etablissement selectionne — ou `null` si le service n'existe
 * pas chez lui.
 *
 * Le nom **doit** etre sous le prefixe reserve. La verification est ici plutot qu'a la construction du
 * registre parce que la ligne vient de la base : un catalogue mal rempli nommerait un Blueprint que
 * le registre refuserait d'ajouter, et l'echec arriverait au milieu d'un parcours d'authentification,
 * la ou il serait illisible. Le refuser tot le rend explicable.
 */
function nomDuPortail(role: 'dossier' | 'messagerie'): RunnableBlueprintName | null {
    const etablissement = getEtablissementActif();
    const nom = role === 'dossier' ? etablissement.portailDossier : etablissement.portailMessagerie;

    if (nom === null) return null;
    if (!estNomDePortail(nom)) {
        console.warn(`[scolarite] ${etablissement.code} : '${nom}' n est pas sous le prefixe reserve, ignore`);
        return null;
    }
    return nom;
}

/** Ce role est-il servi par l'etablissement selectionne ? Ce que les ecrans lisent pour se taire. */
export function portailDisponible(role: 'dossier' | 'messagerie'): boolean {
    return nomDuPortail(role) !== null;
}

/**
 * L'echec d'un service que l'etablissement ne publie pas.
 *
 * `config` et non `unavailable` : rien n'est en panne, et proposer de reessayer serait faux. Le code
 * nomme le cas pour que l'ecran dise « cet etablissement n'est pas relie » plutot que « le portail ne
 * repond pas » — deux phrases qui appellent deux gestes opposes de la part de l'etudiant.
 */
export function portailAbsent(role: string = 'portail'): UkitFailure {
    return serviceAbsent(
        'ERROR_PORTAL_UNAVAILABLE',
        'PORTAIL_ABSENT',
        `l etablissement ne publie pas de ${role}`,
        'ERROR_PORTAL_UNAVAILABLE_TITLE',
    );
}

/**
 * Le Blueprint navigateur en cours, ou `null`.
 *
 * Il y a **une** WebView montee, donc **un** run Act II a la fois : le moteur refuse le second par
 * une `DependencyError`, et il a raison — deux runs concurrents remonteraient la vue l'un sous
 * l'autre, et la panne ressemblerait a un portail capricieux plutot qu'a une erreur de
 * programmation. Ce verrou refuse **avant** de toucher au moteur, pour que le refus porte un
 * message qui nomme le conflit plutot qu'une piece de plateforme absente.
 *
 * Deuxieme ceinture volontaire : l'appelant en a une aussi (CredentialsContext ne lance jamais deux
 * sessions). Celle-ci attrape ce que l'autre laisserait passer.
 */
let enCours: RunnableBlueprintName | null = null;

/** Le flux d'evenements du run, traduit en etapes d'ecran. */
function suivreProgression(
    depart: EtapeSession,
    options: OptionsSession,
): RunBlueprintOptions['onEvent'] {
    options.onEtape?.(depart);

    return (evenement) => {
        // Le Blueprint emet `LOGIN_SUCCESS` des que l'authentification a abouti : c'est le seul
        // evenement que l'application interprete par son nom, et c'est ce qui remplace le message
        // du meme nom que la WebView postait a la main.
        if (evenement.type === 'progress' && evenement.message === 'LOGIN_SUCCESS') {
            options.onLoginSuccess?.();
            options.onEtape?.('profile');
            return;
        }
        // Seuls les steps nommes portent un `step_id` : celui de la lecture du dossier est le seul
        // qui interesse un ecran.
        if (evenement.type === 'step_started' && evenement.step_id === 'dossier') {
            options.onEtape?.('dossier');
        }
    };
}

async function jouer(
    nom: RunnableBlueprintName,
    depart: EtapeSession,
    options: OptionsSession,
): Promise<{ ok: true; outputs: Readonly<Record<string, unknown>> } | { ok: false; failure: UkitFailure }> {
    if (enCours !== null) {
        const failure = ukitFailure(
            'unsupported',
            `un run navigateur est deja en cours (${enCours}) : ${nom} est refuse, pas mis en file`,
        );
        reportFailure(nom, failure);
        return { ok: false, failure };
    }

    enCours = nom;
    try {
        const run = await runBlueprint(nom, {
            ...(options.secrets !== undefined ? { secrets: options.secrets } : {}),
            ...(options.signal !== undefined ? { signal: options.signal } : {}),
            onEvent: suivreProgression(depart, options),
        });

        if (run.ok === false) {
            reportFailure(nom, run.failure);
            return { ok: false, failure: run.failure };
        }
        return { ok: true, outputs: run.outputs };
    } finally {
        enCours = null;
    }
}

/**
 * Le parcours froid : l'identite complete, lue dans le dossier administratif.
 *
 * La lecture du prenom sur l'ENT a disparu avec la page qui la portait — le parcours part du
 * service, pas du portail. Le dossier porte l'identite complete, c'est de la qu'elle vient
 * desormais.
 */
export async function jouerDossier(options: OptionsSession = {}): Promise<DossierResultat> {
    const nom = nomDuPortail('dossier');
    if (nom === null) return { ok: false, failure: portailAbsent('dossier administratif') };

    const run = await jouer(nom, 'connecting', options);
    if (run.ok === false) return { ok: false, failure: run.failure };

    const propositions = projeterPropositions(run.outputs);
    // La trace de la lecture, **avant** toute decision. Sans elle, une proposition absente ne dit pas
    // si le run n'a rien rendu ou si l'ecran n'en a rien fait — deux causes, deux remedes
    // (shared/services/PropositionsTrace.ts).
    tracerLectureDossier({
        heure: new Date().toLocaleTimeString(),
        blueprint: nom,
        sorties: Object.entries(run.outputs).map(([cle, valeur]) => `${cle}: ${natureDeSortie(valeur)}`),
        uesInscrites: propositions.ues,
        edtLu: propositions.edt === null
            ? null
            : `${propositions.edt.libelle} (${propositions.edt.ressource})`,
    });
    console.log(
        `[propositions] dossier lu : ${propositions.ues.length} UE inscrite(s), ` +
        `edt ${propositions.edt === null ? 'absent' : propositions.edt.ressource}`,
    );

    return { ok: true, cold: projeterDossier(run.outputs), propositions };
}

/** Le parcours chaud : le compteur de messages non lus, seul. */
export async function jouerMessagerie(options: OptionsSession = {}): Promise<MessagerieResultat> {
    const nom = nomDuPortail('messagerie');
    if (nom === null) return { ok: false, failure: portailAbsent('messagerie') };

    const run = await jouer(nom, 'mailbox', options);
    if (run.ok === false) return { ok: false, failure: run.failure };
    return { ok: true, mail: projeterMessagerie(run.outputs) };
}

/** Ce qu'une session complete a obtenu. Les champs sont independants. */
export interface ResultatSession {
    readonly cold?: ScolariteColdData;
    readonly mail?: ScolariteMailData;
    /**
     * Ce que le dossier a livre **en plus** de l'identite, et qu'un ecran proposera d'appliquer.
     *
     * Present seulement apres un parcours froid : c'est la lecture du dossier qui les porte. Rien ne
     * s'applique ici — la session lit, l'ecran demande, l'utilisateur decide.
     */
    readonly propositions?: PropositionsDossier;
    /** Le premier echec rencontre. Il n'annule pas ce qui a ete obtenu avant lui. */
    readonly failure?: UkitFailure;
}

/**
 * La sequence d'une session, de bout en bout.
 *
 * Elle vit ici plutot que dans le contexte parce que **c'est la definition d'une session** : quels
 * Blueprints, dans quel ordre, et ce qu'on garde de chacun. Le contexte, lui, decide de ce que
 * l'application en fait — ecrire dans le trousseau, changer d'ecran.
 *
 * Un echec de la messagerie **n'annule pas** le dossier deja lu : les deux champs reviennent
 * ensemble, et l'appelant ecrit ce qu'il a. C'est le pendant de « deux Blueprints, pas un » — une
 * panne de l'un n'emporte pas l'autre, y compris quand ils sont joues a la suite.
 *
 * Un service que l'etablissement ne publie pas est **saute**, pas echoue : une fac sans messagerie
 * extractible doit donner une session complete et un tableau de bord sans ligne de messagerie, pas
 * une erreur a chaque lancement. Le seul cas qui echoue est celui ou l'etablissement ne publie
 * **rien** — il n'y a alors pas de session a derouler, et le dire est le bon comportement.
 */
export async function deroulerSession(
    mode: 'cold' | 'hot',
    options: OptionsSession = {},
): Promise<ResultatSession> {
    const dossierPublie = portailDisponible('dossier');
    const messageriePubliee = portailDisponible('messagerie');

    if (!dossierPublie && !messageriePubliee) {
        return { failure: portailAbsent('portail') };
    }

    let cold: ScolariteColdData | undefined;
    let propositions: PropositionsDossier | undefined;

    if (mode === 'cold' && dossierPublie) {
        const dossier = await jouerDossier(options);
        if (dossier.ok === false) return { failure: dossier.failure };
        cold = dossier.cold;
        propositions = dossier.propositions;
    }

    const acquis = {
        ...(cold !== undefined ? { cold } : {}),
        ...(propositions !== undefined ? { propositions } : {}),
    };

    if (!messageriePubliee) {
        return acquis;
    }

    // En froid, le login a deja abouti au run precedent : le re-signaler ferait reecrire les
    // identifiants et ramenerait l'ecran de progression a l'etape « profil ». En chaud — ou quand
    // l'etablissement n'a pas de dossier a lire —, ce run **est** l'authentification, et l'evenement
    // compte : sans lui, les identifiants ne seraient jamais ecrits.
    const messagerie = await jouerMessagerie(
        mode === 'cold' && cold !== undefined ? { ...options, onLoginSuccess: undefined } : options,
    );
    if (messagerie.ok === false) {
        return { ...acquis, failure: messagerie.failure };
    }

    return { ...acquis, mail: messagerie.mail };
}

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
 *   - froid (premier login)   : `ukit.scolarite.dossier`, puis `ukit.scolarite.messagerie` ;
 *   - chaud (lancements suivants) : `ukit.scolarite.messagerie` seul.
 *
 * Chacun ouvre son service, qui rebondit lui-meme sur l'authentification unifiee. Une panne de l'un
 * n'emporte donc pas l'autre.
 *
 * Voir docs/features/scolarite.md et docs/phase-6/6-f-scolarite.md.
 */

import {
    BLUEPRINT,
    reportFailure,
    runBlueprint,
    ukitFailure,
    type BlueprintName,
    type RunBlueprintOptions,
    type UkitFailure,
} from '../../../shared/aetherius';
import {
    projeterDossier,
    projeterMessagerie,
    type ScolariteColdData,
    type ScolariteMailData,
} from './ScolariteMapping';

/** Les quatre etapes que l'ecran de progression affiche, inchangees depuis toujours. */
export type EtapeSession = 'connecting' | 'profile' | 'dossier' | 'mailbox';

export type DossierResultat =
    | { readonly ok: true; readonly cold: ScolariteColdData }
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
let enCours: BlueprintName | null = null;

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
    nom: BlueprintName,
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
    const run = await jouer(BLUEPRINT.SCOLARITE_DOSSIER, 'connecting', options);
    if (run.ok === false) return { ok: false, failure: run.failure };
    return { ok: true, cold: projeterDossier(run.outputs) };
}

/** Le parcours chaud : le compteur de messages non lus, seul. */
export async function jouerMessagerie(options: OptionsSession = {}): Promise<MessagerieResultat> {
    const run = await jouer(BLUEPRINT.SCOLARITE_MESSAGERIE, 'mailbox', options);
    if (run.ok === false) return { ok: false, failure: run.failure };
    return { ok: true, mail: projeterMessagerie(run.outputs) };
}

/** Ce qu'une session complete a obtenu. Les trois champs sont independants. */
export interface ResultatSession {
    readonly cold?: ScolariteColdData;
    readonly mail?: ScolariteMailData;
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
 */
export async function deroulerSession(
    mode: 'cold' | 'hot',
    options: OptionsSession = {},
): Promise<ResultatSession> {
    let cold: ScolariteColdData | undefined;

    if (mode === 'cold') {
        const dossier = await jouerDossier(options);
        if (dossier.ok === false) return { failure: dossier.failure };
        cold = dossier.cold;
    }

    // En froid, le login a deja abouti au run precedent : le re-signaler ferait reecrire les
    // identifiants et ramenerait l'ecran de progression a l'etape « profil ». En chaud, ce run
    // **est** l'authentification, et l'evenement compte.
    const messagerie = await jouerMessagerie(
        mode === 'cold' ? { ...options, onLoginSuccess: undefined } : options,
    );
    if (messagerie.ok === false) {
        return { ...(cold !== undefined ? { cold } : {}), failure: messagerie.failure };
    }

    return { ...(cold !== undefined ? { cold } : {}), mail: messagerie.mail };
}

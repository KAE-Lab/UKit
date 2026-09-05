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

import { getEtablissementActif, portailPublie, serviceEtablissement } from '../../../shared/etablissements';
import { BLUEPRINT } from '../../../../blueprints';
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
import { maintenant } from '../../../shared/services/Temps';
import { surLeNavigateur, TOURS_DE_SESSION } from './MoteurNavigateur';
import { projeterPropositions, type PropositionsDossier } from './PropositionsDossier';
import { projeterDossier, type ScolariteColdData } from './ScolariteMapping';

/**
 * Les trois etapes que l'ecran de progression affiche.
 *
 * Il y en avait quatre : `mailbox` fermait le parcours. Elle a disparu avec la lecture qu'elle
 * nommait — la messagerie est devenue un widget, rafraichi a part et affiche dans la page plutot
 * qu'avant elle.
 */
export type EtapeSession = 'connecting' | 'profile' | 'dossier';

export type DossierResultat =
    | { readonly ok: true; readonly cold: ScolariteColdData; readonly propositions: PropositionsDossier }
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
    /** Les entrees du Blueprint, quand il en declare — la verification prend le CAS et son service. */
    readonly inputs?: Readonly<Record<string, unknown>>;
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
    // `priorite: 'session'` : un geste de l'utilisateur prend la main sur les lectures d'arriere-plan,
    // qui sont abandonnees. Il n'est refuse que par **une autre session** — deux sessions concurrentes
    // restent une erreur de programmation, et doivent rester bruyantes. Ce n'etait pas le cas avant le
    // 2026-08-29 : un widget en cours suffisait a refuser une connexion (voir `MoteurNavigateur`).
    const reserve = await surLeNavigateur(nom, (signal) => runBlueprint(nom, {
        ...(options.inputs !== undefined ? { inputs: options.inputs } : {}),
        ...(options.secrets !== undefined ? { secrets: options.secrets } : {}),
        signal,
        onEvent: suivreProgression(depart, options),
    }), {
        priorite: 'session',
        ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });

    if (reserve.ok === false) {
        const failure = ukitFailure(
            'unsupported',
            `un run navigateur est deja en cours (${reserve.occupePar}) : ${nom} est refuse, pas mis en file`,
        );
        reportFailure(nom, failure);
        return { ok: false, failure };
    }

    const run = reserve.valeur;
    if (run.ok === false) {
        reportFailure(nom, run.failure);
        return { ok: false, failure: run.failure };
    }
    return { ok: true, outputs: run.outputs };
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

    // L'horodatage se pose ICI et non dans la projection : celle-ci ne doit connaitre ni
    // l'heure ni la plateforme, c'est ce qui la rend rejouable sous vitest.
    return { ok: true, cold: projeterDossier(run.outputs, maintenant().toISOString()), propositions };
}

/**
 * Ce que la fermeture distante a reellement fait.
 *
 * Quatre issues et non un booleen : la distinction qui manquait est entre « le portail n'a pas
 * repondu » (`echec`, acceptable) et « on n'a meme pas essaye » (`moteur-occupe`, inacceptable).
 */
export type IssueDeFermeture = 'fermee' | 'sans-cas' | 'moteur-occupe' | 'echec';

/**
 * Ferme la session CAS **cote serveur**, en sortie de deconnexion.
 *
 * C'est le pendant obligatoire de `options.session.persist`, que les parcours de portail declarent
 * depuis le 2026-08-25 pour que le navigateur integre s'ouvre deja authentifie. Sans lui, « se
 * deconnecter » effacerait le trousseau **en laissant un navigateur connecte** au compte qu'on vient
 * de retirer : le cookie de ticket survivrait au geste qui pretend tout effacer.
 *
 * Viser le CAS plutot que supprimer un cookie local n'est pas un detour : le serveur invalide le
 * ticket pour de bon, la ou une suppression locale laisse une session vivante que n'importe quel
 * autre client pourrait reprendre. Et ca ne coute aucune dependance de plus.
 *
 * **Ne leve jamais.** Une deconnexion locale reussie avec une session distante encore ouverte vaut
 * mieux qu'un bouton « Se deconnecter » qui refuse de marcher parce que le portail ne repond pas —
 * l'inverse laisserait quelqu'un coince dans un compte dont il veut sortir.
 *
 * **Mais elle dit ce qu'elle n'a pas fait**, et c'est le correctif du 2026-09-04. Elle jetait le
 * resultat de sa reservation : « le portail n'a pas repondu » — acceptable — et « on n'a meme pas
 * essaye » — inacceptable, le ticket CAS restant valide cote serveur — etaient **indiscernables**, et
 * le second s'est produit chaque fois qu'un widget tenait le moteur. Le verrou ne se laisse plus
 * doubler (`MoteurNavigateur`) et la deconnexion arrete la serie avant d'appeler
 * (`useDeconnexion`) ; il reste a rendre le cas visible s'il revenait, plutot que muet.
 */
export async function fermerSessionDistante(): Promise<IssueDeFermeture> {
    const nom = BLUEPRINT.PORTAIL_DECONNEXION;
    const cas = serviceEtablissement('cas');
    if (cas === null) {
        // Rien a fermer — un etablissement sans CAS n'a pas de ticket — mais la trace existe : une
        // deconnexion silencieuse et une deconnexion impossible se ressemblaient trop.
        reportFailure(nom, portailAbsent('CAS'));
        return 'sans-cas';
    }

    try {
        /*
         * **Par le verrou, comme tout le reste.** Elle appelait le moteur en direct, et c'est ce qui
         * a produit le defaut mesure le 2026-08-29 : la deconnexion naviguait la vue partagee vers la
         * page de deconnexion du CAS **pendant** qu'un widget s'y authentifiait. Le widget voyait
         * alors le panneau d'erreur du CAS et rendait `LOGIN_FAILED` sur des identifiants valides —
         * une erreur qui accuse l'utilisateur pour une collision interne.
         *
         * `priorite: 'session'` parce que c'en est un geste : se deconnecter ne doit pas echouer
         * parce qu'une chronologie se rafraichissait.
         */
        const reserve = await surLeNavigateur(
            nom,
            (signal) => runBlueprint(nom, { inputs: { cas }, signal }),
            { priorite: 'session' },
        );

        if (reserve.ok === false) {
            // « On n'a meme pas essaye » : la sortie inacceptable, et la seule qui laisse le compte
            // ouvert sans qu'aucune source distante n'ait failli.
            reportFailure(nom, ukitFailure(
                'unsupported',
                `moteur occupe par ${reserve.occupePar} apres ${TOURS_DE_SESSION} tours : `
                + 'la session distante reste ouverte',
                'MOTEUR_OCCUPE',
            ));
            return 'moteur-occupe';
        }

        if (reserve.valeur.ok === false) {
            // « Le portail n'a pas repondu » : acceptable, et desormais visible.
            reportFailure(nom, reserve.valeur.failure);
            return 'echec';
        }

        return 'fermee';
    } catch (erreur) {
        // Le filet : une exception hors run — elle ne doit pas remonter, mais elle ne doit plus
        // disparaitre non plus.
        reportFailure(nom, ukitFailure(
            'engine',
            `exception hors run : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
        ));
        return 'echec';
    }
}

/**
 * Prouve un couple d'identifiants aupres du CAS, avant de lire quoi que ce soit.
 *
 * **Pourquoi une etape a part, et pas la simple presence d'un formulaire.** On a longtemps deduit la
 * preuve du parcours lui-meme : s'il traversait un formulaire, c'est que le CAS avait accepte. Cette
 * deduction est fausse des que la session persiste — et la sonde du 2026-08-27 a montre pire encore :
 * fermer la session **au CAS** ne suffit pas a faire reapparaitre le formulaire, parce que le
 * **service** garde son propre cookie. Le CAS repondait « Logout successful » et `mondossierweb`
 * laissait quand meme entrer.
 *
 * Le parcours passait donc sans que personne ne se prononce, et l'application soldait la validation
 * en « impossible de verifier tes identifiants » sur des identifiants justes.
 *
 * `renew=true` est la reponse du protocole : Apereo redemande les identifiants meme si un ticket vit.
 * La preuve cesse d'etre deduite d'une absence de session pour devenir **demandee**.
 *
 * L'encodage du `service` est fait **ici** : le filtre `urlencode` n'existe pas dans le moteur
 * embarque, donc l'employer dans le fichier marcherait depuis un poste et nulle part ailleurs.
 */
async function jouerVerification(options: OptionsSession): Promise<UkitFailure | null> {
    const cas = serviceEtablissement('cas');
    const service = serviceEtablissement('ent');
    // Sans CAS ni service connus, on ne sait pas ou prouver quoi que ce soit. On laisse alors le
    // parcours suivre son cours : c'est ce qu'il faisait avant, et le dire ici serait un echec de
    // configuration deguise en echec d'identifiants.
    if (cas === null || service === null) return null;

    const run = await jouer(BLUEPRINT.PORTAIL_VERIFICATION, 'connecting', {
        ...options,
        inputs: { cas, service: encodeURIComponent(service) },
    });
    return run.ok === false ? run.failure : null;
}

/** Ce qu'une session complete a obtenu. Les champs sont independants. */
export interface ResultatSession {
    readonly cold?: ScolariteColdData;
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
 * ## La session a maigri, et c'est la messagerie qui est partie
 *
 * Elle jouait deux Blueprints : le dossier, puis la messagerie. Cette derniere est devenue **un
 * widget parmi quatre**, avec son cache et sa peremption, et elle est donc rejouee par
 * `rafraichirWidgets` — pas ici. Trois consequences, toutes voulues :
 *
 *   - **le parcours chaud n'existe plus.** Il ne servait qu'a relire la boite a chaque lancement,
 *     sans jamais rien garder : de la l'indicateur tournant au demarrage et le vide hors ligne. Le
 *     cache des widgets fait mieux, et sans run ;
 *   - **le parcours froid est plus court** — une lecture de moins avant que l'ecran se remplisse ;
 *   - **la preuve des identifiants ne depend plus de la messagerie.** C'etait deja le cas depuis que
 *     `ukit.portail.verification` existe : lui seul prouve, par `renew=true`. La garde `LOGIN_SUCCESS`
 *     de la messagerie ne servait plus que les etablissements sans dossier, et la verification les
 *     couvre aussi.
 *
 * Ce qui reste vrai : un etablissement qui ne publie **rien** n'a pas de session a derouler, et le
 * dire est le bon comportement.
 */
export async function deroulerSession(
    mode: 'cold' | 'hot',
    options: OptionsSession = {},
): Promise<ResultatSession> {
    const dossierPublie = portailDisponible('dossier');

    // `portailPublie()` couvre le cas d'un etablissement qui n'aurait pas de dossier mais bien des
    // widgets : il y a alors un compte a prouver, meme s'il n'y a pas d'identite a lire.
    if (!dossierPublie && !portailPublie()) {
        return { failure: portailAbsent('portail') };
    }

    /*
     * **Un couple fourni a l'appel se prouve AVANT qu'on lise quoi que ce soit.**
     *
     * `options.secrets` n'est present que sur une validation — quelqu'un vient de taper ses
     * identifiants, et rien ne les a encore verifies. Le parcours seul ne peut pas s'en charger : une
     * session vivante le laisse passer sans que le CAS se prononce, et fermer cette session ne suffit
     * pas (le service garde la sienne). On demande donc la preuve explicitement.
     *
     * Sur le chemin nominal — pas de secrets a l'appel, le resolver fournit ceux du trousseau — cette
     * etape n'existe pas : il n'y a rien a prouver, ils l'ont deja ete.
     */
    if (options.secrets !== undefined) {
        const refus = await jouerVerification(options);
        if (refus !== null) return { failure: refus };
    }

    let cold: ScolariteColdData | undefined;
    let propositions: PropositionsDossier | undefined;

    if (mode === 'cold' && dossierPublie) {
        const dossier = await jouerDossier(options);
        if (dossier.ok === false) return { failure: dossier.failure };
        cold = dossier.cold;
        propositions = dossier.propositions;
    }

    return {
        ...(cold !== undefined ? { cold } : {}),
        ...(propositions !== undefined ? { propositions } : {}),
    };
}

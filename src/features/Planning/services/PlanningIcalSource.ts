/**
 * L'emploi du temps par export iCalendar, joue par le moteur embarque.
 *
 * La branche iCalendar de `PlanningApiService`, sortie dans son propre fichier pour que le service
 * garde ses quatre signatures et reste lisible. Elle joue deux Blueprints — une plage de dates, et la
 * meme plage sur une annee — dont les noms viennent du **catalogue** : ils vivent sous le prefixe
 * reserve `ukit.portail.`, donc un etablissement s'ajoute par publication, sans release (jalon 6-G).
 *
 * Trois differences avec la branche Celcat valent d'etre sues, et aucune n'est un detail :
 *
 *   - **la liste des groupes ne part pas en reseau.** ADE n'expose aucun arbre de ressources anonyme :
 *     l'export prend des index positionnels que rien ne nomme. Le referentiel qui les nomme est un
 *     releve d'auteur publie dans le catalogue (`tools/releve-ade.mjs`), et la lire est donc
 *     instantane et hors ligne ;
 *   - **un groupe hors referentiel est un echec nomme**, pas une journee vide. Un favori releve l'an
 *     dernier peut cesser de resoudre apres une rentree, et rendre une liste vide ferait passer un
 *     referentiel perime pour une semaine sans cours — exactement le defaut que la Phase 6 supprime ;
 *   - **une requete par vue, quel que soit le nombre de favoris.** `resources` accepte plusieurs
 *     index separes par une virgule et le serveur fusionne, comme `federationIds[]` chez Celcat.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-i-planning-universel.md.
 */

import moment from 'moment';
import type { AbortSignalLike } from '@aetherius/engine';

import {
    BLUEPRINT,
    estNomDePortail,
    reportFailure,
    runBlueprint,
    serviceAbsent,
    type RunnableBlueprintName,
    type UkitFailure,
} from '../../../shared/aetherius';
import { groupeInconnu, resoudreRessources, type EdtIcal } from '../../../shared/etablissements';
import type { CibleGroupe } from './PlanningAssembly';

export { resoudreRessources };

/**
 * Ce qu'un run iCalendar rend : le corps du calendrier, ou un echec deja traduit pour un ecran.
 *
 * `manquants` nomme les groupes favoris que le referentiel ne resout plus. Il accompagne un
 * **succes** : les autres ont ete joues, et l'ecran doit le dire plutot que de tout jeter.
 */
export type IcsRun =
    | { readonly ok: true; readonly ics: unknown; readonly manquants: readonly string[] }
    | { readonly ok: false; readonly failure: UkitFailure };

/** Les bornes d'une requete. Les deux sont **inclusives** chez ADE, contrairement a Celcat. */
export interface PlageIcs {
    readonly debut: string;
    readonly fin: string;
}

/** Le signal d'annulation d'un ecran qui peut disparaitre pendant le chargement. */
interface OptionsRun {
    readonly signal?: AbortSignalLike;
}

/**
 * Le nom du Blueprint, narrowe sur le prefixe reserve.
 *
 * Le catalogue rend une chaine libre ; le registre n'accepte qu'un nom du socle ou un nom de portail.
 * Le meme garde-fou que pour les portails de scolarite (`ScolariteSession.nomDuPortail`), et pour la
 * meme raison : une ligne de base mal ecrite doit echouer en nommant son defaut, pas provoquer un run
 * sur un nom que le registre ignorera.
 */
function nomJouable(nom: string): RunnableBlueprintName | null {
    return estNomDePortail(nom) ? nom : null;
}

function blueprintHorsPerimetre(nom: string): UkitFailure {
    return serviceAbsent(
        'ERROR_TIMETABLE_UNAVAILABLE',
        'EDT_BLUEPRINT_INVALIDE',
        `le catalogue nomme un Blueprint hors du prefixe reserve : ${nom}`,
        'ERROR_TIMETABLE_UNAVAILABLE_TITLE',
    );
}

/** Joue l'un des deux Blueprints de l'etablissement et rend le corps du calendrier. */
async function jouer(
    config: EdtIcal,
    nom: string,
    groupe: CibleGroupe,
    plage: PlageIcs,
    options: OptionsRun,
): Promise<IcsRun> {
    const jouable = nomJouable(nom);
    if (jouable === null) return { ok: false, failure: blueprintHorsPerimetre(nom) };

    const cible = resoudreRessources(config, groupe);
    // Aucun groupe resolu : il n'y a rien a demander, et l'echec nomme le premier fautif. C'est le
    // seul cas ou l'absence redevient un echec — un run sans ressource ne rendrait rien d'utile.
    if (cible.ressources === '') return { ok: false, failure: groupeInconnu(cible.manquants[0] ?? '') };

    const run = await runBlueprint(jouable, {
        inputs: { ...config.params, ressources: cible.ressources, debut: plage.debut, fin: plage.fin },
        ...options,
    });
    if (run.ok === false) {
        reportFailure(jouable, run.failure);
        return { ok: false, failure: run.failure };
    }

    return { ok: true, ics: run.outputs.ics, manquants: cible.manquants };
}

/** Le calendrier d'une plage de dates, pour la vue jour et la vue semaine. */
export function jouerPlage(
    config: EdtIcal,
    groupe: CibleGroupe,
    plage: PlageIcs,
    options: OptionsRun = {},
): Promise<IcsRun> {
    return jouer(config, config.blueprint, groupe, plage, options);
}

/** Le calendrier de l'annee scolaire, pour la synchronisation du calendrier systeme. */
export function jouerAnnee(
    config: EdtIcal,
    groupe: CibleGroupe,
    plage: PlageIcs,
    options: OptionsRun = {},
): Promise<IcsRun> {
    return jouer(config, config.blueprintAnnee, groupe, plage, options);
}

/**
 * Le dernier calendrier d'abonnement telecharge, garde en memoire quelques minutes.
 *
 * Un lien colle est demande **verbatim**, donc sans bornes de dates : la reponse porte tout ce que
 * l'etablissement publie, souvent l'annee entiere (247 Ko mesures chez ADE). Sans ce cache, passer du
 * mardi au mercredi la retelechargerait, et faire glisser le curseur de dates en telechargerait une
 * par jour survole — une charge que personne n'a demandee, sur un serveur universitaire.
 *
 * **En memoire et non sur disque**, deliberement : le cache par vue de `ScheduleList` couvre deja le
 * hors-ligne et le redemarrage, et ranger le meme calendrier une seconde fois dans `AsyncStorage`
 * ferait deux copies de 250 Ko a invalider au lieu d'une. Celui-ci ne sert qu'a economiser des
 * requetes dans une meme session.
 *
 * Le delai est court : un emploi du temps change, et servir une salle deplacee pendant une heure
 * serait pire que de retelecharger.
 */
const PEREMPTION_ABONNEMENT_MS = 5 * 60 * 1000;

let calendrierGarde: { lien: string; ics: unknown; pose: number } | null = null;

/**
 * Le calendrier de l'abonnement colle, tel quel — l'annee entiere s'il le faut.
 *
 * Aucune borne n'est envoyee, et c'est ce qui rend ce chemin **universel** : ADE accepte
 * `firstDate` / `lastDate`, mais d'autres produits figent la fenetre a l'export et un parametre
 * inconnu y est au mieux ignore. Le filtrage par date est donc applicatif (`IcsMapping`), ce qui
 * traite les deux cas avec le meme fichier.
 */
export async function jouerAbonnement(lien: string, options: OptionsRun = {}): Promise<IcsRun> {
    const maintenant = Date.now();
    if (calendrierGarde !== null && calendrierGarde.lien === lien
        && maintenant - calendrierGarde.pose < PEREMPTION_ABONNEMENT_MS) {
        return { ok: true, ics: calendrierGarde.ics, manquants: [] };
    }

    const run = await runBlueprint(BLUEPRINT.EDT_ABONNEMENT, { inputs: { lien }, ...options });
    if (run.ok === false) {
        reportFailure(BLUEPRINT.EDT_ABONNEMENT, run.failure);
        return { ok: false, failure: run.failure };
    }

    calendrierGarde = { lien, ics: run.outputs.ics, pose: maintenant };
    return { ok: true, ics: run.outputs.ics, manquants: [] };
}

/**
 * Ce qu'un controle de lien rend : le nombre de cours trouves, ou la raison du refus.
 *
 * `cours` accompagne un **succes** meme quand il vaut zero, et c'est une decision produit : un
 * calendrier valide qui ne porte aucun cours est un resultat legitime — en aout, c'est meme le cas
 * ordinaire, et c'est precisement le moment ou un etudiant installe l'application. Refuser un lien
 * juste parce que l'annee n'a pas commence casserait le parcours de la personne qu'on vise. L'ecran le
 * **dit** au lieu de le rejeter, ce qui est la meme regle que partout ailleurs dans la phase.
 */
export type ControleLien =
    | { readonly ok: true; readonly cours: number }
    | { readonly ok: false; readonly messageKey: UkitFailure['messageKey'] };

/**
 * Joue le lien une fois et dit s'il rend un emploi du temps.
 *
 * C'est ce qui separe cet ecran d'un simple champ de reglage. Un lien colle de travers — l'adresse de
 * la page de l'agenda plutot que celle de l'abonnement, une redirection vers une page de connexion —
 * donnerait un planning vide que personne ne saurait expliquer, et l'application porterait le chapeau.
 * On paie donc une requete pour que l'erreur soit dite au moment ou elle se corrige.
 *
 * Le refus distingue **deux causes** : ce qui n'est pas un calendrier, et ce qui n'a pas repondu. Les
 * confondre dirait a quelqu'un dont le reseau a hoquete que son lien est mauvais, et il le
 * remplacerait par un autre tout aussi bon.
 *
 * **La distinction se fait sur la famille, pas sur un code**, et c'est une correction : un `code`
 * n'existe que pour un `on_timeout: "fail:CODE"` d'un `wait_for` (`@aetherius/engine`, failure.d.ts),
 * donc jamais pour l'`assert` de forme de ce fichier — le tester n'aurait rien attrape. Les deux
 * familles que ce Blueprint peut produire hors panne disent la meme chose a l'etudiant : `rejected`
 * quand le serveur n'a pas rendu 200 (une page d'erreur, une redirection vers une connexion), `data`
 * quand la reponse n'est pas un calendrier. Dans les deux cas le lien est en cause. Tout le reste —
 * `unavailable` en tete — garde le message de sa famille, avec son bouton Reessayer.
 */
export async function verifierLienEdt(lien: string, options: OptionsRun = {}): Promise<ControleLien> {
    const run = await jouerAbonnement(lien, options);
    if (run.ok === false) {
        const lienEnCause = run.failure.kind === 'rejected' || run.failure.kind === 'data';
        return { ok: false, messageKey: lienEnCause ? 'TIMETABLE_LINK_INVALID' : run.failure.messageKey };
    }

    // Compter les `BEGIN:VEVENT` plutot que d'analyser le calendrier : `IcsMapping` n'est pas
    // importable ici sans faire remonter la projection dans un service, et le compte n'a besoin
    // d'aucune interpretation — un `VEVENT` est un cours, quelle que soit la forme de sa description.
    const corps = typeof run.ics === 'string' ? run.ics : '';
    return { ok: true, cours: corps.split('BEGIN:VEVENT').length - 1 };
}

/**
 * La liste des groupes proposes, depuis le referentiel du catalogue.
 *
 * Aucun run : il n'y a rien a interroger. Le tri est celui de l'ecran de recherche, comme
 * `projeterGroupes` pour Celcat — une table n'a pas d'ordre, et s'en remettre a celui de la base
 * ferait varier la liste d'une lecture a l'autre.
 */
export function groupesDuReferentiel(config: EdtIcal): string[] {
    return config.groupes.map((entree) => entree.nom).sort((gauche, droite) => gauche.localeCompare(droite));
}

/** Les bornes d'une semaine, du lundi au dimanche. L'assemblage n'en gardera que six jours. */
export function plageSemaine(lundi: moment.Moment): PlageIcs {
    return { debut: lundi.format('YYYY-MM-DD'), fin: lundi.clone().add(6, 'day').format('YYYY-MM-DD') };
}

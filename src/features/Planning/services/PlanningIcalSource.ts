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

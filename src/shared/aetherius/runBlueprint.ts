/**
 * L'appel type : resoudre un Blueprint, le jouer, rendre soit des sorties, soit un echec decrit.
 *
 * C'est le seul chemin par lequel un service parle au moteur. Il existe pour que les services ne
 * repetent pas trois choses : la resolution par le registre, la traduction des deux canaux de sortie
 * en un seul, et la decision « une liste vide n'est pas une erreur ».
 *
 * L'usage attendu, cote service, garde la signature existante — les ecrans ne doivent pas apprendre
 * qu'il y a un moteur derriere, sinon la migration cesse d'etre reversible :
 *
 * ```ts
 * async function fetchAnnonces(): Promise<BdeAnnonce[]> {
 *     const run = await runBlueprint(BLUEPRINT.CAMPUS_ANNONCES);
 *     if (run.ok) return run.outputs.annonces as BdeAnnonce[];
 *     report(run.failure);          // journalise, ne masque pas
 *     return legacyFetchAnnonces(); // repli, le temps de la verification — retire au jalon 6-H
 * }
 * ```
 *
 * Voir docs/phase-6/6-a-socle.md et docs/blueprints.md.
 */

import type { BlueprintName } from '../../../blueprints';
import { describeUkitFailure, type UkitFailure } from './failures';
import { resolveBlueprint } from './registry';

export interface RunInputs {
    readonly [key: string]: unknown;
}

/** Un run reussi porte des sorties ; un run echoue porte un echec deja traduit pour un ecran. */
export type BlueprintRun =
    | { readonly ok: true; readonly outputs: Record<string, unknown>; readonly origin: string }
    | { readonly ok: false; readonly failure: UkitFailure };

export interface RunBlueprintOptions {
    readonly inputs?: RunInputs;
    /**
     * Le flux d'evenements du run. Il porte la progression (`step_started`, `progress`) que les
     * ecrans longs affichent — c'est ce qui remplace les messages `PROGRESS` que la WebView cachee
     * postait a la main.
     */
    readonly onEvent?: (event: unknown) => void;
}

/**
 * Joue un Blueprint et rend un resultat exploitable par un ecran.
 *
 * TODO(6-A) : brancher `getAetheriusClient().run(...)`, attraper les deux canaux, et passer par
 * `describeUkitFailure`. Le squelette rend deja la forme finale pour que les services puissent etre
 * ecrits contre elle.
 */
export async function runBlueprint(
    name: BlueprintName,
    _options: RunBlueprintOptions = {},
): Promise<BlueprintRun> {
    await resolveBlueprint(name);
    return { ok: false, failure: describeUkitFailure(new Error('moteur non branche (jalon 6-A)')) };
}

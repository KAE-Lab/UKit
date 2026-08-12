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
 *     if (run.ok === false) {
 *         reportFailure(BLUEPRINT.CAMPUS_ANNONCES, run.failure);  // journalise, ne masque pas
 *         return legacyFetchAnnonces();                           // repli — retire au jalon 6-H
 *     }
 *     return projeter(run.outputs.annonces);
 * }
 * ```
 *
 * Voir docs/phase-6/6-a-socle.md et docs/blueprints.md.
 */

import { describeFailure, type AbortSignalLike, type RunEventHandler } from '@aetherius/engine';

import { getAetheriusClient } from './client';
import { describeUkitFailure, type UkitFailure } from './failures';
import { resolveBlueprint, type BlueprintOrigin, type RunnableBlueprintName } from './registry';

export interface RunInputs {
    readonly [key: string]: unknown;
}

/**
 * Un run reussi porte des sorties ; un run echoue porte un echec deja traduit pour un ecran.
 *
 * **Se teste avec `run.ok === false`, jamais avec `!run.ok`.** `tsconfig.json` etend
 * `expo/tsconfig.base` sans activer `strict` (voir docs/qualite.md), et sans `strictNullChecks`
 * TypeScript ne restreint pas une union discriminee sur la simple veracite du discriminant : le
 * compilateur rendrait alors « Property 'failure' does not exist ». La comparaison explicite au
 * litteral, elle, restreint correctement.
 */
export type BlueprintRun =
    | { readonly ok: true; readonly outputs: Readonly<Record<string, unknown>>; readonly origin: BlueprintOrigin }
    | { readonly ok: false; readonly failure: UkitFailure };

export interface RunBlueprintOptions {
    readonly inputs?: RunInputs;
    /**
     * Des secrets fournis a l'appel, qui **gagnent** sur ceux du trousseau.
     *
     * Le chemin nominal ne s'en sert pas : un Blueprint **declare** ses secrets et le resolver les
     * fournit depuis `SecureStore` (voir secrets.ts). Ce champ existe pour le seul cas ou le
     * trousseau ne peut pas repondre — **valider un couple identifiant / mot de passe que
     * l'utilisateur vient de saisir**. L'ecrire d'abord pour que le resolver le trouve romprait la
     * promesse qui tient tout le module : les identifiants ne sont ecrits qu'une fois valides par le
     * CAS, et un mot de passe errone ne laisse aucune trace.
     *
     * Le masquage s'applique a ces valeurs comme a celles du trousseau : la facade masque ce qu'elle
     * a **resolu**, quelle qu'en soit la provenance.
     */
    readonly secrets?: Readonly<Record<string, string>>;
    /**
     * Le flux d'evenements du run. Il porte la progression (`step_started`, `progress`) que les
     * ecrans longs affichent — c'est ce qui remplace les messages `PROGRESS` que la WebView cachee
     * postait a la main.
     */
    readonly onEvent?: RunEventHandler;
    /**
     * Annule le run.
     *
     * Un ecran qui peut disparaitre pendant un chargement en a besoin, et le moteur en a un : c'est
     * ce qui a permis de retirer le `axios.CancelToken` de `ScheduleList`, lequel etait stocke et
     * annule sans jamais etre transmis a un appel — il n'annulait donc rien
     * (docs/features/planning.md). Un run annule est un echec de famille `cancelled`, marque
     * `silent` : l'utilisateur est deja parti, il n'y a rien a lui afficher.
     */
    readonly signal?: AbortSignalLike;
}

/**
 * Joue un Blueprint et rend un resultat exploitable par un ecran.
 *
 * Le verdict de succes est celui du **moteur** (`describeFailure` rend `undefined`), pas une lecture
 * de `status === 'success'` : un run `partial` a produit des sorties, et les jeter au motif que le
 * statut n'est pas exactement celui qu'on attendait ferait perdre de la donnee valide.
 *
 * Ne leve jamais. Les deux canaux du moteur arrivent au meme endroit, ce qui est precisement ce que
 * les services n'ont pas a savoir.
 */
export async function runBlueprint(
    name: RunnableBlueprintName,
    options: RunBlueprintOptions = {},
): Promise<BlueprintRun> {
    try {
        const resolved = await resolveBlueprint(name);
        const result = await getAetheriusClient().run(resolved.blueprint, {
            inputs: options.inputs ?? {},
            ...(options.secrets !== undefined ? { secrets: options.secrets } : {}),
            ...(options.onEvent !== undefined ? { onEvent: options.onEvent } : {}),
            ...(options.signal !== undefined ? { signal: options.signal } : {}),
        });

        // Le verdict vient du moteur, pas d'une comparaison de statut : `describeFailure` rend
        // `undefined` exactement quand il n'y a rien a traduire.
        if (describeFailure(result) !== undefined) {
            return { ok: false, failure: describeUkitFailure(result) };
        }
        return { ok: true, outputs: result.outputs, origin: resolved.origin };
    } catch (error) {
        return { ok: false, failure: describeUkitFailure(error) };
    }
}

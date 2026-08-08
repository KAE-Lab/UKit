/**
 * Le registre : d'ou vient le Blueprint qu'on va jouer.
 *
 * Deux sources, et un ordre qui ne change jamais :
 *
 *     surcouche distante valide et plus recente  →  sinon le socle embarque
 *
 * Le socle n'est **jamais** optionnel : une application doit fonctionner au premier lancement, hors
 * ligne, sans avoir jamais contacte le reseau. Le distant ne fait que le mettre a jour.
 *
 * Deux regles gouvernent ce fichier, et elles seront tentantes a violer :
 *
 *   - `resolve()` **ne touche jamais au reseau**. Un run n'attend pas un CDN pour savoir quoi jouer.
 *   - `refresh()` **ne leve jamais**. Elle rend un rapport. Un point de publication en panne ne doit
 *     pas devenir une application en panne.
 *
 * Ce fichier est la **couture de plateforme** : il tient le magasin de cache et lit la configuration
 * du binaire. Le cadrage du registre, lui, vit dans `delivery.ts`, qui reste jouable sous Node —
 * c'est la meme frontiere que `client.ts` face a `secrets.ts` (docs/qualite.md).
 *
 * Voir docs/blueprints.md et docs/phase-6/6-c-livraison.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { type BlueprintName } from '../../../blueprints';
import { getSupabaseConfig } from '../supabase/client';
import { createRegistry } from './delivery';
import type { BlueprintOrigin, BlueprintStatus, RefreshReport, ResolvedBlueprint } from './delivery';

export type { BlueprintOrigin, BlueprintStatus, RefreshReport, ResolvedBlueprint };

/**
 * L'interrupteur d'arret durable, pose a la construction du binaire.
 *
 * Il se lit ici plutot que dans `supabase/client.ts` parce qu'il ne dit rien de la base : couper la
 * livraison n'empeche pas de lire les annonces. Absent, la livraison est active — une application
 * doit recevoir ses corrections sans qu'on ait pense a le demander.
 */
function remoteEnabled(): boolean {
    const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
    return extra.blueprintsRemote !== false;
}

let registry: ReturnType<typeof createRegistry> | null = null;

/**
 * Le registre, construit au premier usage.
 *
 * Paresseux pour la meme raison que le client de la base : une application qui ne resout aucun
 * Blueprint ne doit pas payer une lecture de `extra` ni un magasin de cache au demarrage.
 */
function getRegistry(): ReturnType<typeof createRegistry> {
    if (registry === null) {
        registry = createRegistry({
            cache: AsyncStorage,
            baseUrl: getSupabaseConfig()?.url,
            remote: remoteEnabled(),
        });
    }
    return registry;
}

/**
 * Rend le Blueprint a jouer, et d'ou il vient.
 *
 * Le document est valide entierement avant d'etre rendu, qu'il vienne du socle ou de la surcouche —
 * et l'empreinte d'une entree distante est rejouee **a chaque lecture** : un cache local n'est pas
 * plus digne de confiance qu'un CDN. Une entree qui echoue une garde est purgee au passage, et
 * l'embarque reprend la main sans que l'appelant le sache.
 *
 * @throws {BlueprintError} le document n'est pas un Blueprint valide, ou ce nom n'existe pas.
 */
export async function resolveBlueprint(name: BlueprintName): Promise<ResolvedBlueprint> {
    return getRegistry().resolve(name);
}

/**
 * L'etat de la livraison, un Blueprint par ligne : nom, version, origine.
 *
 * Lit le cache, jamais le reseau. C'est ce qu'affiche le panneau de diagnostic du menu de
 * developpement (shared/ui/ModMenuBlueprints.tsx).
 */
export async function listBlueprints(): Promise<readonly BlueprintStatus[]> {
    return getRegistry().list();
}

let lastReport: RefreshReport | null = null;
let inFlight: Promise<RefreshReport> | null = null;

/**
 * Va chercher la surcouche publiee, et rend un rapport.
 *
 * Declenchee au demarrage et au retour au premier plan — **jamais dans le chemin d'un run**. La
 * tentation de rafraichir avant chaque run est forte et elle ruine la propriete principale : un run
 * qui attend le reseau pour savoir quoi jouer echoue quand le reseau est mauvais, c'est-a-dire
 * exactement quand l'utilisateur en a besoin.
 *
 * Un seul rafraichissement a la fois. Volontairement **sans temporisation** par ailleurs : un
 * manifeste pese environ un kilo-octet, et un interrupteur d'arret qui attend cinq minutes avant de
 * mordre n'en est pas un.
 *
 * Ne leve pas : un point de publication en panne rend `ok: false` et une raison lisible.
 */
export async function refreshBlueprints(): Promise<RefreshReport> {
    if (inFlight !== null) {
        return inFlight;
    }

    inFlight = getRegistry()
        .refresh()
        .then((report) => {
            lastReport = report;
            if (!report.ok) {
                // Le rapport est un resultat, pas une panne — mais une livraison qui n'aboutit jamais
                // doit rester observable sans ouvrir le menu de developpement.
                console.warn(`[aetherius] manifeste non lu : ${report.reason ?? 'sans detail'}`);
            }
            return report;
        })
        .finally(() => {
            inFlight = null;
        });

    return inFlight;
}

/** Le dernier rapport connu, ou `null` si aucun rafraichissement n'a encore abouti. */
export function lastRefreshReport(): RefreshReport | null {
    return lastReport;
}

/** Une ligne du diagnostic : ce que le panneau du menu de developpement affiche. */
export interface BlueprintLine {
    readonly name: BlueprintName;
    readonly version: string;
    readonly origin: BlueprintOrigin;
    /** Jouable depuis le panneau : aucune entree a fournir, et aucun identifiant a engager. */
    readonly runnable: boolean;
    /** Le document ne resout pas — un socle casse doit se voir, pas se taire. */
    readonly error?: string;
}

/**
 * Peut-on jouer ce document depuis le menu de developpement, sans rien demander ni rien engager ?
 *
 * Deux conditions. Les entrees d'abord : une entree obligatoire sans valeur par defaut demanderait
 * une saisie, et le panneau n'en est pas une. Les secrets ensuite, et c'est la condition qui compte :
 * jouer un parcours authentifiant depuis un panneau de diagnostic engagerait le compte universitaire
 * de l'utilisateur — une tentative de connexion reelle, avec ce qu'un echec repete coute sur un CAS.
 * Verifier une livraison ne justifie pas ca.
 */
function jouable(blueprint: ResolvedBlueprint['blueprint']): boolean {
    if ((blueprint.secrets ?? []).length > 0) return false;
    return Object.values(blueprint.inputs ?? {}).every(
        (input) => input.required !== true || input.default !== undefined,
    );
}

/**
 * L'etat de la livraison, enrichi de ce que le panneau ne peut pas deviner.
 *
 * La resolution a lieu ici plutot que dans le composant : c'est elle qui dit si un document est
 * jouable, et un ecran ne resout pas de Blueprint (docs/architecture.md). Sans reseau, comme toute
 * resolution.
 */
export async function describeDelivery(): Promise<readonly BlueprintLine[]> {
    const statuses = await listBlueprints();
    const lines: BlueprintLine[] = [];

    for (const status of statuses) {
        const name = status.name as BlueprintName;
        try {
            const { blueprint } = await resolveBlueprint(name);
            lines.push({ name, version: status.version, origin: status.origin, runnable: jouable(blueprint) });
        } catch (error) {
            lines.push({
                name,
                version: status.version,
                origin: status.origin,
                runnable: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return lines;
}

/**
 * Purge la surcouche et revient au socle embarque, tout de suite et sans reseau.
 *
 * L'un des trois interrupteurs d'arret ; les deux autres sont cote publieur (`disabled` sur une
 * entree ou a la racine du manifeste) et cote binaire (`BLUEPRINTS_REMOTE=false`). Un mecanisme de
 * deploiement sans mecanisme de retour arriere n'en est pas un.
 *
 * Effet immediat mais **non durable** : un rafraichissement ulterieur peut ramener la meme version
 * distante. C'est voulu — celui-ci sert a repartir du socle sans attendre une republication.
 */
export async function revertBlueprints(name?: BlueprintName): Promise<void> {
    await getRegistry().revert(name);
    lastReport = null;
}

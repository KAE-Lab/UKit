/**
 * La livraison : comment le registre du paquet est configure pour UKit.
 *
 * Le `BlueprintRegistry` d'Aetherius porte deja tout le mecanisme — socle embarque, surcouche
 * distante, empreinte SHA-256 rejouee a chaque lecture, `min_engine`, version strictement
 * superieure, perimetre de secrets, cache en document unique. Ce fichier ne fait que le **cadrer**,
 * et la seule facon de mal faire ce jalon serait d'affaiblir ce cadrage :
 *
 *   - `allowedSecrets` borne ce qu'un fichier publie a le droit de reclamer ;
 *   - `allowNew` est volontairement **absent** — un nom absent du socle reste ignore, et cette limite
 *     est levee au jalon 6-G, pas ici ;
 *   - `remote: false` coupe durablement la surcouche sans la detruire.
 *
 * Il vit separe de `registry.ts` pour rester jouable hors appareil : la configuration et les gardes
 * se testent sous Node, le magasin de cache et la lecture de `extra` ne le peuvent pas. C'est la
 * meme frontiere que `secrets.ts` face a `client.ts` (docs/qualite.md).
 *
 * Voir docs/blueprints.md et docs/phase-6/6-c-livraison.md.
 */

import { BlueprintRegistry } from '@aetherius/react-native';
import type {
    BlueprintCacheStore,
    BlueprintOrigin,
    BlueprintStatus,
    RefreshEntry,
    RefreshReport,
    ResolvedBlueprint,
} from '@aetherius/react-native';

import { ALLOWED_SECRETS, BUNDLED } from '../../../blueprints';

export type {
    BlueprintCacheStore,
    BlueprintOrigin,
    BlueprintStatus,
    RefreshEntry,
    RefreshReport,
    ResolvedBlueprint,
};

/**
 * Le chemin du manifeste dans le bucket public `blueprints`.
 *
 * Le bucket est en lecture publique (supabase/policies.sql) : l'objet se lit sans cle, par la meme
 * forme d'URL que les visuels des annonces.
 */
const MANIFEST_PATH = 'storage/v1/object/public/blueprints/manifest.json';

/** Les options de construction, cote UKit. Le reste du `RegistryConfig` est decide ici. */
export interface DeliveryOptions {
    /** Le magasin persistant. `AsyncStorage` satisfait cette surface sans adaptateur. */
    readonly cache: BlueprintCacheStore;
    /** L'URL de la base, telle que `extra.supabaseUrl` la porte. */
    readonly baseUrl?: string | null;
    /** L'interrupteur d'arret durable : `false` ne resout que l'embarque. */
    readonly remote?: boolean;
}

/**
 * L'URL du manifeste, ou `undefined` si la base n'est pas configuree dans ce binaire.
 *
 * Rendre `undefined` plutot qu'une URL fausse a une consequence utile : le registre sert alors le
 * socle seul et `refresh()` rend `ok: false — no manifest URL`, ce que le diagnostic affiche tel
 * quel. Une URL construite sur une base vide donnerait un echec de transport, c'est-a-dire le
 * mauvais diagnostic pour la bonne panne.
 */
export function manifestUrl(baseUrl?: string | null): string | undefined {
    if (typeof baseUrl !== 'string' || baseUrl === '') return undefined;
    return `${baseUrl.replace(/\/+$/, '')}/${MANIFEST_PATH}`;
}

/**
 * Construit le registre.
 *
 * `allowedSecrets` est passe explicitement plutot que laisse au defaut du paquet — qui serait
 * l'union des secrets declares par le socle. Les deux valent la meme chose aujourd'hui, mais le
 * defaut s'elargirait tout seul le jour ou un Blueprint embarque declarerait un nouveau secret,
 * et un perimetre qui s'elargit sans qu'on le decide n'est plus un perimetre.
 */
export function createRegistry(options: DeliveryOptions): BlueprintRegistry {
    const manifest = manifestUrl(options.baseUrl);

    return new BlueprintRegistry({
        bundled: BUNDLED,
        allowedSecrets: ALLOWED_SECRETS,
        cache: options.cache,
        remote: options.remote !== false,
        ...(manifest !== undefined ? { manifest } : {}),
    });
}

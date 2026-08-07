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
 * Voir docs/blueprints.md et docs/phase-6/6-c-livraison.md.
 */

import { BUNDLED, type BlueprintName } from '../../../blueprints';

/** D'ou vient le document resolu — l'information que l'ecran de diagnostic affiche. */
export type BlueprintOrigin = 'bundled' | 'remote';

export interface ResolvedBlueprint {
    readonly name: BlueprintName;
    readonly version: string;
    readonly origin: BlueprintOrigin;
    readonly document: unknown;
}

/**
 * Rend le Blueprint a jouer.
 *
 * Au jalon 6-A il n'existe qu'une source, et cette fonction rend donc toujours l'embarque. Les
 * services l'appellent quand meme, au lieu d'importer le document directement : sans cela, le jalon
 * 6-C devrait repasser sur chaque appelant. C'est un detail d'implementation, pas d'interface.
 *
 * TODO(6-C) : deleguer a `BlueprintRegistry` (socle + manifeste Supabase + cache AsyncStorage).
 */
export async function resolveBlueprint(name: BlueprintName): Promise<ResolvedBlueprint> {
    const bundled = BUNDLED[name];
    return { name, version: bundled.version, origin: 'bundled', document: bundled.document };
}

/**
 * Va chercher la surcouche publiee, et rend un rapport.
 *
 * Declenchee au demarrage et au retour au premier plan — jamais dans le chemin d'un run. Elle est
 * volontairement sans effet tant que le jalon 6-C n'est pas livre : appeler une fonction qui ne fait
 * rien encore est preferable a cabler l'appel plus tard, au moment ou l'on aura oublie qu'il fallait
 * le mettre hors du chemin critique.
 *
 * TODO(6-C).
 */
export async function refreshBlueprints(): Promise<void> {
    return;
}

/**
 * Purge la surcouche et revient au socle embarque, tout de suite et sans reseau.
 *
 * L'un des trois interrupteurs d'arret ; les deux autres sont cote publieur (`disabled` sur une
 * entree ou a la racine du manifeste). Un mecanisme de deploiement sans mecanisme de retour arriere
 * n'en est pas un.
 *
 * TODO(6-C).
 */
export async function revertBlueprints(_name?: BlueprintName): Promise<void> {
    return;
}

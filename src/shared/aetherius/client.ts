/**
 * La facade : un seul moteur pour toute l'application.
 *
 * ```ts
 * const result = await getAetheriusClient().run(document, { inputs, onEvent });
 * ```
 *
 * Les memes noms que le SDK qui pilote un moteur distant : le choix d'embarquer ou de piloter ne
 * doit pas se voir dans le code appelant, sinon passer de l'un a l'autre voudrait dire reecrire
 * l'application.
 *
 * **Un seul client.** Instancier une facade par service multiplierait les resolvers de secrets et,
 * surtout, les pretendants a la WebView unique — il y a une vue montee, donc un run Act II a la
 * fois, et le second est refuse bruyamment plutot que mis en file.
 *
 * Deux canaux de sortie, et il faut les traiter tous les deux : un `Result` (echec de run trace
 * dedans) et une exception (Blueprint refuse avant le demarrage, dependance absente, bug du moteur).
 * `describeUkitFailure` accepte les deux, precisement pour qu'un service n'ait pas a savoir lequel a
 * parle.
 *
 * Voir docs/phase-6/6-a-socle.md.
 */

/**
 * TODO(6-A) : brancher le moteur.
 *
 * ```ts
 * import { Aetherius } from '@aetherius/react-native';
 * import { ukitSecrets } from './secrets';
 *
 * let client: Aetherius | null = null;
 *
 * export function getAetheriusClient(): Aetherius {
 *     if (!client) client = new Aetherius({ secrets: ukitSecrets() });
 *     return client;
 * }
 * ```
 *
 * Et, une fois, haut dans l'arbre (rootContainer.tsx) : `<AetheriusWebView />` et
 * `<AetheriusConfirm />`. Les deux vivent avec l'application, pas avec un run — la WebView cachee
 * sert tous les Blueprints navigateur successivement, et le modal doit exister au moment ou une
 * question est posee. Personne qui ecoute veut dire question jamais montree, donc refus immediat :
 * c'est voulu, garer un run devant un ecran muet serait un blocage sans cause visible.
 *
 * Premier risque a lever du jalon, avant toute autre ligne : verifier que Metro resout les deux
 * paquets (ESM avec champ `exports`). Un import qui rend `undefined` se diagnostique en trente
 * secondes le premier jour et en une soiree le troisieme.
 */
export function getAetheriusClient(): never {
    throw new Error('Aetherius: le moteur est branche au jalon 6-A (voir docs/phase-6/6-a-socle.md)');
}

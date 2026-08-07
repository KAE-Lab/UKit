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
 * parle — c'est `runBlueprint` qui s'en charge, et aucun service n'appelle cette facade en direct.
 *
 * Ce fichier est le **seul** du socle a importer le paquet React Native et le trousseau : c'est ce
 * qui garde le reste (registre, secrets, modele d'erreur) jouable hors appareil.
 *
 * Voir docs/phase-6/6-a-socle.md.
 */

import { Aetherius } from '@aetherius/react-native';

import SecureStoreService from '../services/SecureStoreService';
import { ukitSecrets } from './secrets';

let client: Aetherius | null = null;

/**
 * La facade de l'application, instanciee a la premiere demande.
 *
 * Paresseuse et non au niveau du module : le socle charge ses managers **avant** le premier rendu
 * (voir docs/architecture.md), et rien de ce jalon ne doit s'ajouter a ce chemin. Une application
 * qui ne joue aucun Blueprint ne construit jamais de moteur.
 *
 * Le masquage des valeurs de secrets reste actif : `redact: false` n'a de sens qu'en deboguant le
 * moteur lui-meme, et un journal d'application finit souvent ailleurs que sur l'appareil.
 */
export function getAetheriusClient(): Aetherius {
    if (client === null) {
        client = new Aetherius({ secrets: ukitSecrets(SecureStoreService) });
    }
    return client;
}

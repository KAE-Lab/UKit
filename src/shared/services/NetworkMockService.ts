/**
 * Couper le réseau **de l'application**, sans toucher à celui de l'appareil.
 *
 * Le mode avion est la façon évidente de vérifier un chemin hors ligne, et c'est une mauvaise façon :
 * il coupe aussi Metro, donc la session de développement, donc la possibilité de recharger pour
 * essayer autre chose. On finit par ne pas tester le chemin dégradé — celui qui décide de
 * l'expérience réelle.
 *
 * Cet interrupteur fait deux choses, et il faut les deux :
 *
 *   - `isConnected()` rend `false`, ce qui déclenche la branche « pas de connexion » des écrans qui la
 *     consultent (le planning, la recherche de groupes) ;
 *   - le `fetch` du moteur **échoue**, ce qui range tout run en famille `unavailable`. Sans ce second
 *     volet, les écrans Campus ne verraient rien : ils ne consultent pas `NetInfo`, ils jouent un
 *     Blueprint et lisent son échec.
 *
 * Ce qu'il ne couvre **pas**, et qu'il faut savoir avant de conclure, ce sont les deux chemins qui
 * n'empruntent pas ce `fetch` : **le client Supabase**, qui utilise le `fetch` global — les
 * surcouches publiées continuent donc de se rafraîchir, ce qui invalide en silence toute
 * vérification de cache local (pointer `SUPABASE_URL` sur `https://127.0.0.1:1` pour ça) — et la
 * WebView de l'Act II, qui navigue par elle-même. C'est le cas de la scolarité depuis le jalon
 * 6-F : son chemin dégradé se vérifie en pointant une `vars` d'hôte sur `https://127.0.0.1:1/` puis
 * en rechargeant Metro. Une adresse qui refuse la connexion plutôt qu'un nom qui ne résout pas, et
 * ce n'est pas un détail : mesuré sur appareil, la première produit un échec **nommé** par le
 * Blueprint, la seconde ne produit aucun document et retombe en « problème interne »
 * (docs/qualite.md).
 *
 * Purement destiné à la vérification manuelle : rien dans l'application ne l'active, et il ne survit
 * pas à un rechargement — sauf à la réinitialisation complète du menu, qui le range le temps de la
 * relance (`simulations.ts`). Voir docs/qualite.md.
 */

import { DeviceEventEmitter } from 'react-native';

import type { FetchLike } from '@aetherius/engine';

/** L'erreur qu'un `fetch` de plateforme lève quand la requête ne part pas. */
const MESSAGE = 'Network request failed';

class NetworkMockManager {
    private coupe = false;

    isOffline(): boolean {
        return this.coupe;
    }

    setOffline(coupe: boolean): void {
        this.coupe = coupe;
        DeviceEventEmitter.emit('networkMockChanged', coupe);
    }

    /**
     * Le `fetch` remis au moteur.
     *
     * Il lève une `TypeError` portant le message exact d'un échec de transport, parce que c'est ce
     * que le moteur reconnaît pour ranger l'échec en `unavailable` — simuler une panne avec un code
     * d'erreur différent produirait une famille différente, donc un écran différent, donc une
     * vérification qui ne vérifie pas le bon chemin.
     */
    fetch: FetchLike = (url, init) => {
        if (this.coupe) return Promise.reject(new TypeError(MESSAGE));
        // `FetchLike` est volontairement plus etroit que la signature WHATWG — le moteur ne declare
        // que ce que l'Act I envoie et lit. La conversion est donc sure dans ce sens.
        return globalThis.fetch(url, init as RequestInit) as unknown as ReturnType<FetchLike>;
    };
}

export const NetworkMockService = new NetworkMockManager();

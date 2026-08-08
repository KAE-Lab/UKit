/**
 * La configuration du harnais de tests.
 *
 * Elle n'existe que pour une raison, et elle vaut d'etre expliquee plutot que subie.
 *
 * `BlueprintRegistry` — tout le mecanisme de livraison du jalon 6-C — est publie dans
 * `@aetherius/react-native`, dont la **racine** monte une WebView : sous Node, l'import echoue avant
 * la premiere ligne de test. Le sous-module `dist/delivery/` qui porte le registre, lui, n'importe
 * que `@aetherius/engine` et `globalThis.setTimeout` : il ne depend d'aucune plateforme. Le paquet
 * ne l'expose simplement pas en sous-chemin.
 *
 * L'alias ci-dessous le resout directement, **sous test uniquement**. Sans lui, les neuf gardes du
 * registre (empreinte, version, `min_engine`, manifeste malforme, perimetre des secrets, cache
 * corrompu...) ne seraient verifiables qu'en publiant neuf manifestes casses en production.
 *
 * Ce qu'il ne couvre pas, et qu'il ne faut pas essayer de lui faire couvrir : un module qui importe
 * autre chose du paquet — la facade `Aetherius`, la WebView, le modal de confirmation — reste
 * injouable hors appareil, et c'est toujours le signal que la frontiere entre code testable et code
 * de plateforme a ete franchie (docs/qualite.md).
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const ICI = dirname(fileURLToPath(import.meta.url));
const DELIVERY = join(ICI, 'node_modules/@aetherius/react-native/dist/delivery/index.js');

export default defineConfig({
    resolve: {
        alias: [{ find: /^@aetherius\/react-native$/, replacement: DELIVERY }],
    },
});

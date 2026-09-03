/**
 * Vendorise pdf.js dans `assets/pdfjs/`, tel quel.
 *
 *   npm run pdfjs:vendor
 *
 * Deux fichiers du paquet `pdfjs-dist` — la bibliotheque et son worker, build `legacy` pour couvrir
 * les WebView Android les plus anciennes — sont copies **octet pour octet** sous une extension
 * `.txt` : Metro n'embarque un fichier tel quel que sous une extension d'asset, et `.mjs` est une
 * extension source (metro.config.js). La licence du paquet suit, et `VERSION` dit quelle version est
 * embarquee. Un test (`vendor.test.ts`) verifie que les copies sont celles du paquet installe : bumper
 * la devDependency sans rejouer ce script se voit au premier `npm test`.
 *
 * Le paquet est une **devDependency** : rien de lui ne s'importe dans l'application. Ce que
 * l'application charge, ce sont ces copies, lues comme des assets par la WebView du lecteur.
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAQUET = dirname(require.resolve('pdfjs-dist/package.json'));
const DESTINATION = join(ROOT, 'assets', 'pdfjs');

/** Ce qui est copie, et sous quel nom. */
export const FICHIERS = [
    ['legacy/build/pdf.min.mjs', 'pdf.min.mjs.txt'],
    ['legacy/build/pdf.worker.min.mjs', 'pdf.worker.min.mjs.txt'],
    ['LICENSE', 'LICENSE'],
];

mkdirSync(DESTINATION, { recursive: true });
for (const [source, cible] of FICHIERS) {
    copyFileSync(join(PAQUET, source), join(DESTINATION, cible));
}
const { version } = JSON.parse(readFileSync(join(PAQUET, 'package.json'), 'utf8'));
writeFileSync(join(DESTINATION, 'VERSION'), `${version}\n`);

console.log(`pdf.js ${version} vendorise dans assets/pdfjs/ (${FICHIERS.length} fichiers)`);

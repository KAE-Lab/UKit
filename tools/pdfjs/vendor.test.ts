/**
 * Les copies vendorisees de pdf.js sont celles du paquet installe, octet pour octet.
 *
 * Sans ce test, bumper `pdfjs-dist` sans rejouer `npm run pdfjs:vendor` laisserait l'application
 * embarquer une version que personne ne croit embarquer — et une divergence dans l'autre sens, une
 * copie retouchee a la main, serait indetectable.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const PAQUET = dirname(require.resolve('pdfjs-dist/package.json'));
const VENDORISE = 'assets/pdfjs';

describe('assets/pdfjs', () => {
    it.each([
        ['legacy/build/pdf.min.mjs', 'pdf.min.mjs.txt'],
        ['legacy/build/pdf.worker.min.mjs', 'pdf.worker.min.mjs.txt'],
        ['LICENSE', 'LICENSE'],
    ])('embarque %s tel quel', (source, cible) => {
        const attendu = readFileSync(join(PAQUET, source));
        const embarque = readFileSync(join(VENDORISE, cible));
        expect(embarque.equals(attendu), `${cible} differe du paquet : rejouer npm run pdfjs:vendor`).toBe(true);
    });

    it('nomme la version embarquee, et c est celle du paquet', () => {
        const { version } = JSON.parse(readFileSync(join(PAQUET, 'package.json'), 'utf8')) as { version: string };
        expect(readFileSync(join(VENDORISE, 'VERSION'), 'utf8').trim()).toBe(version);
    });
});

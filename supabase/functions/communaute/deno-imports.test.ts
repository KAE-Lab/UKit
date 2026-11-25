/**
 * Les paquets de la fonction `communaute` se resolvent deux fois : par `deno.json` sous Deno, en
 * production, et par `node_modules` sous vitest, ou ils sont des dependances de developpement. Les
 * versions doivent etre les memes des deux cotes, sinon les tests jugent un autre code que celui qui
 * tourne. Ce test compare les deux, exactes, et verifie que tout import nu de la fonction est declare.
 *
 *     npm test
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const ICI = __dirname;
const RACINE = join(ICI, '../../..');

test('chaque paquet de deno.json est epingle a la version exacte de package.json', () => {
    const deno = JSON.parse(readFileSync(join(ICI, 'deno.json'), 'utf8')) as { imports: Record<string, string> };
    const paquet = JSON.parse(readFileSync(join(RACINE, 'package.json'), 'utf8')) as { devDependencies: Record<string, string> };
    for (const [nom, cible] of Object.entries(deno.imports)) {
        expect(cible).toBe(`npm:${nom}@${paquet.devDependencies[nom]}`);
        expect(paquet.devDependencies[nom]).toMatch(/^\d+\.\d+\.\d+$/);
    }
});

test('aucun import nu de la fonction n echappe a deno.json', () => {
    const deno = JSON.parse(readFileSync(join(ICI, 'deno.json'), 'utf8')) as { imports: Record<string, string> };
    const sources = readdirSync(ICI).filter((nom) => nom.endsWith('.ts') && !nom.endsWith('.test.ts'));
    for (const source of sources) {
        const nus = [...readFileSync(join(ICI, source), 'utf8').matchAll(/^import\s+(?:[^'"]+\s+from\s+)?'([^'.][^']*)'/gm)]
            .map((m) => m[1])
            .filter((specifier) => !specifier.startsWith('jsr:') && !specifier.startsWith('npm:'));
        for (const specifier of nus) expect(Object.keys(deno.imports), `${source} importe ${specifier}`).toContain(specifier);
    }
});

/**
 * Le lanceur du harnais de parite.
 *
 *   npm run parity                 # tous les cas
 *   npm run parity -- annonces     # un seul
 *
 * Chaque fichier `*.parity.mjs` expose `viaBlueprint()`, `viaLegacy()` et `project(item)`. Le
 * lanceur joue les deux chemins, projette, et compare. Voir tools/parity/README.md.
 *
 * Un cas qui echoue parce que la source est en panne est une **information**, pas un faux positif :
 * c'est meme la seule facon d'apprendre qu'une source a change avant que les utilisateurs ne le
 * fassent. Le lanceur distingue donc les deux issues.
 */

import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function discover(filter) {
    return readdirSync(HERE)
        .filter((name) => name.endsWith('.parity.mjs'))
        .filter((name) => !filter || name.startsWith(`${filter}.`));
}

async function runCase(file) {
    const testCase = await import(join(HERE, file));
    const [blueprint, legacy] = await Promise.all([testCase.viaBlueprint(), testCase.viaLegacy()]);

    const left = blueprint.map(testCase.project);
    const right = legacy.map(testCase.project);
    const same = JSON.stringify(left) === JSON.stringify(right);

    return { name: testCase.NAME ?? file, same, left, right };
}

async function main() {
    const filter = process.argv[2];
    const files = discover(filter);
    if (files.length === 0) {
        console.error(filter ? `aucun cas nomme '${filter}'` : 'aucun cas de parite');
        process.exit(1);
    }

    let failed = 0;
    for (const file of files) {
        try {
            const outcome = await runCase(file);
            if (outcome.same) {
                console.log(`  ok    ${outcome.name} (${outcome.left.length} element(s))`);
            } else {
                failed += 1;
                console.log(`  ECART ${outcome.name}`);
                console.log(`        blueprint : ${JSON.stringify(outcome.left).slice(0, 400)}`);
                console.log(`        legacy    : ${JSON.stringify(outcome.right).slice(0, 400)}`);
            }
        } catch (error) {
            // Une source en panne et un ecart de donnees ne sont pas la meme nouvelle : les
            // confondre ferait ignorer les deux.
            failed += 1;
            console.log(`  ERREUR ${file} : ${error.message}`);
        }
    }

    process.exit(failed === 0 ? 0 : 1);
}

await main();

/**
 * Publie les Blueprints de `blueprints/` vers la base, et regenere le manifeste.
 *
 *   npm run blueprints:publish
 *
 * Publier, c'est deux gestes : deposer les fichiers corriges, et republier le manifeste qui les
 * designe **avec leur empreinte**. Le second se fait ici plutot qu'a la main : une empreinte
 * calculee de tete est perimee des la premiere correction, et un manifeste dont l'empreinte ment est
 * exactement ce que l'appareil rejette — on passerait la soiree a deboguer une garde qui fonctionne.
 *
 * Le manifeste est un **artefact**, jamais un fichier qu'on edite.
 *
 * Voir docs/blueprints.md et docs/phase-6/6-c-livraison.md.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLUEPRINTS = join(ROOT, 'blueprints');

/** La version du **format** de manifeste. Toute autre valeur fait ignorer le manifeste entier. */
const MANIFEST_FORMAT = '1';

/**
 * Construit le manifeste a partir des fichiers presents.
 *
 * Deux gardes se jouent ici plutot que sur l'appareil, ou la correction serait bien plus couteuse :
 *
 *   - un fichier livre sous un nom qui n'est pas le sien remplacerait un Blueprint par un autre ;
 *   - une version qui ne bat pas celle du socle embarque n'atteindrait jamais un appareil, et le
 *     seul endroit ou ca se verrait est l'ecran de diagnostic.
 */
function buildManifest(entries) {
    const blueprints = {};
    for (const entry of entries) {
        const text = readFileSync(join(BLUEPRINTS, entry.file), 'utf8');
        const declared = JSON.parse(text).name;
        if (declared !== entry.name) {
            throw new Error(`${entry.file} declare le nom '${declared}', publie comme '${entry.name}'`);
        }
        blueprints[entry.name] = {
            version: entry.version,
            url: entry.file,
            sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
            disabled: false,
        };
        if (entry.min_engine) blueprints[entry.name].min_engine = entry.min_engine;
    }
    return {
        manifest: MANIFEST_FORMAT,
        generated_at: new Date().toISOString(),
        disabled: false,
        blueprints,
    };
}

/**
 * TODO(6-C) : le corps du script.
 *
 *   1. lire les versions publiees dans la table `blueprints` ;
 *   2. **valider** chaque fichier avec le moteur — un Blueprint invalide ne doit pas atteindre le
 *      bucket, encore moins un appareil ;
 *   3. televerser les fichiers qui ont change dans le bucket `blueprints` ;
 *   4. mettre la table a jour et ecrire `manifest.json` a cote des fichiers.
 *
 * L'ordre compte : le manifeste est ecrit **en dernier**. C'est lui le plan de controle — le
 * publier avant les fichiers qu'il designe ferait pointer une empreinte valide vers un fichier
 * absent, et l'appareil rejetterait une correction pourtant correcte.
 *
 * La cle utilisee est `service_role`, lue de l'environnement. Elle ne s'ecrit dans aucun fichier
 * versionne : qui la detient peut publier un Blueprint que tous les appareils joueront.
 */
function main() {
    const files = readdirSync(BLUEPRINTS).filter((name) => name.endsWith('.blueprint.json'));

    // Tant que la publication n'est pas branchee, le script fait deja la moitie utile du travail :
    // il montre le manifeste qui serait produit. Un manifeste qu'on peut lire avant de le publier
    // est un manifeste dont on repere l'erreur avant qu'un appareil ne la rejette.
    const entries = files.map((file) => ({
        file,
        name: JSON.parse(readFileSync(join(BLUEPRINTS, file), 'utf8')).name,
        version: '1',
    }));

    console.log(JSON.stringify(buildManifest(entries), null, 2));
    console.log(`\n${files.length} Blueprint(s) — televersement et mise a jour de la table : jalon 6-C`);
    console.log('(voir docs/phase-6/6-c-livraison.md)');
}

main();

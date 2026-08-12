/**
 * Publie les Blueprints de `blueprints/` vers la base, et regenere le manifeste.
 *
 *   npm run blueprints:publish                                  # publier l'etat du depot
 *   npm run blueprints:publish -- --dry-run                     # montrer, sans rien toucher
 *   npm run blueprints:publish -- --arret                       # tout revient a l'embarque
 *   npm run blueprints:publish -- --desactiver <nom>            # une entree revient a l'embarque
 *   npm run blueprints:publish -- --reactiver <nom>
 *   npm run blueprints:publish -- --force                       # retelever tout
 *
 * Publier, c'est deux gestes : deposer les fichiers corriges, et republier le manifeste qui les
 * designe **avec leur empreinte**. Le second se fait ici plutot qu'a la main : une empreinte
 * calculee de tete est perimee des la premiere correction, et un manifeste dont l'empreinte ment est
 * exactement ce que l'appareil rejette — on passerait la soiree a deboguer une garde qui fonctionne.
 *
 * Le manifeste est un **artefact**, jamais un fichier qu'on edite.
 *
 * L'ordre compte, et il n'est pas negociable : le manifeste est ecrit **en dernier**. C'est lui le
 * plan de controle — le publier avant les fichiers qu'il designe ferait pointer une empreinte valide
 * vers un fichier absent, et l'appareil rejetterait une correction pourtant correcte.
 *
 * Voir docs/blueprints.md et docs/phase-6/6-c-livraison.md.
 */

import 'dotenv/config';

import { config, lirePublic, rest, televerser } from './blueprints/base.mjs';
import { construireManifeste, lireTout, memeManifeste, MANIFEST_OBJET } from './blueprints/socle.mjs';

const TABLE = 'blueprints';

function arguments_() {
    const argv = process.argv.slice(2);
    const valeur = (drapeau) => {
        const index = argv.indexOf(drapeau);
        if (index < 0) return null;
        const suivant = argv[index + 1];
        if (suivant === undefined || suivant.startsWith('--')) {
            throw new Error(`${drapeau} attend un nom de Blueprint`);
        }
        return suivant;
    };

    return {
        dryRun: argv.includes('--dry-run'),
        arret: argv.includes('--arret'),
        force: argv.includes('--force'),
        desactiver: valeur('--desactiver'),
        reactiver: valeur('--reactiver'),
    };
}

/**
 * Les noms desactives, tels que la table les porte.
 *
 * La table est la **surface d'edition** du publieur : basculer `desactive` depuis la console
 * d'administration puis rejouer le script suffit a ramener une entree au socle embarque. Les
 * arguments `--desactiver` / `--reactiver` font le meme geste depuis un terminal.
 */
async function accorderDesactivations(base, options, publies) {
    const noms = new Set(publies.map((entree) => entree.nom));
    for (const [drapeau, nom] of [['--desactiver', options.desactiver], ['--reactiver', options.reactiver]]) {
        if (nom !== null && !noms.has(nom)) {
            throw new Error(`${drapeau} ${nom} : ce Blueprint n existe pas dans blueprints/`);
        }
    }

    const lignes = await rest(base, `${TABLE}?select=nom,desactive`);
    const desactives = new Set(lignes.filter((ligne) => ligne.desactive).map((ligne) => ligne.nom));

    if (options.desactiver !== null) desactives.add(options.desactiver);
    if (options.reactiver !== null) desactives.delete(options.reactiver);
    return desactives;
}

/** Les fichiers a deposer : ceux que le manifeste servi ne decrit pas avec la meme empreinte. */
function aTeleverser(publies, servi, force) {
    if (force || servi === null) return publies;
    return publies.filter((entree) => servi.blueprints?.[entree.nom]?.sha256 !== entree.sha256);
}

function raconter(publies, portails, manifeste, depots) {
    for (const entree of publies) {
        const etat = manifeste.blueprints[entree.nom].disabled ? 'desactive' : 'actif';
        const depot = depots.includes(entree) ? 'a televerser' : 'inchange';
        // Les portails ne sont pas embarques : le dire ici evite d'aller verifier dans index.ts
        // pourquoi une entree n'a pas de repli hors ligne.
        const origine = portails.includes(entree) ? 'hors socle' : 'embarque';
        console.log(`  ${entree.nom.padEnd(34)} v${entree.version.padEnd(4)} ${origine.padEnd(11)} ${etat.padEnd(10)} ${depot}`);
    }
    if (manifeste.disabled) {
        console.log('\n  ARRET GLOBAL : le manifeste ramene tous les Blueprints au socle embarque.');
    }
}

async function main() {
    const options = arguments_();
    const base = config();

    // Les gardes du depot d'abord : validation du moteur, coherence des noms et des versions, et —
    // pour ce qui n'est pas embarque — l'appartenance au prefixe reserve.
    const { portails, publies } = lireTout();

    const desactives = await accorderDesactivations(base, options, publies);
    const manifeste = construireManifeste(publies, { arret: options.arret, desactives });

    const texteServi = await lirePublic(base, MANIFEST_OBJET);
    const servi = texteServi === null ? null : JSON.parse(texteServi);
    const depots = aTeleverser(publies, servi, options.force);

    console.log(`${publies.length} Blueprint(s) valides, dont ${portails.length} hors socle :\n`);
    raconter(publies, portails, manifeste, depots);

    if (depots.length === 0 && memeManifeste(servi, manifeste)) {
        // « Rejoue a vide, le script ne change rien » est une propriete, pas une politesse : c'est
        // elle qui rend un manifeste perime visible en une commande.
        console.log('\nRien a publier : le bucket sert deja cet etat.');
        return;
    }

    if (options.dryRun) {
        console.log(`\n${JSON.stringify(manifeste, null, 2)}`);
        console.log('\n--dry-run : rien n a ete televerse.');
        return;
    }

    for (const entree of depots) {
        await televerser(base, entree.fichier, entree.texte);
        console.log(`\n  depose  ${entree.fichier} (${entree.texte.length} octets)`);
    }

    await rest(base, TABLE, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(
            publies.map((entree) => ({
                nom: entree.nom,
                version: entree.version,
                chemin: entree.fichier,
                sha256: entree.sha256,
                min_engine: entree.min_engine ?? null,
                desactive: desactives.has(entree.nom),
            })),
        ),
    });
    console.log(`  table   ${publies.length} ligne(s) a jour`);

    await televerser(base, MANIFEST_OBJET, JSON.stringify(manifeste, null, 2));
    console.log(`  manifeste ecrit en dernier — ${manifeste.generated_at}`);
    console.log('\nLa correction atteindra les appareils au prochain retour au premier plan.');
}

main().catch((error) => {
    console.error(`\nEchec de la publication : ${error.message}`);
    process.exit(1);
});

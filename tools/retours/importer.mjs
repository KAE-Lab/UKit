#!/usr/bin/env node
/**
 * Importe les reponses du formulaire de retours dans la table `retours`.
 *
 *     npm run retours:import                             # depuis la feuille (RETOURS_CSV_URL)
 *     npm run retours:import -- --dry-run                # lire et compter, sans rien ecrire
 *     npm run retours:import -- --fichier reponses.csv   # depuis un fichier telecharge a l'adresse d'export
 *     npm run retours:import -- --fuseau Europe/Paris    # le fuseau de la feuille (c'est le defaut)
 *
 * La source est la feuille de reponses liee au formulaire, lue par son lien (source.mjs). Le
 * formulaire se relit **en entier** a chaque passage : la cle de chaque reponse est une empreinte
 * calculee ici (projection.mjs), et l'ecriture se fait en `on conflict do nothing` — la base tranche
 * ce qui est nouveau, le script ne fait que compter. Rejoue a vide, il ne change rien.
 *
 * Sans RETOURS_CSV_URL ni --fichier, il ne fait rien et sort en succes : c'est ce qui permet au
 * workflow (.github/workflows/retours.yml) de rester en place sans etre arme.
 *
 * Il n'imprime jamais une reponse ni un contact : le journal d'un workflow de depot public est
 * public. Des comptes, et en --dry-run le debut de la cle, la nature et la date.
 *
 * La cle `service_role` est requise pour ecrire, comme pour la publication des Blueprints.
 * `dotenv` est charge s'il est la (le poste) et ignore sinon (l'integration continue, qui n'installe
 * pas le projet pour lire un fichier).
 *
 * Voir docs/pilotage.md et docs/phase-6/6-1-x-c-retours.md.
 */

try {
    const { config: chargerEnv } = await import('dotenv');
    // dotenv 17 annonce chaque chargement sur la sortie standard ; un outil doit rester lisible.
    chargerEnv({ quiet: true });
} catch {
    // Sans dotenv, l'environnement est deja pose par celui qui lance le script.
}

import { basename } from 'node:path';

import { config, rest } from '../blueprints/base.mjs';
import { analyserCsv, enregistrementsDe } from './csv.mjs';
import { projeter } from './projection.mjs';
import { lireSource } from './source.mjs';

const TABLE = 'retours';
const FUSEAU_DE_LA_FEUILLE = 'Europe/Paris';

function lireArguments(argv) {
    const args = { fichier: null, dryRun: false, fuseau: FUSEAU_DE_LA_FEUILLE };
    const valeur = (drapeau, index) => {
        const suivant = argv[index + 1];
        if (suivant === undefined || suivant.startsWith('--')) throw new Error(`${drapeau} attend une valeur`);
        return suivant;
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--fichier') {
            args.fichier = valeur(arg, i);
            i++;
        } else if (arg === '--fuseau') {
            args.fuseau = valeur(arg, i);
            i++;
        } else if (arg === '--dry-run') args.dryRun = true;
        else throw new Error(`argument inconnu : ${arg}`);
    }
    return args;
}

/** La configuration de la base si elle est la : un --dry-run doit pouvoir compter sans elle. */
function configOptionnelle() {
    try {
        return config();
    } catch {
        return null;
    }
}

async function identifiantsConnus(base) {
    const lignes = await rest(base, `${TABLE}?select=id`);
    return new Set((lignes ?? []).map((ligne) => ligne.id));
}

function raconter(retours) {
    for (const retour of retours) {
        console.log(`  ${retour.id.slice(0, 12)}  ${retour.nature.padEnd(14)}  ${retour.recu_le}`);
    }
}

async function main() {
    const args = lireArguments(process.argv.slice(2));
    const url = (process.env.RETOURS_CSV_URL ?? '').trim() || null;
    if (args.fichier === null && url === null) {
        console.log('sans RETOURS_CSV_URL : rien a importer');
        return;
    }

    const texte = await lireSource({ fichier: args.fichier, url: args.fichier === null ? url : null });
    const { entetes, enregistrements } = enregistrementsDe(analyserCsv(texte));
    // Tout est projete avant la premiere ecriture : une ligne illisible refuse l'import entier.
    const retours = enregistrements.map((enregistrement, index) => projeter(entetes, enregistrement, index + 2, args.fuseau));
    const origine = args.fichier === null ? 'la feuille' : basename(args.fichier);
    console.log(`lues : ${retours.length} reponse(s), depuis ${origine}`);
    if (retours.length === 0) return;

    if (args.dryRun) {
        const base = configOptionnelle();
        if (base === null) {
            console.log('nouvelles : inconnu (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent)');
            return;
        }
        const connus = await identifiantsConnus(base);
        const nouvelles = retours.filter((retour) => !connus.has(retour.id));
        console.log(`nouvelles : ${nouvelles.length}`);
        raconter(nouvelles);
        console.log('--dry-run : rien n a ete ecrit.');
        return;
    }

    const base = config();
    // Toutes les lignes partent, en une passe : `ignore-duplicates` est le `on conflict do nothing`
    // de PostgREST, et la representation rendue ne contient que les lignes reellement inserees.
    // `select=id` limite ce qui revient — et ce qui pourrait finir dans un journal.
    const inserees = await rest(base, `${TABLE}?on_conflict=id&select=id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify(retours),
    });
    console.log(`nouvelles : ${(inserees ?? []).length}`);
}

main().catch((erreur) => {
    console.error(`\nEchec de l import : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    process.exit(1);
});

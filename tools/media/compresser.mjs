#!/usr/bin/env node
/**
 * Re-encode les visuels du bucket `media`, les repose avec un cache d'un an, et bumpe les adresses
 * que la base porte.
 *
 *     npm run media:compresser                # la passe
 *     npm run media:compresser -- --dry-run   # montrer le plan, sans rien televerser ni ecrire
 *
 * Le gaspillage que ce script corrige est celui du jalon 7-A : les visuels etaient servis en
 * `no-cache`, a 400 ou 500 Ko l'unite, et l'egress en cache avait atteint deux fois le quota du plan
 * gratuit. Il agit **sur les objets eux-memes** : le parc deja installe en profite sans mise a jour.
 *
 * Trois proprietes, et chacune a une raison :
 *
 *   - **Le chemin ne change jamais.** Trois adresses du bucket vivent dans le binaire de la 6.2.1 —
 *     `assets/locations.json` pour le CREMI, `src/shared/etablissements/socle.ts` pour les deux
 *     logos — et ne peuvent pas recevoir de `?v=N`. Elles doivent rester valides ; c'est l'`ETag`
 *     qui leur porte les nouveaux octets. Le format, lui, est annonce par le `Content-Type`, pas par
 *     l'extension.
 *   - **Rejoue a vide, il ne change rien.** Un objet qui porte deja un cache d'un an est ignore
 *     (plan.mjs), donc la seconde passe n'a plus rien a faire.
 *   - **Le `?v=N` ne part que si les octets ont change.** Un objet repose a l'identique n'a rien a
 *     faire recharger ; une adresse bumpee pour rien ferait retelecharger tout le parc.
 *
 * La cle `service_role` est requise, comme pour la publication des Blueprints.
 *
 * Voir docs/phase-7/7-a-bande-passante.md et docs/backend.md.
 */

import { config as chargerEnv } from 'dotenv';

// dotenv 17 annonce chaque chargement sur la sortie standard ; un outil de publication doit rester
// lisible dans un terminal comme dans un journal de CI.
chargerEnv({ quiet: true });

import sharp from 'sharp';

import { config, rest } from '../blueprints/base.mjs';
import { EN_TETE_UN_AN, planifier } from './plan.mjs';
import { cheminDObjet, versionner } from './versionner.mjs';

const BUCKET = 'media';

/**
 * Les colonnes qui portent une adresse du bucket.
 *
 * `etablissements.logo_url` n'est pas dans la liste du jalon et y figure quand meme : les deux logos
 * sont bien dans `media`, et les oublier laisserait une adresse hors de la regle le jour ou l'un
 * d'eux serait re-encode.
 */
const COLONNES = [
    { table: 'annonces', cle: ['id'], simples: ['image_url'], tableaux: ['images'] },
    { table: 'visuels', cle: ['domaine', 'cle'], simples: ['image_url'], tableaux: [] },
    { table: 'batiments', cle: ['code'], simples: ['image_url'], tableaux: [] },
    { table: 'etablissements', cle: ['code'], simples: ['logo_url'], tableaux: [] },
];

function lireArguments(argv) {
    const args = { dryRun: false };
    for (const arg of argv) {
        if (arg === '--dry-run') args.dryRun = true;
        else throw new Error(`argument inconnu : ${arg}`);
    }
    return args;
}

function entetes(cle, extra = {}) {
    return { apikey: cle, Authorization: `Bearer ${cle}`, ...extra };
}

/** Les objets d'un prefixe. Une entree sans metadonnee est un dossier, pas un objet. */
async function listerPrefixe({ urlBase, cle }, prefixe) {
    const reponse = await fetch(`${urlBase}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: entetes(cle, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prefix: prefixe, limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!reponse.ok) throw new Error(`liste de ${prefixe || '/'} : ${reponse.status} ${await reponse.text()}`);
    return reponse.json();
}

/** Le bucket entier, a deux niveaux : la racine ne rend que des dossiers. */
async function listerBucket(base) {
    const objets = [];
    for (const dossier of await listerPrefixe(base, '')) {
        if (dossier.metadata) continue;
        for (const entree of await listerPrefixe(base, dossier.name)) {
            if (!entree.metadata) continue;
            objets.push({
                chemin: `${dossier.name}/${entree.name}`,
                taille: entree.metadata.size ?? 0,
                mime: entree.metadata.mimetype,
                cache: entree.metadata.cacheControl,
            });
        }
    }
    return objets;
}

/**
 * Les octets d'un objet.
 *
 * Le parametre d'unicite n'est pas de la superstition : le bucket est servi par un CDN, et re-encoder
 * une copie perimee la republierait telle quelle.
 */
async function telecharger({ urlBase }, chemin) {
    const reponse = await fetch(`${urlBase}/storage/v1/object/public/${BUCKET}/${chemin}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
    });
    if (!reponse.ok) throw new Error(`lecture de ${chemin} : ${reponse.status}`);
    return Buffer.from(await reponse.arrayBuffer());
}

async function deposer({ urlBase, cle }, chemin, octets, mime) {
    const reponse = await fetch(`${urlBase}/storage/v1/object/${BUCKET}/${chemin}`, {
        method: 'POST',
        headers: entetes(cle, { 'Content-Type': mime, 'Cache-Control': EN_TETE_UN_AN, 'x-upsert': 'true' }),
        body: octets,
    });
    if (!reponse.ok) throw new Error(`televersement de ${chemin} : ${reponse.status} ${await reponse.text()}`);
}

/**
 * Le rendu WebP, ou les octets d'origine si le re-encodage ne gagne rien.
 *
 * La garde n'est pas theorique : un objet deja serre ressort plus lourd qu'il n'est entre, et le
 * republier alourdi serait le contraire du but. Elle rend le script sur pour un objet qu'on n'a pas
 * mesure d'avance.
 */
async function encoder(octets, decision) {
    if (decision.action !== 'reencoder') return { octets, mime: null };
    const rendu = await sharp(octets)
        .rotate()
        .resize(decision.largeur, decision.largeur, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: decision.qualite })
        .toBuffer();
    if (rendu.length >= octets.length) return { octets, mime: null };
    return { octets: rendu, mime: decision.mimeCible };
}

function raconter(decisions) {
    for (const decision of decisions) {
        const poids = `${Math.round(decision.taille / 1024)} Ko`;
        console.log(`  ${decision.chemin.padEnd(42)} ${poids.padStart(8)}  ${decision.action.padEnd(10)} ${decision.raison}`);
    }
}

/** La passe sur le bucket. Rend les chemins dont les octets ont reellement change. */
async function passerLeBucket(base, decisions, objetsDorigine) {
    const changes = new Set();
    for (const decision of decisions) {
        if (decision.action === 'ignorer') continue;
        const octets = await telecharger(base, decision.chemin);
        const { octets: sortie, mime } = await encoder(octets, decision);
        const mimeDepose = mime ?? objetsDorigine.get(decision.chemin) ?? 'application/octet-stream';
        await deposer(base, decision.chemin, sortie, mimeDepose);

        if (mime === null) {
            const pourquoi = decision.action === 'reposer' ? 'octets inchanges' : 're-encodage sans gain, octets d origine';
            console.log(`  repose    ${decision.chemin.padEnd(42)} ${String(sortie.length).padStart(8)} o  ${pourquoi}`);
            continue;
        }
        changes.add(decision.chemin);
        const gain = Math.round((1 - sortie.length / octets.length) * 100);
        console.log(`  re-encode ${decision.chemin.padEnd(42)} ${String(sortie.length).padStart(8)} o  -${gain} %`);
    }
    return changes;
}

/** L'adresse bumpee si elle designe un objet dont les octets ont change, sinon elle-meme. */
function bumper(adresse, changes, urlBase) {
    if (typeof adresse !== 'string' || adresse === '') return adresse;
    const chemin = cheminDObjet(adresse, urlBase);
    return chemin !== null && changes.has(chemin) ? versionner(adresse) : adresse;
}

/** Le correctif d'une ligne, ou `null` si rien n'y bouge. */
function corrigerLigne(ligne, descripteur, changes, urlBase) {
    const correctif = {};
    for (const colonne of descripteur.simples) {
        const suivante = bumper(ligne[colonne], changes, urlBase);
        if (suivante !== ligne[colonne]) correctif[colonne] = suivante;
    }
    for (const colonne of descripteur.tableaux) {
        const valeur = ligne[colonne];
        if (!Array.isArray(valeur)) continue;
        const suivante = valeur.map((element) => bumper(element, changes, urlBase));
        if (suivante.some((element, rang) => element !== valeur[rang])) correctif[colonne] = suivante;
    }
    return Object.keys(correctif).length === 0 ? null : correctif;
}

/**
 * Les adresses de la base, bumpees la ou l'objet a change.
 *
 * La chaine vide de `visuels` se garde toute seule : elle n'est pas une adresse, `cheminDObjet` la
 * refuse, et c'est le troisieme etat de la table — celui qui dit « n'affiche aucune image ».
 */
async function bumperLaBase(base, changes) {
    let total = 0;
    for (const descripteur of COLONNES) {
        const champs = [...descripteur.cle, ...descripteur.simples, ...descripteur.tableaux].join(',');
        const lignes = (await rest(base, `${descripteur.table}?select=${champs}`)) ?? [];
        for (const ligne of lignes) {
            const correctif = corrigerLigne(ligne, descripteur, changes, base.urlBase);
            if (correctif === null) continue;
            const filtre = descripteur.cle.map((colonne) => `${colonne}=eq.${encodeURIComponent(ligne[colonne])}`).join('&');
            await rest(base, `${descripteur.table}?${filtre}`, { method: 'PATCH', body: JSON.stringify(correctif) });
            const quoi = Object.keys(correctif).join(', ');
            console.log(`  ${descripteur.table.padEnd(16)} ${descripteur.cle.map((c) => ligne[c]).join('/').padEnd(40)} ${quoi}`);
            total += 1;
        }
    }
    return total;
}

async function main() {
    const args = lireArguments(process.argv.slice(2));
    const base = config();

    const objets = await listerBucket(base);
    const decisions = planifier(objets);
    const aFaire = decisions.filter((decision) => decision.action !== 'ignorer');

    console.log(`${objets.length} objet(s) dans le bucket ${BUCKET} :\n`);
    raconter(decisions);

    if (aFaire.length === 0) {
        // « Rejoue a vide, le script ne change rien » est une propriete, pas une politesse.
        console.log('\nRien a faire : tout le bucket porte deja un cache d un an.');
        return;
    }

    if (args.dryRun) {
        const reencodes = aFaire.filter((decision) => decision.action === 'reencoder').length;
        console.log(`\n--dry-run : ${reencodes} re-encode(s), ${aFaire.length - reencodes} repose(s), rien n a ete televerse.`);
        return;
    }

    console.log('');
    const mimes = new Map(objets.map((objet) => [objet.chemin, objet.mime]));
    const changes = await passerLeBucket(base, decisions, mimes);

    if (changes.size === 0) {
        console.log('\nAucun octet n a change : aucune adresse a bumper.');
        return;
    }
    console.log(`\n${changes.size} objet(s) re-encode(s) — les adresses que la base porte sont bumpees :\n`);
    const lignes = await bumperLaBase(base, changes);
    console.log(`\n${lignes} ligne(s) mise(s) a jour. Les telephones les reliront au prochain retour au premier plan.`);
}

main().catch((erreur) => {
    console.error(`\nEchec de la passe : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    process.exit(1);
});

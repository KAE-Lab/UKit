/**
 * Ce que le depot dit qu'il faut publier, et les gardes qui se jouent ici plutot que sur l'appareil.
 *
 * Aucune de ces verifications n'a de raison d'attendre le telephone : un fichier livre sous un nom
 * qui n'est pas le sien remplacerait un Blueprint par un autre, une version qui ne bat pas le socle
 * n'atteindrait jamais personne, et un document invalide serait refuse apres avoir traverse le
 * reseau. Les faire ici coute une seconde ; les decouvrir la-bas coute une soiree.
 *
 * Ce module ne parle a rien : ni base, ni bucket. Il lit des fichiers et rend un manifeste.
 *
 * Voir docs/blueprints.md et docs/phase-6/6-c-livraison.md.
 */

import { validateBlueprintData, validateForAct } from '@aetherius/engine';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BLUEPRINTS = join(ROOT, 'blueprints');

/** La version du **format** de manifeste. Toute autre valeur fait ignorer le manifeste entier. */
export const MANIFEST_FORMAT = '1';

/** Le chemin du manifeste dans le bucket. Le client le resout comme base des URLs relatives. */
export const MANIFEST_OBJET = 'manifest.json';

/** La grammaire de version du moteur : une chaine numerique pointee, sans pre-release ni metadonnees. */
const VERSION = /^[0-9]+(\.[0-9]+)*$/;

/**
 * Le socle du depot : un fichier, son texte exact, son empreinte, sa version.
 *
 * L'empreinte porte sur le **texte servi**, pas sur un JSON reserialise : c'est ce que l'appareil
 * rehashera, octet pour octet.
 */
export function lireSocle() {
    const fichiers = readdirSync(BLUEPRINTS).filter((nom) => nom.endsWith('.blueprint.json'));
    const versions = JSON.parse(readFileSync(join(BLUEPRINTS, 'versions.json'), 'utf8'));
    const attendus = new Set(Object.keys(versions));
    const entrees = [];

    for (const fichier of fichiers) {
        const texte = readFileSync(join(BLUEPRINTS, fichier), 'utf8');
        const document = JSON.parse(texte);
        const nom = document.name;

        const declare = versions[nom];
        if (declare === undefined) {
            throw new Error(`${fichier} declare le nom '${nom}', absent de blueprints/versions.json`);
        }
        if (!VERSION.test(declare.version ?? '')) {
            throw new Error(`${nom} : version '${declare.version}' — attendu une chaine numerique pointee`);
        }
        if (declare.min_engine !== undefined && !VERSION.test(declare.min_engine)) {
            throw new Error(`${nom} : min_engine '${declare.min_engine}' — attendu une chaine numerique pointee`);
        }

        // La validation complete, avec le moteur lui-meme. Un Blueprint invalide ne doit pas
        // atteindre le bucket, encore moins un appareil.
        validateForAct(validateBlueprintData(document, fichier));

        attendus.delete(nom);
        entrees.push({
            nom,
            fichier,
            texte,
            version: declare.version,
            sha256: empreinte(texte),
            ...(declare.min_engine !== undefined ? { min_engine: declare.min_engine } : {}),
        });
    }

    if (attendus.size > 0) {
        // Une entree sans fichier publierait une URL qui ne repond pas : l'appareil rejetterait une
        // correction pourtant annoncee, et rien ne dirait pourquoi.
        throw new Error(`blueprints/versions.json nomme des Blueprints sans fichier : ${[...attendus].join(', ')}`);
    }

    return entrees.sort((gauche, droite) => gauche.nom.localeCompare(droite.nom));
}

export function empreinte(texte) {
    return createHash('sha256').update(texte, 'utf8').digest('hex');
}

/**
 * Le manifeste : l'etat **voulu**, jamais un differentiel.
 *
 * Une entree qui en disparait ramene son Blueprint a la version embarquee — l'interpretation la plus
 * sure d'un manifeste partiel est toujours le socle.
 */
export function construireManifeste(socle, options = {}) {
    const desactives = new Set(options.desactives ?? []);
    const blueprints = {};

    for (const entree of socle) {
        blueprints[entree.nom] = {
            version: entree.version,
            url: entree.fichier,
            sha256: entree.sha256,
            disabled: desactives.has(entree.nom),
            ...(entree.min_engine !== undefined ? { min_engine: entree.min_engine } : {}),
        };
    }

    return {
        manifest: MANIFEST_FORMAT,
        generated_at: new Date().toISOString(),
        disabled: options.arret === true,
        blueprints,
    };
}

/**
 * Deux manifestes decrivent-ils le meme etat ?
 *
 * `generated_at` est ecarte : il change a chaque appel et ne decide de rien cote appareil. Sans cette
 * comparaison, rejouer le script a vide republierait un fichier different a chaque fois, et
 * « le script n'a rien change » cesserait d'etre verifiable.
 */
export function memeManifeste(gauche, droite) {
    if (gauche === null || droite === null) return false;
    const sans = ({ generated_at, ...reste }) => JSON.stringify(reste);
    return sans(gauche) === sans(droite);
}

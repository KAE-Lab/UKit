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
const PORTAILS = join(BLUEPRINTS, 'portails');

/**
 * Le prefixe reserve, recopie de blueprints/index.ts.
 *
 * Recopie et non importe : ce module est du Node pur et ne sait pas lire un fichier TypeScript —
 * c'est la meme raison qui a fait naitre `versions.json`. La valeur est verrouillee par un test
 * (src/shared/aetherius/delivery.test.ts), ce qui evite qu'une divergence passe inapercue.
 */
const PREFIXE_RESERVE = 'ukit.portail.';

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
    return lireDossier(BLUEPRINTS, '', { horsSocle: false });
}

/**
 * Tout ce que le depot publie : le socle embarque, puis les portails hors socle.
 *
 * La verification de couverture se fait **ici** et non dans chaque dossier : un nom de
 * `versions.json` doit avoir exactement un fichier, quel que soit le dossier ou il vit. La faire par
 * dossier obligerait a deviner lequel devait le porter — et le prefixe ne le dit pas, puisque le
 * portail de Bordeaux est a la fois embarque et sous le prefixe.
 */
export function lireTout() {
    const socle = lireSocle();
    const portails = lirePortails();
    const publies = [...socle, ...portails];

    const versions = JSON.parse(readFileSync(join(BLUEPRINTS, 'versions.json'), 'utf8'));
    const manquants = Object.keys(versions).filter((nom) => !publies.some((entree) => entree.nom === nom));
    if (manquants.length > 0) {
        // Une entree sans fichier publierait une URL qui ne repond pas : l'appareil rejetterait une
        // correction pourtant annoncee, et rien ne dirait pourquoi.
        throw new Error(`blueprints/versions.json nomme des Blueprints sans fichier : ${manquants.join(', ')}`);
    }

    const doublons = publies.map((entree) => entree.nom).filter((nom, i, tous) => tous.indexOf(nom) !== i);
    if (doublons.length > 0) {
        // Deux fichiers du meme nom : le manifeste n'en designerait qu'un, et lequel dependrait de
        // l'ordre de lecture du systeme de fichiers.
        throw new Error(`deux fichiers declarent le meme nom : ${[...new Set(doublons)].join(', ')}`);
    }

    return { socle, portails, publies };
}

/**
 * Les Blueprints **hors socle** : les portails d'etablissements que le binaire n'embarque pas.
 *
 * Ils n'existent que depuis le jalon 6-G, et c'est tout l'interet du jalon : ajouter une universite
 * ne demande plus une release, seulement un fichier publie. Ils vivent dans un sous-dossier plutot
 * qu'a cote du socle pour que la difference se voie a la racine du depot — `blueprints/index.ts`
 * n'en importe aucun, et c'est verifiable d'un coup d'oeil.
 *
 * Ils passent les memes gardes que le socle, **plus une** : leur nom doit etre couvert par le prefixe
 * reserve. C'est la garde symetrique de celle de l'appareil (`allowNew.prefix`) : publier un fichier
 * que le registre ignorera est une erreur qu'il vaut mieux voir dans un terminal que chercher dans un
 * panneau de diagnostic une semaine plus tard.
 */
export function lirePortails() {
    return lireDossier(PORTAILS, 'portails/', { horsSocle: true });
}

/**
 * Le contenu d'un dossier de Blueprints, valide.
 *
 * `prefixeChemin` est prefixe au nom de fichier : c'est **l'URL relative** que le manifeste publiera,
 * et c'est aussi le chemin de l'objet dans le bucket. Les deux doivent coincider, sans quoi
 * l'appareil telechargerait une adresse qui ne repond pas.
 */
function lireDossier(dossier, prefixeChemin, { horsSocle }) {
    const fichiers = readdirSync(dossier).filter((nom) => nom.endsWith('.blueprint.json'));
    const versions = JSON.parse(readFileSync(join(BLUEPRINTS, 'versions.json'), 'utf8'));
    const entrees = [];

    for (const fichier of fichiers) {
        const texte = readFileSync(join(dossier, fichier), 'utf8');
        const document = JSON.parse(texte);
        const nom = document.name;

        if (horsSocle && !nom.startsWith(PREFIXE_RESERVE)) {
            // Le registre de l'appareil l'ignorerait en silence : le refuser ici est la seule facon
            // que l'auteur l'apprenne au moment ou il peut encore le corriger.
            throw new Error(
                `${fichier} declare le nom '${nom}' : un Blueprint hors socle doit vivre sous '${PREFIXE_RESERVE}'`,
            );
        }

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

        entrees.push({
            nom,
            fichier: `${prefixeChemin}${fichier}`,
            texte,
            version: declare.version,
            sha256: empreinte(texte),
            ...(declare.min_engine !== undefined ? { min_engine: declare.min_engine } : {}),
        });
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

/**
 * Ce que les cinq cas du jalon 6-D partagent : jouer un Blueprint, et les libelles de repli.
 *
 * Ce fichier ne porte **aucune** projection : chaque cas recopie la sienne, des deux cotes, parce
 * qu'un cas de parite qui importerait le service suivrait ses evolutions et cesserait de comparer
 * quoi que ce soit (tools/parity/README.md). Ce qui est mutualise ici est le harnais, pas la reponse.
 */

import { RunEngine, describeFailure, validateBlueprintData } from '@aetherius/engine';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Les libelles de repli, en dur.
 *
 * `Translator` lit la langue choisie et n'est pas jouable sous Node ; les deux chemins d'un cas
 * utilisent donc la meme constante. Ce que la parite compare est la **donnee**, pas la traduction.
 */
export const UNSPECIFIED_HOURS = 'Horaires non specifies';
export const CATEGORY = 'Categorie';
export const CAMPUS = 'Campus';

/**
 * Joue un Blueprint du depot avec le moteur nu.
 *
 * `RunEngine` et non la facade `Aetherius` : celle-ci vit dans `@aetherius/react-native` et importe
 * React Native. C'est la seule difference avec ce que fait l'application, et elle ne porte ni la
 * requete, ni l'extraction, ni les expressions.
 */
export async function jouer(fichier, inputs = {}) {
    const source = readFileSync(join(ROOT, 'blueprints', fichier), 'utf8');
    const blueprint = validateBlueprintData(JSON.parse(source), fichier);

    const result = await new RunEngine().run(blueprint, { inputs });
    const failure = describeFailure(result);
    if (failure !== undefined) throw new Error(`blueprint: ${failure.kind} — ${failure.message}`);

    return result.outputs;
}

/** Les en-tetes imites du client web Affluences, recopies pour le chemin historique. */
export const ENTETES_AFFLUENCES = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'fr',
    'x-service-name': 'website',
    Origin: 'https://affluences.com',
    Referer: 'https://affluences.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

/** Une liste, quelle que soit l arite rendue par l extraction. */
export function commeListe(valeur) {
    if (valeur === null || valeur === undefined) return [];
    return Array.isArray(valeur) ? valeur : [valeur];
}

/**
 * Une distance comparable.
 *
 * Les deux chemins calculent le meme Haversine sur les memes doubles, mais comparer des flottants
 * bruts ferait echouer un cas pour un bit de mantisse. Le metre suffit largement a prouver que le
 * calcul est le meme, et c'est deja bien plus fin que ce que l'ecran affiche.
 */
export function distanceComparable(valeur) {
    return typeof valeur === 'number' && Number.isFinite(valeur) ? Number(valeur.toFixed(3)) : null;
}

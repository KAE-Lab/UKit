/**
 * Ce que les cas de parite partagent : jouer un Blueprint, capturer ce qu'il a reellement emis, et
 * les libelles de repli.
 *
 * Ce fichier ne porte **aucune** projection : chaque cas recopie la sienne, des deux cotes, parce
 * qu'un cas de parite qui importerait le service suivrait ses evolutions et cesserait de comparer
 * quoi que ce soit (tools/parity/README.md). Ce qui est mutualise ici est le harnais, pas la reponse.
 */

import { RunEngine, describeFailure, validateBlueprintData } from '@aetherius/engine';
import qs from 'qs';
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

/**
 * Le meme run, avec le `fetch` de l'hote remplace par un espion.
 *
 * Ce que ca achete : la comparaison porte sur le **corps reellement emis** par le moteur, pas sur une
 * reimplementation de son encodeur qui ne prouverait que son propre accord avec elle-meme. C'est le
 * point que le jalon 6-E designe comme le plus susceptible de casser en silence — un corps qui
 * differe d'un caractere ne leve rien, la requete part, et le serveur repond autre chose.
 *
 * Rend `{ outputs, requetes }`, ou chaque requete porte sa methode, son URL et son corps.
 */
export async function jouerEnCapturant(fichier, inputs = {}) {
    const source = readFileSync(join(ROOT, 'blueprints', fichier), 'utf8');
    const blueprint = validateBlueprintData(JSON.parse(source), fichier);

    const requetes = [];
    const espion = async (url, init = {}) => {
        requetes.push({ url: String(url), method: init.method ?? 'GET', body: init.body ?? null });
        return fetch(url, init);
    };

    const result = await new RunEngine().run(blueprint, { inputs, fetch: espion });
    const failure = describeFailure(result);
    if (failure !== undefined) throw new Error(`blueprint: ${failure.kind} — ${failure.message}`);

    return { outputs: result.outputs, requetes };
}

/**
 * Compare le corps emis par le moteur a celui que produisait `qs`, et leve si les deux different.
 *
 * **Un ecart connu est normalise, un seul, et il est mesure.** `qs` sort en RFC3986 (une espace
 * devient `%20`), l'encodeur du moteur reproduit `quote_plus` de Python (une espace devient `+`).
 * Partout ailleurs les deux coincident au caractere pres, `!'()*~` compris. Les deux formes ont ete
 * postees au serveur de l'universite le 2026-08-09, sur un identifiant de salle porteur d'espaces,
 * d'accents, d'un point et d'une barre oblique — meme statut, meme reponse, au SHA-256 pres. La
 * comparaison porte donc sur la **sequence de paires decodees**, ce qui garde l'ordre des cles,
 * la repetition de `federationIds[]` et chaque octet des valeurs.
 *
 * @throws {Error} le corps emis ne correspond pas a celui du chemin historique.
 */
export function comparerCorps(nom, emis, donneesLegacy) {
    const attendu = paires(qs.stringify(donneesLegacy, { arrayFormat: 'repeat' }));
    const obtenu = paires(emis ?? '');

    if (JSON.stringify(attendu) !== JSON.stringify(obtenu)) {
        throw new Error(
            `encodage du corps different pour ${nom}\n` +
                `        moteur : ${JSON.stringify(obtenu)}\n` +
                `        qs     : ${JSON.stringify(attendu)}`,
        );
    }
}

/** Les paires d'un corps `x-www-form-urlencoded`, decodees, dans l'ordre d'emission. */
function paires(corps) {
    return [...new URLSearchParams(corps).entries()];
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

/**
 * Plusieurs sous-cas en une seule liste comparable.
 *
 * Chaque sous-cas ouvre par une ligne de resume portant son **nombre d'elements**. Sans elle, un
 * sous-cas legitimement vide — un dimanche, une semaine de vacances — ne serait represente par rien,
 * et une regression qui le viderait passerait inapercue.
 *
 * Ce n'est pas une projection : c'est du harnais, et les deux chemins l'appellent a l'identique.
 */
export function agreger(blocs) {
    const sortie = [];
    for (const [cas, elements] of blocs) {
        sortie.push({ cas, resume: true, nombre: elements.length });
        for (const element of elements) sortie.push({ cas, element });
    }
    return sortie;
}

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

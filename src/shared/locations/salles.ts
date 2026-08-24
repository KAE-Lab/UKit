/**
 * Reconnaitre un batiment dans un libelle de salle, selon ce que l'etablissement ecrit.
 *
 * C'etait onze lignes de code bordelais dans `AppCore` jusqu'au jalon 6-I : une decoupe sur ` | `
 * puis `/`, et un motif `([A-Z][0-9]+)` qui attend `A29` ou `B18`. Le referentiel des lieux, lui,
 * etait deja migre depuis le jalon 6-D — 73 batiments en base, corrigeables sans release. Ce qui
 * **relie** un cours a un batiment ne l'etait pas, et c'est exactement la constante bordelaise
 * deguisee en regle generale que le jalon 6-G a corrigee onze fois ailleurs : aucune salle de
 * Bordeaux INP ne correspond a ce motif — elles s'ecrivent `CD-O204`, `CA-N103`,
 * `E103 - FabLaB,CD-O108`.
 *
 * Le format est donc une **donnee de catalogue** (colonne `salles`), et une nouvelle universite se
 * branche par publication. Ce module est le seul endroit qui **execute** ce que la base publie, et
 * c'est pourquoi il est le seul a porter les gardes : un motif est compile une fois, mis en cache, et
 * un motif que le moteur d'expressions refuse retombe sur le comportement historique plutot que de
 * casser une fiche de cours. La ligne de defense reelle reste ailleurs — l'acces au projet Supabase
 * est un acces de production, comme pour n'importe quel Blueprint publie (docs/blueprints.md).
 *
 * Il vit ici plutot que dans `AppCore` pour deux raisons : ce dernier depasse deja les 400 lignes, et
 * la reconnaissance de salle appartient au referentiel des lieux, pas aux reglages.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-i-planning-universel.md.
 */

import { formatSallesActif, type FormatSalles } from '../etablissements/catalogue';
import { getBuildingRef, type BuildingRef } from './referentiel';

/** Un lieu resolu, tel que la fiche de cours et la carte le consomment. */
export type LieuDeCours = BuildingRef & { title: string };

/**
 * Le motif compile du format courant, garde en cache.
 *
 * Un `RegExp` se recompile a chaque appel sinon, et `getLocations` est appele pendant un rendu. Le
 * cache est indexe par la **source** du motif : changer d'etablissement change la source, donc
 * invalide l'entree sans qu'aucun code n'ait a s'en souvenir.
 */
let motifCompile: { source: string; regex: RegExp | null } = { source: '', regex: null };

function compiler(motif: string): RegExp | null {
    if (motifCompile.source === motif) return motifCompile.regex;

    let regex: RegExp | null = null;
    try {
        regex = RegExp(motif, 'im');
    } catch {
        // Un motif publie illisible ne doit pas casser un ecran : on le dit, et le format par defaut
        // reprend la main au prochain appel via `formatSallesActif()`.
        console.warn(`[salles] motif illisible, ignore : ${motif}`);
    }

    motifCompile = { source: motif, regex };
    return regex;
}

/** Le lieu portant ce code, ou `null`. Le titre affiche est le code lui-meme, comme avant. */
function lieu(code: string): LieuDeCours | null {
    const reference = getBuildingRef(code);
    return reference ? { title: code, ...reference } : null;
}

/**
 * Decoupe un libelle en codes candidats, selon les separateurs de l'etablissement.
 *
 * Les separateurs ne jouent **pas le meme role**, et c'est le comportement d'origine, pas une
 * subtilite ajoutee : le premier **enumere** (un libelle peut nommer plusieurs salles), les suivants
 * **tronquent** (`A29/Amphitheatre Charles DARWIN` designe le batiment `A29`, pas deux lieux). Les
 * traiter tous comme des enumerateurs ferait chercher un batiment nomme « AmphitheatreCharlesDARWIN ».
 *
 * `replace(' ', '')` ne retire que la **premiere** espace, comme le code d'origine. Le generaliser
 * changerait ce que resout un libelle bordelais, et ce jalon n'a aucune mesure qui le justifie.
 */
function candidats(libelle: string, format: FormatSalles): string[] {
    const [enumerateur, ...troncatures] = format.separateurs;

    return libelle
        .split(enumerateur)
        .map((segment) => troncatures.reduce((tete, separateur) => tete.split(separateur)[0], segment))
        .map((segment) => segment.replace(' ', ''))
        .filter((segment) => segment !== '');
}

/**
 * Les lieux nommes par un libelle de salle, par decoupe.
 *
 * Le segment est d'abord essaye **tel quel**, et le motif ne sert que de repli. L'ordre n'est pas
 * indifferent : le referentiel bordelais porte `A5bis`, `A9a`, `A10bis`, et appliquer d'emblee
 * `([A-Z][0-9]+)` a `A5bis` capturerait `A5` — un **autre batiment**, donc une carte fausse. Un code
 * INP comme `CD-O204` ne resout pas tel quel, et c'est la que le motif prend la main pour en tirer
 * `CD`. Les deux etablissements passent ainsi par le meme chemin sans que le premier change.
 */
export function getLocations(libelle: string, format: FormatSalles | null = formatSallesActif()): LieuDeCours[] {
    // Un etablissement sans referentiel de lieux ne rend **aucun** lieu, et surtout pas ceux d'un
    // autre : appliquer le format bordelais a un libelle etranger capturerait un code qui existe chez
    // nous — `A28` est un vrai batiment — et poserait un marqueur a Talence pour une salle qui n'y est
    // pas. Une carte fausse est pire qu'une carte vide (jalon 6-I, repris tel quel ici).
    if (format === null) return [];

    const regex = compiler(format.motif);
    const lieux: LieuDeCours[] = [];
    const vus = new Set<string>();

    for (const segment of candidats(libelle, format)) {
        let trouve = lieu(segment);
        if (trouve === null) {
            const capture = regex?.exec(segment);
            if (capture && capture.length > 1) trouve = lieu(capture[1]);
        }
        // Un meme batiment ne se marque qu'une fois. Le cas est rare chez Celcat et **frequent** dans
        // un iCalendar : `CA-N001,CA-N103,CC-S101,CD-O202,CD-O207` nomme cinq salles pour trois
        // batiments, et poser cinq marqueurs superposes ne dirait rien de plus a personne.
        if (trouve && !vus.has(trouve.title)) {
            vus.add(trouve.title);
            lieux.push(trouve);
        }
    }
    return lieux;
}

/**
 * Le premier lieu nomme **quelque part** dans un texte, sans decoupe.
 *
 * Le repli de la fiche de cours, pour les descriptions ou la salle n'est pas isolee sur sa ligne.
 */
export function getLocationsInText(texte: string, format: FormatSalles | null = formatSallesActif()): LieuDeCours[] {
    if (format === null) return [];

    const capture = compiler(format.motif)?.exec(texte);
    if (!capture || capture.length < 2) return [];

    const trouve = lieu(capture[1]);
    return trouve ? [trouve] : [];
}

/**
 * Les lieux nommes par les **batiments declares** d'un cours (`Batiment A28`).
 *
 * C'est la voie fiable, et elle passe par la meme reconnaissance que les libelles de salle : un
 * segment est essaye tel quel, puis le motif de l'etablissement prend la main — `Batiment A28` ne
 * resout pas tel quel, `A28` oui. Rien de nouveau n'est invente pour ce champ.
 *
 * Le garde de `getLocations` s'applique donc aussi : un etablissement sans referentiel de lieux ne
 * rend **aucun** lieu, plutot que d'appliquer le format bordelais a des libelles etrangers. Une carte
 * fausse est pire qu'une carte vide.
 */
export function lieuxDesSites(
    sites: readonly string[] | undefined,
    format: FormatSalles | null = formatSallesActif(),
): LieuDeCours[] {
    const lieux: LieuDeCours[] = [];
    const vus = new Set<string>();

    for (const site of sites ?? []) {
        for (const trouve of getLocations(site, format)) {
            if (vus.has(trouve.title)) continue;
            vus.add(trouve.title);
            lieux.push(trouve);
        }
    }

    return lieux;
}

/**
 * La ligne de description susceptible de porter une salle, ou `''`.
 *
 * Le rang de depart est une donnee d'etablissement (`FormatSalles.depuis`) parce qu'il n'est pas le
 * meme selon la source : une description Celcat porte le groupe et l'enseignant avant la salle, donc
 * la fiche de cours commencait a la troisieme ligne ; un evenement iCalendar tient sa salle d'un
 * champ separe (`LOCATION`) que `IcsMapping` remet **en tete**. Chercher a partir de la premiere
 * ligne dans les deux cas aurait fait matcher un code de groupe bordelais comme un batiment.
 *
 * Les lignes qui ne portent qu'une enumeration de semaines (`3,5-7,9-11`) sont ecartees : elles
 * occupent la place d'une salle et n'en sont pas une.
 */
export function ligneDeSalle(description: string, format: FormatSalles | null = formatSallesActif()): string {
    // Sans referentiel, aucune ligne n'est « la salle » : la fiche de cours affiche alors sa
    // description telle quelle, ce qui reste juste — c'est la carte qui disparait, pas le texte.
    if (format === null) return '';

    const lignes = (description ?? '')
        .split('\n')
        .map((ligne) => ligne.trim())
        .filter((ligne) => ligne !== '');

    const candidates = lignes
        .slice(format.depuis)
        .filter((ligne) => !/^([sS]emaines?\s*:?\s*)?[\d\s,\-]+$/.test(ligne));

    return candidates[0] ?? '';
}

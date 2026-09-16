/**
 * Ce qu'il faut faire de chaque objet du bucket `media`, decide sans rien telecharger.
 *
 * Trois sorties, et chacune repose sur une mesure du 2026-09-16 plutot que sur une intention :
 *
 *   - `ignorer`   l'objet porte deja un cache d'un an. Le retoucher couterait un `?v=N` sur les
 *                 lignes qui le citent — pour la seule annonce active, 11 Ko — sans rien gagner.
 *                 C'est aussi ce qui rend le script rejouable a vide : passe deux fois, il ne
 *                 change rien.
 *   - `reposer`   l'objet est deja un WebP. Les deux logos mesures GROSSISSENT au re-encodage
 *                 (+17 % et +31 %) : ce sont des WebP serres, avec un canal alpha qu'un
 *                 re-encodage detruirait. Seul l'en-tete change, les octets sont reposes tels quels.
 *   - `reencoder` tout le reste, en WebP qualite 75, borne au grand cote de son usage.
 *
 * Storage n'expose pas de mise a jour d'une metadonnee seule : c'est pourquoi `reposer` est un
 * televersement, et non une correction en place.
 *
 * Pur : joue par `npm test` (plan.test.ts).
 */

/** Une annee en secondes, la valeur de `max-age` visee. */
export const UN_AN = 31536000;

export const EN_TETE_UN_AN = `max-age=${UN_AN}`;

export const QUALITE_WEBP = 75;

export const MIME_WEBP = 'image/webp';

/**
 * Le grand cote, par dossier du bucket.
 *
 * Une affiche d'annonce est vue au plus en pleine largeur d'un telephone, une photo de restaurant ou
 * de batiment sert aussi de fond de carte : d'ou les deux valeurs. Un dossier inconnu prend la plus
 * large des deux — mieux vaut un objet un peu lourd qu'un visuel qu'on a ampute sans le savoir.
 */
export const LARGEUR_PAR_DOSSIER = {
    annonces: 1080,
    restaurants: 1200,
    bibliotheques: 1200,
    batiments: 1200,
    etablissements: 1280,
};

export const LARGEUR_PAR_DEFAUT = 1200;

/**
 * Les secondes de cache que porte un en-tete, ou 0 s'il n'en promet aucune.
 *
 * `no-cache` et une valeur absente donnent 0 : les deux veulent dire « a revalider a chaque fois »,
 * et c'est exactement ce que ce jalon corrige.
 *
 * @param {string | null | undefined} enTete
 * @returns {number}
 */
export function secondesDeCache(enTete) {
    if (typeof enTete !== 'string') return 0;
    const trouve = /max-age\s*=\s*(\d+)/i.exec(enTete);
    return trouve === null ? 0 : Number(trouve[1]);
}

/**
 * Le dossier d'un chemin d'objet : `annonces/ukit.png` donne `annonces`.
 *
 * @param {string} chemin
 * @returns {string}
 */
export function dossierDe(chemin) {
    const coupe = chemin.indexOf('/');
    return coupe < 0 ? '' : chemin.slice(0, coupe);
}

/**
 * @param {string} chemin
 * @returns {number}
 */
export function largeurPour(chemin) {
    return LARGEUR_PAR_DOSSIER[dossierDe(chemin)] ?? LARGEUR_PAR_DEFAUT;
}

/**
 * @typedef {object} ObjetDuBucket
 * @property {string} chemin       le chemin complet dans le bucket (`annonces/ukit.png`)
 * @property {number} taille       en octets, telle que la liste la rend
 * @property {string} [mime]       le type declare a l'origine
 * @property {string} [cache]      le `cacheControl` porte par l'objet
 */

/**
 * @typedef {object} Decision
 * @property {string} chemin
 * @property {'ignorer' | 'reposer' | 'reencoder'} action
 * @property {number} taille
 * @property {string} raison       une phrase, imprimee telle quelle par le script
 * @property {number} [largeur]    le grand cote vise, pour `reencoder`
 * @property {number} [qualite]    pour `reencoder`
 * @property {string} [mimeCible]  pour `reencoder`
 */

/**
 * Le plan, objet par objet, dans l'ordre recu.
 *
 * @param {ObjetDuBucket[]} objets
 * @returns {Decision[]}
 */
export function planifier(objets) {
    return objets.map((objet) => decider(objet));
}

/**
 * @param {ObjetDuBucket} objet
 * @returns {Decision}
 */
function decider(objet) {
    const socle = { chemin: objet.chemin, taille: objet.taille };

    if (secondesDeCache(objet.cache) >= UN_AN) {
        return { ...socle, action: 'ignorer', raison: 'porte deja un cache d un an' };
    }
    if (objet.mime === MIME_WEBP) {
        return { ...socle, action: 'reposer', raison: 'deja en WebP : en-tete seul, octets inchanges' };
    }
    return {
        ...socle,
        action: 'reencoder',
        raison: `WebP q${QUALITE_WEBP}, grand cote ${largeurPour(objet.chemin)} px`,
        largeur: largeurPour(objet.chemin),
        qualite: QUALITE_WEBP,
        mimeCible: MIME_WEBP,
    };
}

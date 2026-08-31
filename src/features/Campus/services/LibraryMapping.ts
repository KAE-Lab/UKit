/**
 * Le contrat des bibliotheques, et la traduction depuis les sorties des Blueprints Affluences.
 *
 * Separe de `LibraryService` pour la meme raison que `BdeMapping` : rien de plateforme ici, donc le
 * piege qui decide de tout — l'arite d'une extraction — se verrouille par un test
 * (LibraryMapping.test.ts) plutot que par une relecture.
 *
 * Voir docs/features/campus-bibliotheques.md.
 */

/** Ce qu'un ecran manipule. `lng` et non `lon` : le contrat ne bouge pas avec la source. */
export interface LibraryInfo {
    id: string;
    name: string;
    campus: string;
    lat: number;
    lng: number;
    slug: string;
    distance?: number;
    imageUrl?: string;
}

export interface AffluencesData {
    isOpen: boolean;
    occupancyRate: number | null;
    closingTime?: string;
    openingText?: string;
}

export interface TimetableEntry {
    day: string;
    isToday: boolean;
    openingHours: {
        openingHour: string;
        closingHour: string;
    }[];
}

/** Une ligne de `outputs.sites`, telle que le Blueprint la nomme. */
export interface SiteExtrait {
    id?: unknown;
    nom?: unknown;
    slug?: unknown;
    ville?: unknown;
    lat?: unknown;
    lon?: unknown;
    categories?: unknown;
    images?: unknown;
    image_poster?: unknown;
    distance_estimee?: unknown;
}

/** Les sorties de `ukit.campus.bibliotheque-affluence`. */
export interface AffluenceExtraite {
    ouvert?: unknown;
    ferme_a?: unknown;
    texte_ouverture?: unknown;
    pourcentage?: unknown;
    occupation?: unknown;
}

/** Une ligne de `outputs.entrees`. `ouvertures` est le sous-arbre des paires ouverture/fermeture. */
export interface HoraireExtrait {
    jour?: unknown;
    aujourdhui?: unknown;
    ouvertures?: unknown;
}

/** Les categories de lieu retenues : bibliotheques classiques et universitaires. */
export const CATEGORIES_BU = [1, 20];

function texte(valeur: unknown): string | undefined {
    return typeof valeur === 'string' && valeur !== '' ? valeur : undefined;
}

function nombre(valeur: unknown): number | undefined {
    return typeof valeur === 'number' && !Number.isNaN(valeur) ? valeur : undefined;
}

/**
 * Le piege d'arite, traite en un endroit.
 *
 * Un chemin d'extraction qui ne correspond a rien rend `null`, une seule correspondance rend **la
 * valeur**, plusieurs rendent **la liste**. Les sites Affluences n'ayant qu'une categorie — c'est le
 * cas nominal, pas le cas limite — `$.categories[*].id` rend `20` et non `[20]`. Les deux moteurs se
 * comportent a l'identique ; c'est donc a l'appelant de normaliser.
 */
export function commeListe<T>(valeur: unknown): T[] {
    if (valeur === null || valeur === undefined) return [];
    return Array.isArray(valeur) ? (valeur as T[]) : [valeur as T];
}

/** Un site est retenu si l'une de ses categories est une bibliotheque. */
export function estBibliotheque(brut: SiteExtrait): boolean {
    return commeListe<number>(brut.categories).some((id) => CATEGORIES_BU.includes(id));
}

/**
 * Le visuel : la premiere image du site, a defaut son affiche.
 *
 * `images` descend en sous-arbre plutot qu'en `$.images[*]`, precisement pour que le choix « la
 * premiere » reste un choix et non un effet de l'arite.
 */
export function visuelDuSite(brut: SiteExtrait): string | undefined {
    const images = commeListe<unknown>(brut.images);
    return texte(images[0]) ?? texte(brut.image_poster);
}

/**
 * Un site projete, avant que la distance ne soit calculee.
 *
 * Les coordonnees y sont **facultatives**, contrairement au contrat d'ecran : un site peut n'en
 * porter aucune, et c'est precisement ce cas qui decide du repli de distance. Le dire dans le type
 * evite de le decouvrir a l'execution.
 */
export interface SiteProjete extends Omit<LibraryInfo, 'lat' | 'lng'> {
    lat?: number;
    lng?: number;
    /** La distance du fournisseur, en metres et **relative au point de balayage**, pas a l'etudiant. */
    distanceEstimee?: number;
}

/**
 * Projette un site extrait.
 *
 * La distance n'est pas posee ici : elle depend de la position de l'utilisateur, que ce module n'a
 * pas et ne doit pas avoir.
 */
export function projeterSite(brut: SiteExtrait, repliCampus: string): SiteProjete {
    return {
        id: String(brut.id ?? ''),
        name: texte(brut.nom) ?? '',
        campus: texte(brut.ville) ?? repliCampus,
        lat: nombre(brut.lat),
        lng: nombre(brut.lon),
        slug: texte(brut.slug) ?? '',
        imageUrl: visuelDuSite(brut),
        distanceEstimee: nombre(brut.distance_estimee),
    };
}

/**
 * Projette l'affluence en direct.
 *
 * Le taux se lit a deux emplacements selon les sites, et les deux formes coexistent : le Blueprint
 * extrait les deux, le choix reste ici. Un site ferme rend `liveAttendance` nul, donc les deux
 * chemins rendent `null` — c'est un resultat, pas une absence de reponse.
 */
export function projeterAffluence(brut: AffluenceExtraite): AffluencesData {
    const pourcentage = nombre(brut.pourcentage);
    const occupation = nombre(brut.occupation);

    return {
        isOpen: brut.ouvert === true,
        occupancyRate: pourcentage ?? occupation ?? null,
        closingTime: texte(brut.ferme_a),
        openingText: texte(brut.texte_ouverture),
    };
}

/** Projette une journee d'horaires. Les paires ouverture/fermeture arrivent telles quelles. */
export function projeterHoraire(brut: HoraireExtrait): TimetableEntry {
    return {
        day: texte(brut.jour) ?? '',
        isToday: brut.aujourdhui === true,
        openingHours: commeListe<TimetableEntry['openingHours'][number]>(brut.ouvertures),
    };
}

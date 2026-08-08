/**
 * Le contrat des restaurants CROUS, et la traduction depuis les sorties du Blueprint.
 *
 * Separe de `CrousService` pour la meme raison que `BdeMapping` : ce module ne doit **rien** importer
 * de plateforme, ni le socle Aetherius, ni `Translator`. Ce qui est risque ici — une date au format
 * du fournisseur, des horaires servis sous une forme qui a change, un jour sans service — le devient
 * (CrousMapping.test.ts).
 *
 * Les libelles de repli arrivent donc en parametre : un Blueprint ne connait pas la langue choisie,
 * et ce module non plus.
 *
 * Voir docs/features/campus-crous.md.
 */

/** Ce qu'un ecran manipule. Les noms ne bougent pas : changer de source ne renomme pas un contrat. */
export interface CrousRestaurant {
    id: string;
    title: string;
    short_desc: string;
    lat: number;
    lon: number;
    opening: string;
    distance?: number;
    image_url?: string;
}

export interface CrousDayMenu {
    date: string | null;
    midi: { name: string; dishes: string[] }[];
    soir: { name: string; dishes: string[] }[];
}

/** Une ligne de `outputs.restaurants`, telle que le Blueprint la nomme. */
export interface RestaurantExtrait {
    code?: unknown;
    nom?: unknown;
    zone?: unknown;
    adresse?: unknown;
    lat?: unknown;
    lon?: unknown;
    horaires?: unknown;
}

/** Une ligne de `outputs.jours` : la date du fournisseur, et le sous-arbre des services. */
export interface JourExtrait {
    date?: unknown;
    repas?: unknown;
}

const API = 'https://api.croustillant.menu/v1';

function texte(valeur: unknown): string | undefined {
    return typeof valeur === 'string' && valeur !== '' ? valeur : undefined;
}

function nombre(valeur: unknown): number | undefined {
    return typeof valeur === 'number' && !Number.isNaN(valeur) ? valeur : undefined;
}

/**
 * Les horaires, tels que la source les sert **aujourd'hui**.
 *
 * Le champ etait un tableau ; il est desormais une **chaine JSON** portant ce tableau
 * (`"[\"du lundi au vendredi\", \"12h-13h45\"]"`). Le code d'origine testait `Array.isArray`, faux
 * pour les quarante-et-un restaurants de la region : l'application affichait donc « horaires non
 * specifies » partout. Les deux formes sont acceptees ici, parce qu'on ne sait pas laquelle la source
 * servira demain, et une troisieme retombe sur le libelle — c'est le seul comportement que ce jalon
 * change volontairement (docs/phase-6/6-d-campus.md).
 */
export function horairesLisibles(brut: unknown, repli: string): string {
    const lignes = commeLignes(brut);
    return lignes.length > 0 ? lignes.join(' | ') : repli;
}

function commeLignes(brut: unknown): string[] {
    if (Array.isArray(brut)) {
        return brut.filter((ligne): ligne is string => typeof ligne === 'string' && ligne !== '');
    }

    if (typeof brut === 'string' && brut.trim().startsWith('[')) {
        try {
            return commeLignes(JSON.parse(brut));
        } catch (error) {
            // Une chaine qui ressemble a du JSON sans en etre reste un libelle inconnu : mieux vaut
            // le repli traduit qu'un crochet affiche a l'ecran.
            return [];
        }
    }

    return [];
}

/**
 * Projette un restaurant extrait sur le contrat applicatif.
 *
 * `image_url` est une URL **construite** et non un champ rendu : la source expose une route de
 * previsualisation par restaurant. Un restaurant sans visuel affiche donc une image cassee, rattrapee
 * par l'image par defaut de l'ecran.
 */
export function projeterRestaurant(brut: RestaurantExtrait, repliHoraires: string): CrousRestaurant {
    const code = String(brut.code ?? '');

    return {
        id: code,
        title: texte(brut.nom) ?? '',
        short_desc: texte(brut.zone) ?? texte(brut.adresse) ?? '',
        lat: nombre(brut.lat) ?? 0,
        lon: nombre(brut.lon) ?? 0,
        opening: horairesLisibles(brut.horaires, repliHoraires),
        image_url: `${API}/restaurants/${code}/preview`,
    };
}

/**
 * `DD-MM-YYYY` vers `YYYY-MM-DD`.
 *
 * La conversion vit ici et non dans le Blueprint, et c'est une regle du moteur, pas une preference :
 * les filtres de date **produisent** un format attendu par une source, ils n'en interpretent pas un.
 *
 * Une date absente rend `null` au lieu de faire echouer la transformation entiere. Le code d'origine
 * appelait `.includes()` avant de verifier la valeur : une reponse sans date vidait tout le menu, en
 * silence, par le `catch` du service.
 */
export function dateIso(brut: unknown): string | null {
    const valeur = texte(brut);
    if (valeur === undefined || valeur.length !== 10) {
        return valeur ?? null;
    }

    const [jour, mois, annee] = valeur.split('-');
    return annee !== undefined && annee.length === 4 ? `${annee}-${mois}-${jour}` : valeur;
}

interface PlatBrut {
    libelle?: unknown;
}

interface CategorieBrute {
    libelle?: unknown;
    plats?: unknown;
}

interface RepasBrut {
    type?: unknown;
    categories?: unknown;
}

function projeterService(repas: RepasBrut | undefined, repliCategorie: string) {
    if (repas === undefined || !Array.isArray(repas.categories)) {
        return [];
    }

    return (repas.categories as CategorieBrute[]).map((categorie) => ({
        name: texte(categorie.libelle) ?? repliCategorie,
        dishes: Array.isArray(categorie.plats)
            ? (categorie.plats as PlatBrut[]).map((plat) => texte(plat.libelle) ?? '')
            : [],
    }));
}

/**
 * Projette un jour extrait sur le contrat applicatif.
 *
 * Le sous-arbre `repas` descend du Blueprint tel quel : un jour porte des services, qui portent des
 * categories, qui portent des plats, et la grammaire de `fields` est plate. Le regroupement par
 * service (midi, soir) est donc applicatif — il l'etait deja.
 */
export function projeterJourMenu(brut: JourExtrait, repliCategorie: string): CrousDayMenu {
    const repas: RepasBrut[] = Array.isArray(brut.repas) ? (brut.repas as RepasBrut[]) : [];

    return {
        date: dateIso(brut.date),
        midi: projeterService(repas.find((service) => service.type === 'midi'), repliCategorie),
        soir: projeterService(repas.find((service) => service.type === 'soir'), repliCategorie),
    };
}

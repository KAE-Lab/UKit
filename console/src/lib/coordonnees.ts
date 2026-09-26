/**
 * Le lieu d'une annonce, tel qu'on le colle : personne ne connait par coeur la latitude d'un foyer
 * etudiant. On la copie — clic droit sur Google Maps, qui copie « 44.80581, -0.60410 » ; l'adresse
 * d'une carte Google Maps ou OpenStreetMap ; ou deux nombres ecrits a la francaise. Ce module
 * reconnait ces formes et rend le couple, ou rien.
 *
 * Pur : joue par `npm test` a la racine du depot (coordonnees.test.ts).
 */

export interface Coordonnees {
    readonly lat: number;
    readonly lng: number;
}

const NOMBRE_A_POINT = '(-?\\d{1,3}(?:\\.\\d+)?)';
const NOMBRE_A_VIRGULE = '(-?\\d{1,3}(?:,\\d+)?)';

/**
 * Les adresses de carte qui portent le point, du plus precis au moins precis : le repere pose
 * (`mlat=…&mlon=…` d'OpenStreetMap, `q=lat,lng`, `!3d…!4d…` d'une fiche Google Maps) passe avant le centre de la vue (`@lat,lng` de
 * Google Maps, `#map=z/lat/lng` d'OpenStreetMap), qu'une adresse porte souvent en plus.
 */
const ADRESSES: readonly RegExp[] = [
    new RegExp(`[?&]mlat=${NOMBRE_A_POINT}&mlon=${NOMBRE_A_POINT}`),
    new RegExp(`[?&](?:q|query|ll)=${NOMBRE_A_POINT},\\s*${NOMBRE_A_POINT}`),
    // Le lieu d'une fiche Google Maps : `!3d<lat>!4d<lng>`, a cote du centre de la vue.
    new RegExp(`!3d${NOMBRE_A_POINT}!4d${NOMBRE_A_POINT}`),
    new RegExp(`@${NOMBRE_A_POINT},${NOMBRE_A_POINT}`),
    new RegExp(`#map=\\d+(?:\\.\\d+)?/${NOMBRE_A_POINT}/${NOMBRE_A_POINT}`),
];

/** Deux nombres a point decimal : le separateur est une virgule, un point-virgule ou un espace. */
const COUPLE_A_POINTS = new RegExp(`^${NOMBRE_A_POINT}\\s*[,;\\s]\\s*${NOMBRE_A_POINT}$`);
/** Deux nombres a virgule decimale : le separateur est un point-virgule, une virgule suivie d'un espace, ou un espace. */
const COUPLE_A_VIRGULES = new RegExp(`^${NOMBRE_A_VIRGULE}\\s*(?:;|,\\s+|\\s+)\\s*${NOMBRE_A_VIRGULE}$`);

function valides(lat: number, lng: number): Coordonnees | null {
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

function nombre(texte: string | undefined): number {
    return texte === undefined ? Number.NaN : Number(texte.replace(',', '.'));
}

/** Le couple que porte un texte colle, ou `null` : une forme ambigue ne devine rien. */
export function lireCoordonnees(brut: string): Coordonnees | null {
    const texte = brut.trim();
    for (const motif of ADRESSES) {
        const trouve = motif.exec(texte);
        if (trouve !== null) return valides(nombre(trouve[1]), nombre(trouve[2]));
    }
    const couple = COUPLE_A_POINTS.exec(texte) ?? COUPLE_A_VIRGULES.exec(texte);
    return couple === null ? null : valides(nombre(couple[1]), nombre(couple[2]));
}

/** De quoi verifier le point sur une carte, dans un autre onglet. */
export function lienOpenStreetMap({ lat, lng }: Coordonnees): string {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
}

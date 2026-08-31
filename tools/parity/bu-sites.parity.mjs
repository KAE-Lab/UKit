/**
 * Cas de parite : les sites autour d'un point de balayage.
 *
 * **Un point, pas douze.** Ce qui descend dans le Blueprint est la requete ; le balayage, la
 * deduplication et le tri restent applicatifs et ne sont pas ce que ce cas compare. Rejouer douze
 * points ici multiplierait le temps du harnais par douze pour verifier une boucle `for`.
 *
 * Le piege d'arite s'y voit en revanche pour de vrai : tous les sites de la region n'ont qu'une
 * categorie, donc l'extraction rend `20` et non `[20]`.
 *
 * Voir tools/parity/README.md.
 */

import { CAMPUS, ENTETES_AFFLUENCES, commeListe, distanceComparable, jouer } from './commun.mjs';

export const NAME = 'bu-sites';

/** Le campus Talence / Pessac / Gradignan : le point qui rend le plus de bibliotheques. */
const POINT = { lat: 44.7963, lng: -0.6277 };

const CATEGORIES_BU = [1, 20];

function distanceEnKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Le chemin migre : joue le Blueprint et rend la donnee au format applicatif. */
export async function viaBlueprint() {
    const outputs = await jouer('ukit-campus-bibliotheques.blueprint.json', {
        latitude: POINT.lat,
        longitude: POINT.lng,
    });

    return commeListe(outputs.sites)
        .filter((site) => commeListe(site.categories).some((id) => CATEGORIES_BU.includes(id)))
        .map((site) => {
            const images = commeListe(site.images);
            return {
                id: String(site.id ?? ''),
                name: site.nom ?? '',
                campus: site.ville || CAMPUS,
                lat: site.lat,
                lng: site.lon,
                slug: site.slug ?? '',
                imageUrl: images[0] || site.image_poster || null,
                distance:
                    site.lat !== undefined && site.lat !== null && site.lon !== undefined && site.lon !== null
                        ? distanceEnKm(POINT.lat, POINT.lng, site.lat, site.lon)
                        : undefined,
            };
        })
        .sort((gauche, droite) => (gauche.distance || 0) - (droite.distance || 0));
}

/**
 * Le chemin historique, tel qu'il etait avant la migration — recopie ici volontairement.
 */
export async function viaLegacy() {
    const response = await fetch('https://api.affluences.com/app/v3/sites/map', {
        method: 'POST',
        headers: { ...ENTETES_AFFLUENCES, 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: POINT.lat, longitude: POINT.lng }),
    });
    if (!response.ok) throw new Error(`legacy: statut ${response.status}`);

    const json = await response.json();
    const uniques = new Map();

    for (const site of json.data?.results ?? []) {
        if (site.categories?.some((categorie) => categorie.id === 1 || categorie.id === 20)) {
            if (!uniques.has(site.id)) uniques.set(site.id, site);
        }
    }

    return Array.from(uniques.values())
        .map((site) => {
            const siteLat = site.location?.coordinates?.latitude;
            const siteLng = site.location?.coordinates?.longitude;
            return {
                id: site.id,
                name: site.primary_name,
                campus: site.location?.address?.city || CAMPUS,
                lat: siteLat,
                lng: siteLng,
                slug: site.slug,
                imageUrl: (site.images && site.images.length > 0 ? site.images[0] : site.poster_image) || null,
                distance:
                    siteLat !== undefined && siteLng !== undefined
                        ? distanceEnKm(POINT.lat, POINT.lng, siteLat, siteLng)
                        : site.estimated_distance / 1000,
            };
        })
        .sort((gauche, droite) => (gauche.distance || 0) - (droite.distance || 0));
}

/** Ce que la comparaison regarde : tous les champs que la liste et la fiche lisent. */
export function project(item) {
    return {
        id: item.id,
        name: item.name ?? null,
        campus: item.campus ?? null,
        lat: item.lat ?? null,
        lng: item.lng ?? null,
        slug: item.slug ?? null,
        imageUrl: item.imageUrl || null,
        distance: distanceComparable(item.distance),
    };
}

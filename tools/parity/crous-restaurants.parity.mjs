/**
 * Cas de parite : la liste des restaurants CROUS.
 *
 * Voir tools/parity/README.md.
 */

import { UNSPECIFIED_HOURS, commeListe, distanceComparable, jouer } from './commun.mjs';

export const NAME = 'crous-restaurants';

/** Une position fixe : la parite compare un tri, elle ne demande pas ou se trouve la machine. */
const POSITION = { lat: 44.8048, lon: -0.5954 };

const API = 'https://api.croustillant.menu/v1';

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
    const outputs = await jouer('ukit-campus-restaurants.blueprint.json');

    return commeListe(outputs.restaurants)
        .map((brut) => ({
            id: String(brut.code ?? ''),
            title: brut.nom ?? '',
            short_desc: brut.zone || brut.adresse || '',
            lat: brut.lat,
            lon: brut.lon,
            opening: horaires(brut.horaires),
            distance: distanceEnKm(POSITION.lat, POSITION.lon, brut.lat, brut.lon),
            image_url: `${API}/restaurants/${brut.code}/preview`,
        }))
        .sort((gauche, droite) => (gauche.distance || 0) - (droite.distance || 0));
}

/** La lecture des horaires **apres** correctif : la source sert une chaine JSON, plus un tableau. */
function horaires(brut) {
    if (Array.isArray(brut)) return brut.length > 0 ? brut.join(' | ') : UNSPECIFIED_HOURS;
    if (typeof brut === 'string' && brut.trim().startsWith('[')) {
        try {
            const lignes = JSON.parse(brut);
            return Array.isArray(lignes) && lignes.length > 0 ? lignes.join(' | ') : UNSPECIFIED_HOURS;
        } catch (error) {
            return UNSPECIFIED_HOURS;
        }
    }
    return UNSPECIFIED_HOURS;
}

/**
 * Le chemin historique, tel qu'il etait avant la migration — recopie ici volontairement plutot
 * qu'importe : le service, lui, va changer, et un cas de parite qui suivrait ses evolutions
 * cesserait de comparer quoi que ce soit.
 */
export async function viaLegacy() {
    const response = await fetch(`${API}/regions/1/restaurants`);
    if (!response.ok) throw new Error(`legacy: statut ${response.status}`);

    const json = await response.json();
    return (json.data ?? [])
        .filter((resto) => resto.type?.code !== 4)
        .map((resto) => ({
            id: String(resto.code),
            title: resto.nom,
            short_desc: resto.zone || resto.adresse,
            lat: resto.latitude,
            lon: resto.longitude,
            // Le comportement d'origine, conserve tel quel : `Array.isArray` est faux depuis que la
            // source sert une chaine JSON, donc cette branche rend toujours le repli.
            opening: Array.isArray(resto.horaires) ? resto.horaires.join(' | ') : UNSPECIFIED_HOURS,
            distance: distanceEnKm(POSITION.lat, POSITION.lon, resto.latitude, resto.longitude),
            image_url: `${API}/restaurants/${resto.code}/preview`,
        }))
        .sort((gauche, droite) => (gauche.distance || 0) - (droite.distance || 0));
}

/**
 * Ce que la comparaison regarde : tout ce que les ecrans lisent, **sauf `opening`**.
 *
 * C'est le seul champ exclu du harnais, et c'est le seul changement volontaire du jalon 6-D. La
 * source a cesse de servir `horaires` comme un tableau pour le servir comme une **chaine JSON** ;
 * `Array.isArray` etant faux pour les quarante-et-un restaurants de la region, l'application
 * affichait « horaires non specifies » partout. Le chemin migre lit les deux formes ; l'ancien, non.
 * Comparer ce champ ferait rougir une porte pour un correctif voulu, et l'ecarter en silence serait
 * pire — d'ou cette ligne. Voir docs/features/campus-crous.md.
 */
export function project(item) {
    return {
        id: item.id,
        title: item.title ?? null,
        short_desc: item.short_desc || null,
        lat: item.lat ?? null,
        lon: item.lon ?? null,
        distance: distanceComparable(item.distance),
        image_url: item.image_url ?? null,
    };
}

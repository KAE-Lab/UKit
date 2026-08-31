/**
 * Cas de parite : la liste des salles, comparee element par element, **puis** les batiments qu'on en
 * reconstruit.
 *
 * Les deux comptent : la liste prouve que l'extraction rend les memes 283 entrees, la reconstruction
 * prouve que la correspondance textuelle salle vers batiment n'a pas bouge — c'est elle qui decide de
 * tout l'ecran des salles libres, et elle est le point fragile de cette source.
 *
 * Voir tools/parity/README.md.
 */

import { commeListe, jouer } from './commun.mjs';
import { CATALOGUE_BORDEAUX, DOMAINE } from './celcat-commun.mjs';

export const NAME = 'celcat-salles';

/**
 * Le referentiel n'est pas jouable sous Node — il lit la base et le magasin local. La cle eligible y
 * est unique et stable depuis toujours, et c'est elle qu'on rejoue ici.
 * Voir docs/features/campus-salles-libres.md.
 */
const BATIMENTS_LIBRES = ['A28'];

/** Le chemin migre : joue le Blueprint et rend la donnee au format applicatif. */
export async function viaBlueprint() {
    const outputs = await jouer('ukit-celcat-salles.blueprint.json', CATALOGUE_BORDEAUX.salles);

    const salles = [];
    for (const brute of commeListe(outputs.salles)) {
        const libelle = typeof brute.libelle === 'string' ? brute.libelle : '';
        if (libelle.length <= 2) continue;
        salles.push({ id: String(brute.id ?? ''), name: libelle });
    }
    return [...salles, ...batiments(salles)];
}

/** Le chemin historique, recopie tel qu'il etait — vise Celcat directement, le relais etant mort. */
export async function viaLegacy() {
    const url = `${DOMAINE}/Home/ReadResourceListItems?searchTerm=_&pageSize=10000&resType=102`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`legacy: statut ${response.status}`);

    const json = await response.json();
    const salles = json.results
        .filter((entree) => entree.text && entree.text.length > 2)
        .map((entree) => ({ id: entree.id, name: entree.text }));
    return [...salles, ...batiments(salles)];
}

/** `extractBuildingsFromRooms`, recopie : la partie de la chaine qui n'a rien a voir avec le reseau. */
function batiments(salles) {
    const parBatiment = new Map(BATIMENTS_LIBRES.map((cle) => [cle, []]));

    for (const salle of salles) {
        if (salle.name.toLowerCase().includes('en attente')) continue;

        for (const cle of BATIMENTS_LIBRES) {
            const regex = new RegExp(`\\b${cle}\\b`, 'i');
            if (regex.test(salle.name) || salle.name.includes(cle)) {
                const propre = salle.name.replace(/\s*\([^)]*\)$/, '').trim();
                const indexSalle = propre.toLowerCase().indexOf('salle');
                const nom = indexSalle !== -1 ? propre.substring(indexSalle).trim() : propre;
                if (nom.toLowerCase() === 'salle' || nom.trim() === '') break;

                parBatiment.get(cle).push({ id: salle.id, name: nom, fullName: salle.name });
                break;
            }
        }
    }

    return [...parBatiment.entries()]
        .filter(([, pieces]) => pieces.length > 0)
        .map(([cle, pieces]) => ({ id: 'bat_' + cle.toLowerCase(), name: cle, rooms: pieces }));
}

/** Une salle, ou un batiment reconstruit : les deux formes traversent la meme projection. */
export function project(item) {
    return {
        id: item.id ?? null,
        name: item.name ?? null,
        fullName: item.fullName ?? null,
        rooms: item.rooms === undefined ? null : item.rooms.map((piece) => `${piece.id}|${piece.name}`),
    };
}

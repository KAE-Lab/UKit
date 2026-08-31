/**
 * Cas de parite : les menus d'un restaurant.
 *
 * Trois restaurants concatenes, choisis pour couvrir les trois issues que l'ecran doit distinguer :
 * un restaurant qui publie ses menus, un restaurant qui n'en publie aucun (statut 404, cas le plus
 * frequent de la region), et un jour sans service dans une semaine qui en a. Les trois doivent rendre
 * la meme chose des deux cotes, **succes compris** : un 404 est une liste vide, pas une panne.
 *
 * Les deux restaurants en 404 n'ajoutent aucune ligne a la comparaison, et c'est bien ce qu'on veut
 * verifier : `jouer` **leve** sur un run en echec, donc leur seule presence prouve que le Blueprint
 * les traite en succes. Un `expect: {status: 200}` ferait rougir ce cas immediatement.
 *
 * Voir tools/parity/README.md.
 */

import { CATEGORY, commeListe, jouer } from './commun.mjs';

export const NAME = 'crous-menu';

const API = 'https://api.croustillant.menu/v1';

/** 1 : publie ses menus. 1642 et 10 : rendent 404, et c'est un resultat normal. */
const RESTAURANTS = ['1', '1642', '10'];

function dateIso(brut) {
    if (typeof brut !== 'string' || brut === '' || brut.length !== 10) return brut || null;
    const [jour, mois, annee] = brut.split('-');
    return annee !== undefined && annee.length === 4 ? `${annee}-${mois}-${jour}` : brut;
}

function service(repas) {
    if (!repas || !Array.isArray(repas.categories)) return [];
    return repas.categories.map((categorie) => ({
        name: categorie.libelle || CATEGORY,
        dishes: Array.isArray(categorie.plats) ? categorie.plats.map((plat) => plat.libelle || '') : [],
    }));
}

function projeterJour(date, repas) {
    const services = Array.isArray(repas) ? repas : [];
    return {
        date: dateIso(date),
        midi: service(services.find((item) => item.type === 'midi')),
        soir: service(services.find((item) => item.type === 'soir')),
    };
}

/** Le chemin migre : joue le Blueprint pour chaque restaurant et rend la donnee au format applicatif. */
export async function viaBlueprint() {
    const tous = [];
    for (const restaurant of RESTAURANTS) {
        const outputs = await jouer('ukit-campus-restaurant-menu.blueprint.json', { restaurant });
        for (const jour of commeListe(outputs.jours)) {
            tous.push({ restaurant, ...projeterJour(jour.date, jour.repas) });
        }
    }
    return tous;
}

/**
 * Le chemin historique, tel qu'il etait avant la migration — recopie ici volontairement.
 *
 * Le `!response.ok -> []` d'origine est ce qui rend le 404 comparable : c'est bien le meme resultat
 * que le Blueprint produit, par un chemin qui le **nomme** au lieu de le subir.
 */
export async function viaLegacy() {
    const tous = [];
    for (const restaurant of RESTAURANTS) {
        const response = await fetch(`${API}/restaurants/${restaurant}/menu`);
        if (!response.ok) continue;

        const json = await response.json();
        if (!json.data) continue;

        const jours = Array.isArray(json.data) ? json.data : [json.data];
        for (const jour of jours) {
            tous.push({ restaurant, ...projeterJour(jour.date, jour.repas) });
        }
    }
    return tous;
}

/** Ce que la comparaison regarde : la date, et le detail complet des deux services. */
export function project(item) {
    return {
        restaurant: item.restaurant,
        date: item.date ?? null,
        midi: item.midi,
        soir: item.soir,
    };
}

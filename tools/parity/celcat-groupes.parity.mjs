/**
 * Cas de parite : la liste des groupes d'etudiants, comparee element par element.
 *
 * Environ 2 900 identifiants, dont certains portent des espaces de tete ou de queue : c'est aussi ce
 * qui rend la comparaison utile, une normalisation involontaire s'y verrait tout de suite.
 *
 * Voir tools/parity/README.md.
 */

import { commeListe, jouer } from './commun.mjs';
import { DOMAINE } from './celcat-commun.mjs';

export const NAME = 'celcat-groupes';

/** Le chemin migre : joue le Blueprint et rend la donnee au format applicatif. */
export async function viaBlueprint() {
    const outputs = await jouer('ukit-celcat-groupes.blueprint.json');

    return commeListe(outputs.groupes)
        .filter((identifiant) => typeof identifiant === 'string' && identifiant.length > 2)
        .sort();
}

/**
 * Le chemin historique, recopie tel qu'il etait — a une adresse pres.
 *
 * `PlanningApiService.fetchGroupList` visait `ukit.kbdev.io`, le relais. Celui-ci repond **522**
 * depuis trois sondes du 2026-08-09 : le pointer ici rendrait ce cas rouge en permanence, pour une
 * raison qui n'est pas celle qu'on veut mesurer. Le cas compare donc les deux **traductions** de la
 * meme reponse, ce qui est exactement ce que la migration change. Voir docs/sources-externes.md.
 */
export async function viaLegacy() {
    const url = `${DOMAINE}/Home/ReadResourceListItems?searchTerm=_&pageSize=10000&resType=103`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`legacy: statut ${response.status}`);

    const json = await response.json();
    return json.results
        .map((entree) => entree.id)
        .filter((identifiant) => identifiant.length > 2)
        .sort();
}

/** Un identifiant est une chaine : la projection est l'identite, et c'est deliberement le cas. */
export function project(item) {
    return item;
}

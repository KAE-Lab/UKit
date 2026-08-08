/**
 * Cas de parite : les horaires d'une semaine.
 *
 * Deux semaines, la courante et une decalee, parce que c'est la navigation que la fiche permet et que
 * le decalage est un **entier signe** passe dans la chaine de requete — l'endroit exact ou un
 * encodage qui differe d'un caractere ne leve rien et rend une autre semaine.
 *
 * Voir tools/parity/README.md.
 */

import { ENTETES_AFFLUENCES, commeListe, jouer } from './commun.mjs';

export const NAME = 'bu-horaires';

const SITE = 'bu-droit-lettres-pessac';
const SEMAINES = [0, -1];

/** Le chemin migre : joue le Blueprint pour chaque semaine et rend la donnee au format applicatif. */
export async function viaBlueprint() {
    const journees = [];
    for (const semaine of SEMAINES) {
        const outputs = await jouer('ukit-campus-bibliotheque-horaires.blueprint.json', { site: SITE, semaine });
        for (const entree of commeListe(outputs.entrees)) {
            journees.push({
                semaine,
                day: entree.jour ?? '',
                isToday: entree.aujourdhui === true,
                openingHours: commeListe(entree.ouvertures),
            });
        }
    }
    return journees;
}

/**
 * Le chemin historique, tel qu'il etait avant la migration — recopie ici volontairement.
 *
 * Il utilisait la reponse **telle quelle** (`data.entries`), sous le contrat `TimetableEntry`. C'est
 * ce que le Blueprint reproduit en faisant descendre le sous-arbre `openingHours` sans le mettre a
 * plat : `fields` ne sait pas rendre une liste de couples.
 */
export async function viaLegacy() {
    const journees = [];
    for (const semaine of SEMAINES) {
        const response = await fetch(
            `https://api.affluences.com/app/v4/sites/${SITE}/timetables?weekOffset=${semaine}`,
            { method: 'GET', headers: ENTETES_AFFLUENCES },
        );
        if (!response.ok) throw new Error(`legacy: statut ${response.status} pour la semaine ${semaine}`);

        const json = await response.json();
        for (const entree of json.data?.entries ?? []) {
            journees.push({ semaine, ...entree });
        }
    }
    return journees;
}

/** Ce que la comparaison regarde : le jour, le marqueur du jour courant, et chaque plage. */
export function project(item) {
    return {
        semaine: item.semaine,
        day: item.day ?? null,
        isToday: item.isToday === true,
        openingHours: (item.openingHours ?? []).map((plage) => ({
            openingHour: plage.openingHour ?? null,
            closingHour: plage.closingHour ?? null,
        })),
    };
}

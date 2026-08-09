/**
 * Cas de parite : la plage annuelle de la synchronisation calendrier.
 *
 * Les deux positions de la bascule d'annee scolaire sont jouees en **dates explicites** : le service
 * les calcule depuis `moment()`, et un cas qui rejouerait ce calcul echouerait un 1er aout au lieu de
 * mesurer quoi que ce soit. Ce qui est compare ici est la traduction d'environ 300 evenements sur une
 * annee entiere — la seule sonde ou les 42 evenements de vacances, sans heure de fin et sans modules,
 * traversent en nombre.
 *
 * Voir tools/parity/README.md.
 */

import { agreger, comparerCorps, jouerEnCapturant } from './commun.mjs';
import {
    DOMAINE,
    ENTETES_CELCAT,
    corpsCalendrier,
    projeterCours,
    projeterDepuisBlueprint,
    projeterDepuisLegacy,
    trier,
} from './celcat-commun.mjs';

export const NAME = 'celcat-annee';

const GROUPE = 'INF601A5';

const SONDES = [
    { cas: 'annee en cours', debut: '2025-08-01', fin: '2026-08-01' },
    { cas: 'annee precedente', debut: '2024-08-01', fin: '2025-08-01' },
];

/** Le chemin migre : joue le Blueprint, verifie le corps emis, et rend la liste a plat. */
export async function viaBlueprint() {
    const blocs = [];
    for (const sonde of SONDES) {
        const { outputs, requetes } = await jouerEnCapturant('ukit-celcat-annee.blueprint.json', {
            groupes: [GROUPE],
            debut: sonde.debut,
            fin: sonde.fin,
        });

        comparerCorps(`${NAME} / ${sonde.cas}`, requetes[0].body, corps(sonde));

        const cours = (outputs.cours ?? [])
            .filter((brut) => brut.categorie !== 'Vacances')
            .map((brut) => projeterDepuisBlueprint(brut, GROUPE, ';'));
        blocs.push([sonde.cas, cours.sort(trier)]);
    }
    return agreger(blocs);
}

/** Le chemin historique, recopie tel qu'il etait — vise Celcat directement, le relais etant mort. */
export async function viaLegacy() {
    const blocs = [];
    for (const sonde of SONDES) {
        const response = await fetch(`${DOMAINE}/Home/GetCalendarData`, {
            method: 'POST',
            headers: ENTETES_CELCAT,
            body: new URLSearchParams(Object.entries(corps(sonde))).toString(),
        });
        if (!response.ok) throw new Error(`legacy: statut ${response.status}`);

        const cours = (await response.json())
            .filter((event) => event.eventCategory !== 'Vacances')
            .map((event) => projeterDepuisLegacy(event, GROUPE, ';'));
        blocs.push([sonde.cas, cours.sort(trier)]);
    }
    return agreger(blocs);
}

function corps(sonde) {
    return corpsCalendrier({
        start: sonde.debut,
        end: sonde.fin,
        resType: '103',
        calView: 'agendaWeek',
        federationIds: GROUPE,
    });
}

export function project(item) {
    if (item.resume === true) return { cas: item.cas, nombre: item.nombre };
    return { cas: item.cas, ...projeterCours(item.element) };
}

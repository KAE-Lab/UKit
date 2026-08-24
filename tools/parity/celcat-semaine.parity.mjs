/**
 * Cas de parite : les cours d'une semaine, decoupes en six jours.
 *
 * Une semaine complete, une semaine de vacances, et une semaine a cheval sur deux mois — celle qui
 * ferait tomber un decoupage naif. La borne de fin vaut `lundi + 6` et non `+ 7` : c'est ce que le
 * code d'origine envoyait (`endOf('week')`), et le corps emis est compare pour le prouver.
 *
 * Le calcul du lundi a partir d'un numero de semaine ISO reste applicatif : il n'est pas rejoue ici,
 * les deux chemins recevant le meme lundi, parce qu'il depend de l'heure courante et de la locale.
 *
 * Voir tools/parity/README.md.
 */

import moment from 'moment';

import { agreger, comparerCorps, jouerEnCapturant } from './commun.mjs';
import {
    CATALOGUE_BORDEAUX,
    DOMAINE,
    ENTETES_CELCAT,
    corpsCalendrier,
    decouper,
    projeterCours,
    projeterDepuisBlueprint,
    projeterDepuisLegacy,
} from './celcat-commun.mjs';

export const NAME = 'celcat-semaine';

const GROUPE = 'INF601A5';

const SONDES = [
    { cas: 'semaine complete', lundi: '2026-01-12' },
    { cas: 'semaine de vacances', lundi: '2025-10-27' },
    { cas: 'semaine a cheval sur deux mois', lundi: '2026-01-26' },
];

const samedi = (lundi) => moment(lundi).add(6, 'day').format('YYYY-MM-DD');

/** Le chemin migre : joue le Blueprint, verifie le corps emis, et decoupe la semaine. */
export async function viaBlueprint() {
    const blocs = [];
    for (const sonde of SONDES) {
        const { outputs, requetes } = await jouerEnCapturant('ukit-celcat-semaine.blueprint.json', {
            ...CATALOGUE_BORDEAUX.groupes,
            groupes: [GROUPE],
            lundi: sonde.lundi,
        });

        comparerCorps(`${NAME} / ${sonde.cas}`, requetes[0].body, corps(sonde.lundi));

        const cours = (outputs.cours ?? [])
            .filter((brut) => brut.categorie !== 'Vacances')
            .map((brut) => projeterDepuisBlueprint(brut, GROUPE, ';'));
        blocs.push([sonde.cas, aplatir(decouper(cours, sonde.lundi))]);
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
            body: new URLSearchParams(Object.entries(corps(sonde.lundi))).toString(),
        });
        if (!response.ok) throw new Error(`legacy: statut ${response.status}`);

        const cours = (await response.json())
            .filter((event) => event.eventCategory !== 'Vacances')
            .map((event) => projeterDepuisLegacy(event, GROUPE, ';'));
        blocs.push([sonde.cas, aplatir(decouper(cours, sonde.lundi))]);
    }
    return agreger(blocs);
}

function corps(lundi) {
    return corpsCalendrier({
        start: lundi,
        end: samedi(lundi),
        resType: '103',
        calView: 'agendaWeek',
        federationIds: GROUPE,
    });
}

/**
 * Les six jours, a plat.
 *
 * L'horodatage de chaque jour et son numero traversent la comparaison : ce sont eux qui positionnent
 * les sections de la vue semaine, et un decalage d'un jour ne se verrait nulle part ailleurs.
 */
function aplatir(semaine) {
    const lignes = [];
    for (const jour of semaine) {
        lignes.push({ jour: jour.dayNumber, timestamp: jour.dayTimestamp, cours: null });
        for (const cours of jour.courses) lignes.push({ jour: jour.dayNumber, timestamp: null, cours });
    }
    return lignes;
}

export function project(item) {
    if (item.resume === true) return { cas: item.cas, nombre: item.nombre };
    const { jour, timestamp, cours } = item.element;
    return { cas: item.cas, jour, timestamp, ...(cours === null ? {} : projeterCours(cours)) };
}

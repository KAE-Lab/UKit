/**
 * Cas de parite : l'occupation des salles d'un batiment.
 *
 * Trois salles reelles du CREMI (batiment A28, le seul en acces libre), une journee ordinaire et une
 * journee de vacances. C'est le seul cas ou les identifiants interroges portent des **espaces**, des
 * accents, un point et une barre oblique : c'est donc lui qui prouve l'encodage sur autre chose que
 * des identifiants alphanumeriques.
 *
 * Les evenements de vacances ne sont **pas** ecartes, contrairement au planning : ce sont eux qui
 * declarent un batiment ferme, et ils arrivent sans heure de fin.
 *
 * Voir tools/parity/README.md.
 */

import { decode } from 'html-entities';
import moment from 'moment';

import { agreger, comparerCorps, jouerEnCapturant } from './commun.mjs';
import { DOMAINE, ENTETES_CELCAT, corpsCalendrier } from './celcat-commun.mjs';

export const NAME = 'celcat-occupation';

const SALLES = [
    'CREMI - Bât. A28 Salle 005',
    'CREMI - Bât. A28 Salle 007',
    'CREMI - Bât. A28 Salle 101',
];

const SONDES = [
    { cas: 'journee ordinaire', jour: '2026-01-12', lendemain: '2026-01-13' },
    { cas: 'journee de vacances', jour: '2025-10-27', lendemain: '2025-10-28' },
];

/** Le chemin migre : un run par salle, comme l'ecran le fait, et le corps emis est verifie. */
export async function viaBlueprint() {
    const blocs = [];
    for (const sonde of SONDES) {
        const evenements = [];
        for (const salle of SALLES) {
            const { outputs, requetes } = await jouerEnCapturant('ukit-celcat-occupation.blueprint.json', {
                salles: [salle],
                jour: sonde.jour,
            });

            comparerCorps(`${NAME} / ${sonde.cas} / ${salle}`, requetes[0].body, corps(sonde, [salle]));

            for (const brut of outputs.evenements ?? []) {
                if (String(brut.debut ?? '').slice(0, 10) !== sonde.jour) continue;
                evenements.push(composer(brut.id, brut.debut, brut.fin, brut.categorie, brut.description));
            }
        }
        blocs.push([sonde.cas, evenements]);
    }
    return agreger(blocs);
}

/** Le chemin historique, recopie tel qu'il etait — vise Celcat directement, le relais etant mort. */
export async function viaLegacy() {
    const blocs = [];
    for (const sonde of SONDES) {
        const evenements = [];
        for (const salle of SALLES) {
            const response = await fetch(`${DOMAINE}/Home/GetCalendarData`, {
                method: 'POST',
                headers: ENTETES_CELCAT,
                body: new URLSearchParams([...Object.entries(corps(sonde, [salle]))].flatMap(([cle, valeur]) =>
                    Array.isArray(valeur) ? valeur.map((element) => [cle, element]) : [[cle, valeur]],
                )).toString(),
            });
            if (!response.ok) throw new Error(`legacy: statut ${response.status}`);

            for (const event of await response.json()) {
                if (moment(event.start).format('YYYY-MM-DD') !== sonde.jour) continue;
                evenements.push(composer(event.id, event.start, event.end, event.eventCategory, event.description));
            }
        }
        blocs.push([sonde.cas, evenements]);
    }
    return agreger(blocs);
}

function corps(sonde, salles) {
    return corpsCalendrier({
        start: sonde.jour,
        end: sonde.lendemain,
        resType: '102',
        calView: 'agendaDay',
        federationIds: salles,
    });
}

/** `CampusApiService` : la meme transformation des deux cotes, fin nulle comprise. */
function composer(id, debut, fin, categorie, description) {
    const debutMoment = moment(debut ?? null);
    const finMoment = moment(fin ?? null);
    const texte = String(description ?? '');

    return {
        id,
        starttime: debutMoment.format('HH:mm'),
        endtime: finMoment.format('HH:mm'),
        date: { start: debutMoment.toISOString(), end: finMoment.toISOString() },
        description: decode(texte.replace(/\r/g, '').replace(/<br \/>/g, '').replace(/\n\n\n\n/g, ';')),
        isVacances: categorie === 'Vacances' || texte.toLowerCase().includes('vacances'),
    };
}

export function project(item) {
    if (item.resume === true) return { cas: item.cas, nombre: item.nombre };
    const evenement = item.element;
    return {
        cas: item.cas,
        id: evenement.id ?? null,
        starttime: evenement.starttime,
        endtime: evenement.endtime,
        debut: evenement.date.start,
        fin: evenement.date.end,
        description: evenement.description,
        isVacances: evenement.isVacances,
    };
}

/**
 * Cas de parite : l'occupation des salles d'un batiment.
 *
 * Trois salles reelles du CREMI (batiment A28, le seul en acces libre), une journee ordinaire et une
 * journee de vacances. C'est le seul cas ou les identifiants interroges portent des **espaces**, des
 * accents, un point et une barre oblique : c'est donc lui qui prouve l'encodage sur autre chose que
 * des identifiants alphanumeriques.
 *
 * Deux sous-cas par journee. Le premier joue une salle par run des deux cotes : la requete a un seul
 * identifiant, celle du rejeu d'une salle. Le second est ce que la fiche d'un batiment joue depuis le
 * jalon 7-I : **un** run pour les trois salles, ses evenements rendus a chaque salle que leur
 * description nomme, contre le chemin historique d'un appel par salle. C'est lui qui prouve que
 * l'attribution par le nom rend a chaque salle exactement ce que son propre appel rendait.
 *
 * Les evenements de vacances ne sont **pas** ecartes, contrairement au planning : ce sont eux qui
 * declarent un batiment ferme, et ils arrivent sans heure de fin.
 *
 * Voir tools/parity/README.md.
 */

import { decode } from 'html-entities';
import moment from 'moment';

import { agreger, comparerCorps, jouerEnCapturant } from './commun.mjs';
import { CATALOGUE_BORDEAUX, DOMAINE, ENTETES_CELCAT, corpsCalendrier } from './celcat-commun.mjs';

export const NAME = 'celcat-occupation';

/** L'identifiant interroge et le libelle d'inventaire, tels que `ukit.celcat.salles` les rend. */
const SALLES = [
    { id: 'CREMI - Bât. A28 Salle 005', libelle: 'CREMI - Bât. A28 Salle 005 (CREMI - Bât. A28 Salle 005)' },
    { id: 'CREMI - Bât. A28 Salle 007', libelle: 'CREMI - Bât. A28 Salle 007 (CREMI - Bât. A28 Salle 007)' },
    { id: 'CREMI - Bât. A28 Salle 101', libelle: 'CREMI - Bât. A28 Salle 101 (CREMI - Bât. A28 Salle 101)' },
];

const SONDES = [
    { cas: 'journee ordinaire', jour: '2026-01-12', lendemain: '2026-01-13' },
    { cas: 'journee de vacances', jour: '2025-10-27', lendemain: '2025-10-28' },
];

/** Le chemin migre : un run par salle, puis le run groupe de la fiche ; le corps emis est verifie. */
export async function viaBlueprint() {
    const blocs = [];
    for (const sonde of SONDES) {
        const evenements = [];
        for (const salle of SALLES) {
            const { outputs, requetes } = await jouerEnCapturant('ukit-celcat-occupation.blueprint.json', {
                ...CATALOGUE_BORDEAUX.salles,
                salles: [salle.id],
                jour: sonde.jour,
            });

            comparerCorps(`${NAME} / ${sonde.cas} / ${salle.id}`, requetes[0].body, corps(sonde, [salle.id]));
            evenements.push(...duJour(outputs.evenements, sonde));
        }
        blocs.push([sonde.cas, evenements]);
        blocs.push([`${sonde.cas}, groupe`, await groupeViaBlueprint(sonde)]);
    }
    return agreger(blocs);
}

/** Un seul run pour toutes les salles, puis la regle d'attribution de la fiche. */
async function groupeViaBlueprint(sonde) {
    const ids = SALLES.map((salle) => salle.id);
    const { outputs, requetes } = await jouerEnCapturant('ukit-celcat-occupation.blueprint.json', {
        ...CATALOGUE_BORDEAUX.salles,
        salles: ids,
        jour: sonde.jour,
    });

    comparerCorps(`${NAME} / ${sonde.cas} / groupe`, requetes[0].body, corps(sonde, ids));
    const evenements = duJour(outputs.evenements, sonde);
    return SALLES.flatMap((salle) => parSalle(salle, evenements.filter((evenement) => estAttribue(evenement, salle))));
}

/** Le chemin historique, recopie tel qu'il etait — un appel par salle, vise Celcat directement, le relais etant mort. */
export async function viaLegacy() {
    const blocs = [];
    for (const sonde of SONDES) {
        const evenements = [];
        const groupe = [];
        for (const salle of SALLES) {
            const response = await fetch(`${DOMAINE}/Home/GetCalendarData`, {
                method: 'POST',
                headers: ENTETES_CELCAT,
                body: new URLSearchParams([...Object.entries(corps(sonde, [salle.id]))].flatMap(([cle, valeur]) =>
                    Array.isArray(valeur) ? valeur.map((element) => [cle, element]) : [[cle, valeur]],
                )).toString(),
            });
            if (!response.ok) throw new Error(`legacy: statut ${response.status}`);

            const deLaSalle = [];
            for (const event of await response.json()) {
                if (moment(event.start).format('YYYY-MM-DD') !== sonde.jour) continue;
                deLaSalle.push(composer(event.id, event.start, event.end, event.eventCategory, event.description));
            }
            evenements.push(...deLaSalle);
            groupe.push(...parSalle(salle, deLaSalle));
        }
        blocs.push([sonde.cas, evenements]);
        blocs.push([`${sonde.cas}, groupe`, groupe]);
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

function duJour(bruts, sonde) {
    const evenements = [];
    for (const brut of bruts ?? []) {
        if (String(brut.debut ?? '').slice(0, 10) !== sonde.jour) continue;
        evenements.push(composer(brut.id, brut.debut, brut.fin, brut.categorie, brut.description));
    }
    return evenements;
}

/**
 * Les evenements d'une salle, etiquetes et tries.
 *
 * Trier ici est legitime : l'ordre d'un run groupe n'est pas celui des appels par salle, et le calcul
 * des creneaux libres ne depend pas de l'ordre des evenements d'une salle.
 */
function parSalle(salle, evenements) {
    return evenements
        .map((evenement) => ({ ...evenement, salle: salle.id }))
        .sort((gauche, droite) => String(gauche.date.start).localeCompare(String(droite.date.start)) || String(gauche.id).localeCompare(String(droite.id)));
}

/**
 * `attributionOccupation.ts`, recopie : les vacances vont a toutes les salles, un autre evenement a
 * chaque salle dont une forme du libelle — entier, puis sans sa parenthese finale — parait dans sa
 * description, aux blancs et a la casse pres.
 */
function estAttribue(evenement, salle) {
    if (evenement.isVacances) return true;
    const texte = normaliser(evenement.description);
    const entier = normaliser(salle.libelle);
    const sansParenthese = entier.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return [entier, sansParenthese].some((forme) => forme !== '' && texte.includes(forme));
}

function normaliser(texte) {
    return String(texte).trim().replace(/\s+/g, ' ').toLowerCase();
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
        salle: evenement.salle ?? null,
        id: evenement.id ?? null,
        starttime: evenement.starttime,
        endtime: evenement.endtime,
        debut: evenement.date.start,
        fin: evenement.date.end,
        description: evenement.description,
        isVacances: evenement.isVacances,
    };
}

/**
 * Cas de parite : les cours d'une journee, dans les cinq situations qui comptent.
 *
 * Un jour ordinaire, un jour de vacances, un jour sans cours, puis le **planning agrege** a deux et
 * trois groupes favoris — celui qui repose sur `federationIds[]` repete, le point le plus susceptible
 * de casser en silence. Le corps emis par le moteur est compare a celui de `qs` sur chaque sous-cas.
 *
 * Voir tools/parity/README.md.
 */

import { agreger, comparerCorps, jouerEnCapturant } from './commun.mjs';
import {
    CATALOGUE_BORDEAUX,
    DOMAINE,
    ENTETES_CELCAT,
    corpsCalendrier,
    projeterCours,
    projeterDepuisBlueprint,
    projeterDepuisLegacy,
    trier,
} from './celcat-commun.mjs';

export const NAME = 'celcat-jour';

/**
 * Les cinq sondes, en dates fixes.
 *
 * Rien ne depend de l'instant : un cas qui echoue a minuit n'est pas un cas. Une annee purgee cote
 * universite viderait les deux chemins de la meme facon, et le cas resterait vert en le disant par sa
 * ligne de resume.
 */
const SONDES = [
    { cas: 'jour ordinaire', groupes: ['INF601A5'], jour: '2026-01-12' },
    { cas: 'jour de vacances', groupes: ['INF601A5'], jour: '2025-10-27' },
    { cas: 'jour sans cours', groupes: ['INF601A5'], jour: '2026-01-11' },
    { cas: 'agrege deux groupes', groupes: ['INF601A5', 'MI601A'], jour: '2026-01-12' },
    { cas: 'agrege trois groupes', groupes: ['INF601A5', 'MI601A', 'INF601A'], jour: '2026-01-12' },
];

const LENDEMAIN = { '2026-01-12': '2026-01-13', '2025-10-27': '2025-10-28', '2026-01-11': '2026-01-12' };

/** Le chemin migre : joue le Blueprint, verifie le corps emis, et rend la donnee au format applicatif. */
export async function viaBlueprint() {
    const blocs = [];
    for (const sonde of SONDES) {
        const { outputs, requetes } = await jouerEnCapturant('ukit-celcat-jour.blueprint.json', {
            ...CATALOGUE_BORDEAUX.groupes,
            groupes: sonde.groupes,
            jour: sonde.jour,
        });

        comparerCorps(
            `${NAME} / ${sonde.cas}`,
            requetes[0].body,
            corpsCalendrier({
                start: sonde.jour,
                end: LENDEMAIN[sonde.jour],
                resType: '103',
                calView: 'agendaDay',
                federationIds: sonde.groupes,
            }),
        );

        blocs.push([sonde.cas, journee(outputs.cours ?? [], sonde, projeterDepuisBlueprint, (c) => c.categorie, (c) => c.debut)]);
    }
    return agreger(blocs);
}

/** Le chemin historique, recopie tel qu'il etait — vise Celcat directement, le relais etant mort. */
export async function viaLegacy() {
    const blocs = [];
    for (const sonde of SONDES) {
        const corps = corpsCalendrier({
            start: sonde.jour,
            end: LENDEMAIN[sonde.jour],
            resType: '103',
            calView: 'agendaDay',
            federationIds: sonde.groupes,
        });

        const response = await fetch(`${DOMAINE}/Home/GetCalendarData`, {
            method: 'POST',
            headers: ENTETES_CELCAT,
            body: new URLSearchParams(aPaires(corps)).toString(),
        });
        if (!response.ok) throw new Error(`legacy: statut ${response.status}`);

        const evenements = await response.json();
        blocs.push([sonde.cas, journee(evenements, sonde, projeterDepuisLegacy, (e) => e.eventCategory, (e) => e.start)]);
    }
    return agreger(blocs);
}

/** Les paires de `qs.stringify(..., { arrayFormat: 'repeat' })`, une cle repetee par valeur. */
function aPaires(corps) {
    const paires = [];
    for (const [cle, valeur] of Object.entries(corps)) {
        for (const element of Array.isArray(valeur) ? valeur : [valeur]) paires.push([cle, element]);
    }
    return paires;
}

/**
 * Le traitement d'une journee, identique des deux cotes : vacances ecartees, debordement du serveur
 * refiltre sur la date exacte, tri double.
 *
 * L'entree du planning agrege est la **liste** des groupes, exactement comme le service la transmet :
 * le code d'origine la recevait deja ainsi malgre sa signature, et la coercition en chaine qui en
 * decoule fait partie du comportement conserve.
 */
function journee(evenements, sonde, projeter, categorieDe, debutDe) {
    const groupe = sonde.groupes.length === 1 ? sonde.groupes[0] : sonde.groupes;
    const retenus = [];
    for (const brut of evenements) {
        if (categorieDe(brut) === 'Vacances') continue;
        if (String(debutDe(brut) ?? '').slice(0, 10) !== sonde.jour) continue;
        retenus.push(projeter(brut, groupe, ';'));
    }
    return retenus.sort(trier);
}

export function project(item) {
    if (item.resume === true) return { cas: item.cas, nombre: item.nombre };
    return { cas: item.cas, ...projeterCours(item.element) };
}

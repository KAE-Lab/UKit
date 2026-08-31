/**
 * Cas de parite : le lien d'abonnement colle, contre la meme source bornee par le serveur.
 *
 * **C'est la preuve du repli universel du jalon 6-J**, et elle est d'une nature un peu differente des
 * autres cas du harnais. Les deux chemins ne different pas par la bibliotheque qui lit — ils
 * different par **qui filtre** :
 *
 *   - `viaLegacy` demande une plage au serveur, comme le fait le Blueprint de Bordeaux INP depuis le
 *     jalon 6-I : `firstDate` / `lastDate` sont des parametres, et ADE les respecte ;
 *   - `viaBlueprint` joue `ukit.edt.abonnement`, qui demande le lien **verbatim et sans bornes** —
 *     c'est ce qui le rend universel, tous les produits d'emploi du temps n'acceptant pas de
 *     parametres de dates — puis **filtre dans l'application**.
 *
 * Ce que ca prouve : que ces deux facons de decouper une journee et une semaine rendent **exactement
 * les memes cours**. C'est ce qui autorise a proposer un lien colle a un etudiant dont la fac n'est pas
 * portee, sans lui promettre un resultat de seconde classe.
 *
 * Ce que ca ne prouve pas : que n'importe quel export iCal marche. Ce cas joue ADE, parce que c'est la
 * seule source reelle dont nous disposions ; les produits dont la fenetre est **figee a l'export**
 * restent une limite ecrite (docs/features/planning.md).
 *
 * La ressource, le projet et la semaine sont ceux de `ical-inp.parity.mjs` — semaine du 17 novembre
 * 2025, figee : l'export d'ADE sert encore l'annee ecoulee, donc le cas est reproductible pour
 * toujours, la ou « cette semaine » casserait a chaque vacances.
 *
 * Voir tools/parity/README.md et docs/phase-6/6-j-compte-et-sources-par-etablissement.md.
 */

import ICAL from 'ical.js';

import { agreger, jouerEnCapturant } from './commun.mjs';

export const NAME = 'ical-abonnement';

/** L'index de ressource de `ENSC 2A GR1`, tel que le catalogue le publie. */
const RESSOURCE = '7';

/** Le projet ADE vivant de l'annee 2025-2026. */
const PROJET = '1';

const RACINE = 'https://ade.bordeaux-inp.fr';
const CHEMIN = '/jsp/custom/modules/plannings/anonymous_cal.jsp';

/**
 * La plage large que le lien colle rapporte, et les deux decoupes a comparer.
 *
 * Le lien demande **un mois** plutot que l'annee entiere : le cas doit rester rapide et ne pas
 * telecharger 247 Ko a chaque passage du harnais. Un mois suffit a montrer ce qui compte — la decoupe
 * applicative doit ecarter tout ce qui deborde, et notamment les cours du **meme jour de la semaine**
 * dans les autres semaines, qui sont le piege reel.
 */
const PLAGE_LARGE = { debut: '2025-11-01', fin: '2025-11-30' };

const SONDES = [
    { cas: 'jour ordinaire', jour: '2025-11-18' },
    { cas: 'jour sans cours', jour: '2025-11-23' },
    { cas: 'semaine complete', lundi: '2025-11-17', dimanche: '2025-11-23' },
];

/** L'adresse d'abonnement, telle qu'un etudiant la collerait. */
function lien(debut, fin) {
    const url = new URL(CHEMIN, RACINE);
    url.search = new URLSearchParams({
        resources: RESSOURCE,
        projectId: PROJET,
        calType: 'ical',
        firstDate: debut,
        lastDate: fin,
    }).toString();
    return url.toString();
}

/** Les evenements d'un corps iCalendar, projetes sur ce que la comparaison retient. */
function evenements(ics) {
    const calendrier = new ICAL.Component(ICAL.parse(String(ics ?? '')));

    return calendrier.getAllSubcomponents('vevent').map((evenement) => {
        const lire = (nom) => String(evenement.getFirstPropertyValue(nom) ?? '');
        const debut = evenement.getFirstPropertyValue('dtstart')?.toJSDate() ?? null;

        return {
            id: lire('uid'),
            subject: lire('summary'),
            debut: debut === null ? null : debut.toISOString(),
            jour: debut === null ? '' : jourLocal(debut),
        };
    });
}

/** La journee **locale** d'un instant : `DTSTART` est en UTC, 08:30Z est le 18 a Paris. */
function jourLocal(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Le lundi de la semaine ISO d'une date locale, en `AAAA-MM-JJ`. */
function lundiDe(jour) {
    const date = new Date(`${jour}T12:00:00`);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return jourLocal(date);
}

/**
 * Le chemin du jalon : un lien sans bornes, filtre par l'application.
 *
 * Une **seule** requete pour les trois sondes — c'est exactement ce que fait l'application, dont le
 * cache garde le calendrier quelques minutes plutot que de le retelecharger a chaque changement de
 * jour.
 */
export async function viaBlueprint() {
    const { outputs } = await jouerEnCapturant('ukit-edt-abonnement.blueprint.json', {
        lien: lien(PLAGE_LARGE.debut, PLAGE_LARGE.fin),
    });

    const tous = evenements(outputs.ics);
    const blocs = [];

    for (const sonde of SONDES) {
        const retenus = sonde.jour !== undefined
            ? tous.filter((evenement) => evenement.jour === sonde.jour)
            : tous.filter((evenement) => lundiDe(evenement.jour) === sonde.lundi);

        blocs.push([sonde.cas, retenus.sort(parDebut)]);
    }
    return agreger(blocs);
}

/** Le chemin de reference : le serveur borne, une requete par sonde. */
export async function viaLegacy() {
    const blocs = [];

    for (const sonde of SONDES) {
        const debut = sonde.jour ?? sonde.lundi;
        const fin = sonde.jour ?? sonde.dimanche;

        const reponse = await fetch(lien(debut, fin), { headers: { Accept: 'text/calendar' } });
        if (!reponse.ok) throw new Error(`legacy: statut ${reponse.status}`);

        blocs.push([sonde.cas, evenements(await reponse.text()).sort(parDebut)]);
    }
    return agreger(blocs);
}

/** Le meme ordre des deux cotes : la source ne trie pas. */
function parDebut(gauche, droite) {
    const cle = (evenement) => `${evenement.debut ?? ''}|${evenement.id}`;
    return cle(gauche) < cle(droite) ? -1 : cle(gauche) > cle(droite) ? 1 : 0;
}

export function project(item) {
    if (item.resume === true) return { cas: item.cas, nombre: item.nombre };

    const evenement = item.element;
    return {
        cas: item.cas,
        id: evenement.id,
        subject: evenement.subject,
        debut: evenement.debut,
        jour: evenement.jour,
    };
}

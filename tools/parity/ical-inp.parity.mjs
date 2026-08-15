/**
 * Cas de parite : l'emploi du temps de Bordeaux INP, par son export iCalendar.
 *
 * **Ce cas n'a pas de chemin historique**, et c'est le premier du harnais dans ce cas. Les dix autres
 * comparent un Blueprint a un service qui existait avant lui ; ici la source n'a jamais ete portee —
 * l'onglet Planning disait son absence. Le second chemin est donc ce que la specification 6-I
 * demande : **le meme jour, lu par l'iCal et lu par l'export brut**.
 *
 * Les deux lectures sont ecrites **cote a cote dans ce fichier**, comme le harnais l'exige (un cas
 * qui importerait le code qu'il verifie suivrait ses evolutions et cesserait de comparer quoi que ce
 * soit) :
 *
 *   - `viaBlueprint` joue le Blueprint sous le moteur nu, puis lit le calendrier avec **`ical.js`**,
 *     la bibliotheque que l'application utilise ;
 *   - `viaLegacy` va chercher la meme reponse directement, et la lit avec un analyseur **ecrit a la
 *     main** ici — depliage, deshabillage, champs — sans partager une ligne avec le premier.
 *
 * Ce que ca prouve, et ce que ca ne prouve pas. Ca ne prouve pas qu'on lit « comme avant » : il n'y a
 * pas d'avant. Ca prouve que **la bibliotheque et notre lecture ne se trompent pas ensemble** — le
 * pliage de lignes RFC 5545, les echappements, l'ancre du code de module et les dates sont refaits
 * par un autre chemin, et les deux doivent tomber d'accord sur ce que l'ecran affiche. Le mapper
 * livre, lui, est verrouille par `IcsMapping.test.ts`, sur des corps mesures et sans reseau : les
 * deux portes se completent, aucune ne remplace l'autre.
 *
 * **La semaine est figee au 17 novembre 2025**, et c'est delibere : l'export d'ADE sert encore
 * l'annee ecoulee, et une semaine passee est reproductible pour toujours — la ou « cette semaine »
 * casserait a chaque vacances. Le contenu a ete mesure le 2026-08-15 : 17 evenements sur
 * `ENSC 2A GR1`, dont cinq le mardi 18.
 *
 * Voir tools/parity/README.md et docs/phase-6/6-i-planning-universel.md.
 */

import ICAL from 'ical.js';

import { agreger, jouerEnCapturant } from './commun.mjs';

export const NAME = 'ical-inp';

/**
 * Les deux ancres de la source, communes aux deux lectures.
 *
 * Ce sont des constantes **de la source** — la forme d'un code de module ADE, et l'horodatage que le
 * serveur ajoute a chaque export — et non du code de projection : les recopier deux fois ne
 * prouverait rien de plus et ferait deux occasions de n'en corriger qu'une.
 */
const CODE_MODULE = /^[A-Z]{3}\d-[A-Z0-9]{5}$/;
const HORODATAGE = /^\(Export[e\u00e9] le\s*:/;

/** L'index de ressource de `ENSC 2A GR1`, tel que le catalogue le publie (supabase/etablissements.sql). */
const RESSOURCE = '7';

/** Le projet ADE vivant de l'annee 2025-2026. Il change a chaque rentree, comme le referentiel. */
const PROJET = '1';

/**
 * Les quatre sondes, en dates fixes.
 *
 * Rien ne depend de l'instant : un cas qui echoue a minuit n'est pas un cas. Une annee purgee cote
 * universite viderait les deux chemins de la meme facon, et le cas resterait vert en le disant par sa
 * ligne de resume.
 */
const SONDES = [
    { cas: 'jour ordinaire', debut: '2025-11-18', fin: '2025-11-18' },
    { cas: 'jour sans cours', debut: '2025-11-23', fin: '2025-11-23' },
    { cas: 'semaine complete', debut: '2025-11-17', fin: '2025-11-23' },
    { cas: 'deux groupes agreges', debut: '2025-11-18', fin: '2025-11-18', ressources: '7,2' },
];

/** Le chemin migre : le Blueprint sous le moteur nu, puis la lecture par `ical.js`. */
export async function viaBlueprint() {
    const blocs = [];

    for (const sonde of SONDES) {
        const { outputs } = await jouerEnCapturant('portails/ukit-portail-bordeaux-inp-edt.blueprint.json', {
            projet: PROJET,
            ressources: sonde.ressources ?? RESSOURCE,
            debut: sonde.debut,
            fin: sonde.fin,
        });

        blocs.push([sonde.cas, parIcalJs(outputs.ics).sort(parDebut)]);
    }
    return agreger(blocs);
}

/** La lecture par la bibliotheque : elle deplie et deshabille, il reste a projeter les champs. */
function parIcalJs(ics) {
    const calendrier = new ICAL.Component(ICAL.parse(String(ics ?? '')));

    return calendrier.getAllSubcomponents('vevent').map((evenement) => {
        const lire = (nom) => String(evenement.getFirstPropertyValue(nom) ?? '');
        const matiere = lire('summary');
        const salle = lire('location');
        const lignes = lire('description')
            .split('\n')
            .map((ligne) => ligne.trim())
            .filter((ligne) => !HORODATAGE.test(ligne));

        const module = lignes.findIndex((ligne) => CODE_MODULE.test(ligne.split(',')[0].trim()));
        const categorie = module < 0 ? '' : (lignes[module + 1] ?? '');
        const utiles = lignes.filter((ligne) => ligne !== '' && ligne !== matiere && ligne !== categorie);
        const debut = evenement.getFirstPropertyValue('dtstart')?.toJSDate() ?? null;
        const fin = evenement.getFirstPropertyValue('dtend')?.toJSDate() ?? null;

        return {
            id: lire('uid'),
            subject: matiere,
            category: categorie,
            starttime: heure(debut),
            endtime: heure(fin),
            date: { start: debut === null ? null : debut.toISOString(), end: fin === null ? null : fin.toISOString() },
            description: (salle === '' ? utiles : [salle, ...utiles]).join('\n'),
        };
    });
}

/**
 * Le second chemin : la meme reponse, lue par un analyseur ecrit ici.
 *
 * Volontairement naif et complet — depliage, deshabillage, champs — pour ne partager **aucune ligne**
 * avec le chemin migre. C'est ce qui fait de ce cas une preuve plutot qu'un accord avec soi-meme.
 */
export async function viaLegacy() {
    const blocs = [];

    for (const sonde of SONDES) {
        const url = new URL('/jsp/custom/modules/plannings/anonymous_cal.jsp', 'https://ade.bordeaux-inp.fr');
        url.search = new URLSearchParams({
            resources: sonde.ressources ?? RESSOURCE,
            projectId: PROJET,
            calType: 'ical',
            firstDate: sonde.debut,
            lastDate: sonde.fin,
        }).toString();

        const reponse = await fetch(url, { headers: { Accept: 'text/calendar' } });
        if (!reponse.ok) throw new Error(`legacy: statut ${reponse.status}`);

        blocs.push([sonde.cas, evenements(await reponse.text()).sort(parDebut)]);
    }
    return agreger(blocs);
}

/** Le depliage RFC 5545 : une ligne de continuation s'ouvre par une espace ou une tabulation. */
function deplier(source) {
    return source.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

/** Le deshabillage RFC 5545 d'une valeur de propriete. */
function deshabiller(valeur) {
    return valeur
        .replace(/\\n/gi, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}

/** `20251118T083000Z` — la seule forme que ce serveur emet, et elle est en UTC honnete. */
function instant(brut) {
    const [, a, m, j, h, mi, s] = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(brut) ?? [];
    if (a === undefined) return null;
    return new Date(Date.UTC(Number(a), Number(m) - 1, Number(j), Number(h), Number(mi), Number(s)));
}

/** Les evenements d'un corps iCalendar, projetes sur ce que l'ecran affiche. */
function evenements(source) {
    const retenus = [];

    for (const bloc of deplier(source).split('BEGIN:VEVENT').slice(1)) {
        const corps = bloc.split('END:VEVENT')[0];
        const champ = (nom) => {
            const trouve = new RegExp(`^${nom}(?:;[^:\\n]*)?:(.*)$`, 'm').exec(corps);
            return trouve ? deshabiller(trouve[1]) : '';
        };

        const matiere = champ('SUMMARY');
        const salle = champ('LOCATION');
        const lignes = champ('DESCRIPTION')
            .split('\n')
            .map((ligne) => ligne.trim())
            .filter((ligne) => !HORODATAGE.test(ligne));

        const module = lignes.findIndex((ligne) => CODE_MODULE.test(ligne.split(',')[0].trim()));
        const categorie = module < 0 ? '' : (lignes[module + 1] ?? '');

        const utiles = lignes.filter((ligne) => ligne !== '' && ligne !== matiere && ligne !== categorie);
        const debut = instant(champ('DTSTART'));
        const fin = instant(champ('DTEND'));

        retenus.push({
            id: champ('UID'),
            subject: matiere,
            category: categorie,
            starttime: heure(debut),
            endtime: heure(fin),
            date: { start: debut === null ? null : debut.toISOString(), end: fin === null ? null : fin.toISOString() },
            description: (salle === '' ? utiles : [salle, ...utiles]).join('\n'),
        });
    }
    return retenus;
}

/** L'heure locale d'affichage, `HH:mm`. Les deux chemins la calculent dans le meme fuseau. */
function heure(date) {
    if (date === null) return 'Invalid date';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Le meme ordre des deux cotes : la source ne trie pas, et le tri de l'application est ailleurs. */
function parDebut(gauche, droite) {
    const cle = (evenement) => `${evenement.date.start ?? ''}|${evenement.id}`;
    return cle(gauche) < cle(droite) ? -1 : cle(gauche) > cle(droite) ? 1 : 0;
}

/**
 * Ce que la comparaison retient.
 *
 * `color` et `style` en sont **volontairement absents**, et c'est le seul champ exclu de ce cas : la
 * couleur n'existe pas dans la source, elle est **derivee** de la matiere par l'application (jalon
 * 6-I). La recopier ici ne comparerait qu'une empreinte a elle-meme. Ce qu'elle doit tenir — meme
 * matiere, meme teinte, et une teinte de la palette du theme — est verrouille par
 * `IcsMapping.test.ts`, ou c'est verifiable sans reseau.
 *
 * `toFilter` est exclu pour la meme raison : il depend du groupe demande, pas de la reponse.
 */
export function project(item) {
    if (item.resume === true) return { cas: item.cas, nombre: item.nombre };

    const evenement = item.element;
    return {
        cas: item.cas,
        id: evenement.id,
        subject: evenement.subject,
        category: evenement.category,
        starttime: evenement.starttime,
        endtime: evenement.endtime,
        debut: evenement.date.start,
        fin: evenement.date.end,
        description: evenement.description,
    };
}

/**
 * Les deux traductions d'un cours Celcat, cote a cote : celle du chemin migre et celle du chemin
 * historique.
 *
 * Quatre cas de parite les partagent — la journee, la semaine, la plage annuelle et l'occupation des
 * salles. Ce fichier deroge donc a « chaque cas recopie sa projection », et la nuance qui l'autorise
 * est celle qui compte : ce qui est interdit est d'**importer le service**, parce qu'un cas qui suit
 * les evolutions du code qu'il verifie ne verifie plus rien. Ici, les deux copies vivent dans le
 * harnais, elles sont figees, et les recopier trois fois n'aurait fait que trois occasions de n'en
 * corriger qu'une.
 *
 * La difference de forme est le sujet meme du jalon : a gauche des champs **nommes par le Blueprint**
 * et une arite d'extraction, a droite la reponse brute du serveur.
 *
 * Voir tools/parity/README.md.
 */

import { decode } from 'html-entities';
import moment from 'moment';
// `.js` explicite : Node resout les sous-chemins d'un paquet CommonJS a la lettre, la ou Metro
// tolere l'extension implicite.
import 'moment/locale/fr.js';

moment.locale('fr');

export const DOMAINE = 'https://celcat.u-bordeaux.fr/calendar';

/**
 * Ce que le catalogue fournit aux six Blueprints Celcat depuis le jalon 6-G.
 *
 * Les cas les passent **explicitement**, alors que les fichiers portent les memes valeurs par defaut :
 * c'est le chemin de l'application qu'on veut mesurer, et l'application les passe. S'en remettre au
 * defaut laisserait passer un plombage casse — un service qui oublierait de transmettre l'hote de
 * l'etablissement continuerait d'interroger Bordeaux, et la parite resterait verte pendant qu'un
 * etudiant d'ailleurs verrait le planning d'une autre universite.
 *
 * Les valeurs sont celles de la ligne `bordeaux` (supabase/etablissements.sql), recopiees plutot
 * qu'importees : un cas qui suivrait le catalogue verifierait son propre accord avec lui-meme.
 */
export const CATALOGUE_BORDEAUX = {
    domaine: DOMAINE,
    groupes: { domaine: DOMAINE, res_type: '103' },
    salles: { domaine: DOMAINE, res_type: '102' },
};

/** Les en-tetes que le service historique envoyait, `Connection` mis a part (interdit a `fetch`). */
export const ENTETES_CELCAT = {
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
};

/** `formatUtils.formatDescription`, recopie. */
function formatDescription(valeur) {
    return decode(String(valeur ?? '').replace(/\r/g, '').replace(/<br \/>/g, '').replace(/\n\n\n\n/g, ';'));
}

function upperCaseFirstLetter(valeur) {
    return valeur.charAt(0).toUpperCase() + valeur.slice(1);
}

/** `PlanningApiService.sortFunctionGroup`, recopie. */
export function trier(gauche, droite) {
    const regexUE = RegExp('([0-9][A-Z0-9]+) (.+)', 'im');
    let sujetGauche = gauche.subject.toUpperCase();
    let sujetDroite = droite.subject.toUpperCase();
    const trouveGauche = regexUE.exec(sujetGauche);
    const trouveDroite = regexUE.exec(sujetDroite);

    if (trouveGauche && trouveGauche.length === 3) sujetGauche = `${trouveGauche[2]}`;
    if (trouveDroite && trouveDroite.length === 3) sujetDroite = `${trouveDroite[2]}`;

    if (gauche.starttime > droite.starttime) return 1;
    if (gauche.starttime < droite.starttime) return -1;
    else if (sujetGauche > sujetDroite) return 1;
    else if (sujetGauche < sujetDroite) return -1;
    return 0;
}

/** Le corps commun aux deux chemins, dans l'ordre exact ou le service historique le composait. */
export function corpsCalendrier({ start, end, resType, calView, federationIds, colourScheme = '3' }) {
    return { start, end, resType, calView, 'federationIds[]': federationIds, colourScheme };
}

/**
 * Le chemin **migre** : un cours tel que le Blueprint le nomme, projete sur le contrat applicatif.
 *
 * `modules` porte les trois arites d'une extraction — `null`, la valeur seule, la liste. C'est la
 * seule difference de lecture avec le chemin historique, et c'est celle qui casserait en silence.
 */
export function projeterDepuisBlueprint(brut, groupe, separateur) {
    const modules = brut.modules;
    let sujet;
    if (typeof modules === 'string' && modules !== '') sujet = modules;
    else if (Array.isArray(modules) && modules.length > 0) sujet = modules[0];
    else sujet = brut.categorie ?? '';

    return composer({
        id: brut.id,
        debut: brut.debut,
        fin: brut.fin,
        categorie: brut.categorie ?? '',
        couleur: brut.couleur ?? '',
        description: brut.description,
        // Ce que l'extraction `$.sites[*]` rend : une **chaine** a une seule correspondance, une
        // liste au-dela. Le cote historique lit le champ brut ; la comparaison prouve donc que
        // l'extraction ne perd ni ne deforme rien, arite comprise.
        sites: brut.sites,
        sujet,
        groupe,
        separateur,
    });
}

/**
 * Le chemin **historique** : `PlanningApiService.parseEvent` tel qu'il etait avant la migration.
 *
 * `modules.shift()` sur un tableau, et la categorie en repli quand il est nul.
 */
export function projeterDepuisLegacy(event, groupe, separateur) {
    const modules = event.modules === null ? null : [...event.modules];
    const sujet = modules !== null ? modules.shift() : event.eventCategory;

    return composer({
        id: event.id,
        debut: event.start,
        fin: event.end,
        categorie: event.eventCategory,
        couleur: event.backgroundColor,
        description: event.description,
        // Le champ tel que le serveur le sert : toujours une liste. Le code d'origine ne le lisait
        // pas — il n'existait aucune carte fondee dessus — mais la source, elle, le publiait deja.
        sites: event.sites,
        sujet,
        groupe,
        separateur,
    });
}

/** Le reste de la transformation, identique des deux cotes : c'est ce qui doit rester egal. */
function composer({ id, debut, fin, categorie, couleur, description, sites, sujet, groupe, separateur }) {
    const debutMoment = moment(debut ?? null);
    const finMoment = moment(fin ?? null);
    const starttime = debutMoment.format('HH:mm');
    const endtime = finMoment.format('HH:mm');

    const lignes = formatDescription(description).split(separateur);
    const retenues = [];
    for (const ligne of lignes) {
        if (!ligne.includes(categorie) && !ligne.includes(sujet)) retenues.push(ligne.trim());
    }

    const cible = String(groupe);
    let toFilter = null;
    if (retenues[0] !== undefined && retenues[0].includes(cible)) {
        const filtre = retenues[0].replace(cible, '').replace('-', '').trim();
        toFilter = filtre !== '' ? filtre : null;
    }

    return {
        id,
        color: couleur,
        schedule: starttime + '-' + endtime + ' ' + categorie,
        starttime,
        endtime,
        date: { start: debutMoment.toISOString(), end: finMoment.toISOString() },
        subject: sujet,
        description: retenues.filter((ligne) => ligne !== '').join('\n'),
        category: categorie,
        toFilter,
        sites: normaliserSites(sites),
        day: upperCaseFirstLetter(debutMoment.format('dddd L')),
        dayNumber: String(debutMoment.isoWeekday()),
    };
}

/** L'arite ramenee a une liste, des deux cotes — la meme regle que `sitesDuCours` cote application. */
function normaliserSites(sites) {
    if (typeof sites === 'string') return sites === '' ? [] : [sites];
    if (Array.isArray(sites)) return sites.filter((site) => typeof site === 'string' && site !== '');
    return [];
}

/** Le decoupage d'une semaine en six jours, identique des deux cotes. */
export function decouper(cours, lundi) {
    const semaine = Array.from({ length: 6 }).map((_, index) => ({
        dayNumber: String(index + 1),
        dayTimestamp: moment(lundi).startOf('day').add(index, 'day').unix(),
        courses: [],
    }));

    for (const projete of cours) {
        const jourIso = Number(projete.dayNumber);
        if (jourIso < 1 || jourIso > 6) continue;
        semaine[jourIso - 1].courses.push(projete);
    }

    for (const jour of semaine) jour.courses.sort(trier);
    return semaine;
}

/** Tout ce qu'un ecran lit d'un cours. La projection de comparaison, commune aux six cas. */
export function projeterCours(cours) {
    return {
        id: cours.id ?? null,
        color: cours.color ?? null,
        schedule: cours.schedule ?? null,
        starttime: cours.starttime ?? null,
        endtime: cours.endtime ?? null,
        debut: cours.date?.start ?? null,
        fin: cours.date?.end ?? null,
        subject: cours.subject ?? null,
        description: cours.description ?? null,
        category: cours.category ?? null,
        toFilter: cours.toFilter ?? null,
        sites: (cours.sites ?? []).join('|'),
        day: cours.day ?? null,
        dayNumber: cours.dayNumber ?? null,
    };
}

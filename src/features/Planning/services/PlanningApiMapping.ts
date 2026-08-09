/**
 * Le contrat de l'emploi du temps, et la traduction depuis les sorties des Blueprints Celcat.
 *
 * Separe de `PlanningApiService` pour la meme raison que `CrousMapping` : ce module ne doit **rien**
 * importer de plateforme, ni le socle Aetherius, ni `Translator`. Ce qui est risque ici — l'arite
 * d'une extraction, un separateur qui depend de la vue, une borne de fin nulle — le devient
 * (PlanningApiMapping.test.ts).
 *
 * Tout le travail de forme reste applicatif, et il est substantiel. Il n'a pas ete descendu dans les
 * fichiers, et chaque refus a sa raison : le rejet des `Vacances` **et** le refiltrage sur la date
 * exacte sont un seul filtre qui doit vivre a un seul endroit, le nettoyage de la description est du
 * calcul, et le decoupage de la semaine a besoin de l'heure courante.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-e-planning.md.
 */

import moment from 'moment';
import 'moment/locale/fr';

import { formatDescription, upperCaseFirstLetter } from '../../../shared/utils/formatUtils';

// La locale suivait deja ce module avant la migration : `Translator` la reglera sur la langue
// choisie au chargement, celle-ci n'est que la valeur de depart. La deplacer ici plutot que dans le
// service garde le formatage et sa locale au meme endroit.
moment.locale('fr');

/** Ce qu'un ecran manipule. Les noms ne bougent pas : changer de source ne renomme pas un contrat. */
export interface PlanningEvent {
    id: string;
    style: string;
    color: string;
    schedule: string;
    starttime: string;
    endtime: string;
    date: { start: string; end: string };
    subject: string;
    description: string;
    category: string;
    group: string;
    toFilter?: string | null;
    day?: string;
    dayNumber?: string;
}

export interface PlanningWeekDay {
    dayNumber: string;
    dayTimestamp: number;
    courses: PlanningEvent[];
}

/**
 * Une ligne de `outputs.cours`, telle que les Blueprints la nomment.
 *
 * `modules` porte les trois arites d'une extraction et c'est le piege du jalon : un chemin qui ne
 * correspond a rien rend `null`, une seule correspondance rend **la valeur**, plusieurs rendent la
 * liste. Un cours a un module rend donc une chaine, pas un tableau d'un element.
 *
 * `fin` est `null` sur les evenements de vacances, que Celcat sert en journee entiere sans heure de
 * fin. La valeur descend telle quelle : `moment(null)` est une date invalide, ce que le code
 * d'origine produisait deja.
 */
export interface CoursExtrait {
    id?: unknown;
    debut?: unknown;
    fin?: unknown;
    categorie?: unknown;
    couleur?: unknown;
    modules?: unknown;
    description?: unknown;
}

/** Le groupe interroge : une chaine, ou la liste des favoris pour le planning agrege. */
export type CibleGroupe = string | string[];

function texte(valeur: unknown): string {
    return typeof valeur === 'string' ? valeur : '';
}

/**
 * Le sujet du cours : le premier `modules`, avec repli sur la categorie.
 *
 * Le repli couvre les deux formes qu'une extraction peut rendre pour un champ absent — `null` — et
 * une liste vide, que l'extraction rend elle aussi `null` : les deux sont indistinguables une fois la
 * reponse traduite. Un an de donnees interroge le 2026-08-09 ne contient aucun `modules: []`, et le
 * code d'origine y rendait un sujet `undefined`, affiche vide. Voir docs/features/planning.md.
 */
export function sujetDuCours(modules: unknown, categorie: string): string {
    if (typeof modules === 'string' && modules !== '') return modules;
    if (Array.isArray(modules) && modules.length > 0) return texte(modules[0]);
    return categorie;
}

/**
 * Projette un cours extrait sur le contrat applicatif.
 *
 * Le `separateur` **depend de la vue** : `;` pour le jour et la synchronisation, `\n` pour la
 * semaine. Celcat ne formate pas la description de la meme facon selon `calView`, et uniformiser
 * casserait l'affichage des salles. C'est une difference deliberee, a ne pas « corriger ».
 */
export function projeterCours(brut: CoursExtrait, groupe: CibleGroupe, separateur: string = '\n'): PlanningEvent {
    // `?? null` et non `?? undefined` : `moment(undefined)` vaut *maintenant*, `moment(null)` est une
    // date invalide. C'est cette seconde forme que le code d'origine produisait sur une fin nulle.
    const debut = moment(brut.debut ?? null);
    const fin = moment(brut.fin ?? null);
    const starttime = debut.format('HH:mm');
    const endtime = fin.format('HH:mm');

    const categorie = texte(brut.categorie);
    const subject = sujetDuCours(brut.modules, categorie);

    // Le code d'origine appelait `.replace` sur la description sans la verifier : une reponse sans ce
    // champ levait, et le `catch` du service vidait la journee entiere en silence.
    const lignes = formatDescription(texte(brut.description)).split(separateur);
    const description: string[] = [];
    for (const ligne of lignes) {
        if (!ligne.includes(categorie) && !ligne.includes(subject)) {
            description.push(ligne.trim());
        }
    }

    // Le planning agrege passe la liste de ses groupes ; `String` reproduit la coercition que le code
    // d'origine subissait deja (`['A','B']` devient `'A,B'`, qui ne correspond a aucune description).
    const cible = String(groupe);
    let toFilter: string | null = null;
    if (description[0] !== undefined && description[0].includes(cible)) {
        const filtre = description[0].replace(cible, '').replace('-', '').trim();
        toFilter = filtre !== '' ? filtre : null;
    }

    return {
        id: texte(brut.id),
        style: 'style="background-color:' + texte(brut.couleur) + '"',
        color: texte(brut.couleur),
        schedule: starttime + '-' + endtime + ' ' + categorie,
        starttime,
        endtime,
        date: { start: debut.toISOString(), end: fin.toISOString() },
        subject,
        description: description.filter((ligne) => ligne !== '').join('\n'),
        category: categorie,
        // Verbatim, y compris la liste du planning agrege : le champ est declare `string` depuis
        // toujours et aucun ecran ne le lit. Le convertir changerait le contenu des caches ecrits.
        group: groupe as string,
        toFilter,
    };
}

/**
 * Le tri d'affichage : heure de debut, puis sujet alphabetique **apres retrait du code d'UE**.
 *
 * `4TIN301U Algorithmique` se trie donc sur `Algorithmique`, sans quoi l'ordre suivrait des codes que
 * personne ne lit.
 */
export function trierCours(gauche: { subject: string; starttime: string }, droite: { subject: string; starttime: string }): number {
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

/** Une journee de cours : `Vacances` ecartees, debordements du serveur refiltres, tri applique. */
export function projeterJour(cours: CoursExtrait[], groupe: CibleGroupe, date: string): PlanningEvent[] {
    const retenus: PlanningEvent[] = [];
    for (const brut of cours) {
        if (texte(brut.categorie) === 'Vacances') continue;
        // Le serveur deborde : une journee demandee un dimanche rend les cours du lundi.
        if (moment(brut.debut ?? null).format('YYYY-MM-DD') !== date) continue;

        retenus.push(projeterCours(brut, groupe, ';'));
    }
    return retenus.sort(trierCours);
}

/**
 * Une semaine, decoupee en six jours du lundi au samedi.
 *
 * Le dimanche est ecarte : l'application n'affiche que six colonnes, et la requete elle-meme s'arrete
 * a cette borne. `lundi` arrive du service parce que le deduire d'un numero de semaine ISO demande
 * l'heure courante et la locale — deux choses qu'un Blueprint n'a pas.
 */
export function decouperSemaine(cours: CoursExtrait[], groupe: CibleGroupe, lundi: moment.Moment): PlanningWeekDay[] {
    const semaine: PlanningWeekDay[] = Array.from({ length: 6 }).map((_, index) => ({
        dayNumber: String(index + 1),
        dayTimestamp: lundi.clone().startOf('day').add(index, 'day').unix(),
        courses: [],
    }));

    for (const brut of cours) {
        if (texte(brut.categorie) === 'Vacances') continue;

        const debut = moment(brut.debut ?? null);
        const jourIso = debut.isoWeekday();
        if (jourIso < 1 || jourIso > 6) continue;

        const projete = projeterCours(brut, groupe, '\n');
        projete.day = upperCaseFirstLetter(debut.format('dddd L'));
        projete.dayNumber = String(jourIso);

        semaine[jourIso - 1].courses.push(projete);
    }

    for (const jour of semaine) {
        jour.courses.sort(trierCours);
    }

    return semaine;
}

/**
 * La plage annuelle de la synchronisation calendrier : la meme projection, a plat.
 *
 * Le separateur est celui du jour (`;`) et non celui de la semaine, bien que la requete utilise
 * `agendaWeek` — c'est le comportement d'origine, et le calendrier systeme affiche ces descriptions.
 */
export function projeterAnnee(cours: CoursExtrait[], groupe: CibleGroupe): PlanningEvent[] {
    const evenements: PlanningEvent[] = [];
    for (const brut of cours) {
        if (texte(brut.categorie) === 'Vacances') continue;

        const debut = moment(brut.debut ?? null);
        const projete = projeterCours(brut, groupe, ';');
        projete.day = upperCaseFirstLetter(debut.format('dddd L'));
        projete.dayNumber = String(debut.isoWeekday());

        evenements.push(projete);
    }
    return evenements.sort(trierCours);
}

/**
 * La liste des groupes : les identifiants trop courts sont ecartes, le reste est trie.
 *
 * Reste applicatif parce que c'est un filtre de longueur et un tri, donc du calcul — il faudrait le
 * reimplementer a l'identique dans les deux moteurs (docs/blueprints.md).
 */
export function projeterGroupes(identifiants: unknown[]): string[] {
    return identifiants
        .filter((identifiant): identifiant is string => typeof identifiant === 'string' && identifiant.length > 2)
        .sort();
}

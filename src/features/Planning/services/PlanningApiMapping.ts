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

import { formatDescription } from '../../../shared/utils/formatUtils';
import {
    assemblerAnnee,
    assemblerJour,
    assemblerSemaine,
    trierCours,
    type CibleGroupe,
    type PlanningEvent,
    type PlanningWeekDay,
} from './PlanningAssembly';

// La locale suivait deja ce module avant la migration : `Translator` la reglera sur la langue
// choisie au chargement, celle-ci n'est que la valeur de depart. La deplacer ici plutot que dans le
// service garde le formatage et sa locale au meme endroit.
moment.locale('fr');

// Le contrat et l'assemblage vivent dans `PlanningAssembly` depuis le jalon 6-I, parce qu'ils sont
// communs aux deux sources d'emploi du temps. Ils sont reexportes ici pour que rien n'ait a changer
// d'import : ce module reste la porte d'entree de la projection Celcat.
export { trierCours };
export type { CibleGroupe, PlanningEvent, PlanningWeekDay };

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
    sites?: unknown;
}

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
 * Les batiments declares par la source, quelle que soit leur arite.
 *
 * `$.sites[*]` rend une **chaine** quand il n'y a qu'un site et une **liste** au-dela — le meme piege
 * que `modules`, deja paye une fois (`sujetDuCours`). Un champ absent rend `null`, indistinguable
 * d'une liste vide une fois la reponse traduite, et les deux veulent dire la meme chose ici : on ne
 * sait pas ou est ce cours.
 */
export function sitesDuCours(sites: unknown): string[] {
    if (typeof sites === 'string') return sites === '' ? [] : [sites];
    if (Array.isArray(sites)) return sites.filter((site): site is string => typeof site === 'string' && site !== '');
    return [];
}

/**
 * Projette un cours extrait sur le contrat applicatif.
 *
 * Le `separateur` est `;` pour **toutes** les vues depuis la correction de la description de la
 * semaine. Il ne l'a pas toujours ete : la vue semaine decoupait sur `\n` au nom d'un formatage
 * different selon `calView`, justification mesuree fausse au jalon 6-E puis conservee telle quelle
 * parce que la corriger deplacait des pixels. Le serveur formate a l'identique dans les deux vues
 * (`\r\n\r\n<br />\r\n\r\n`), que `formatDescription` reduit a des `;` : decouper sur `\n` ne rendait
 * qu'un champ, porteur de la categorie, donc ecarte en entier — d'ou une vue semaine sans salle, sans
 * enseignant et sans carte. Le parametre reste, pour qu'un futur format n'ait pas a rouvrir la
 * signature.
 */
export function projeterCours(brut: CoursExtrait, groupe: CibleGroupe, separateur: string = ';'): PlanningEvent {
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
        sites: sitesDuCours(brut.sites),
    };
}

/**
 * Les evenements que Celcat sert et qu'on ne montre pas : les `Vacances`.
 *
 * Le filtre vit ici et pas dans l'assemblage commun parce qu'il est propre a **cette** source — ce
 * serveur sert les vacances comme des cours, l'export iCalendar ne le fait pas. Il ne vit pas non
 * plus dans le Blueprint : la recherche de salles libres a *besoin* des vacances, ce sont elles qui
 * declarent un batiment ferme (blueprints/README.md).
 */
function horsVacances(cours: CoursExtrait[]): CoursExtrait[] {
    return cours.filter((brut) => texte(brut.categorie) !== 'Vacances');
}

/** Une journee de cours : `Vacances` ecartees, debordements du serveur refiltres, tri applique. */
export function projeterJour(cours: CoursExtrait[], groupe: CibleGroupe, date: string): PlanningEvent[] {
    // Le serveur deborde : une journee demandee un dimanche rend les cours du lundi.
    const duJour = horsVacances(cours).filter((brut) => moment(brut.debut ?? null).format('YYYY-MM-DD') === date);
    return assemblerJour(duJour.map((brut) => projeterCours(brut, groupe, ';')));
}

/** Une semaine, decoupee en six jours du lundi au samedi par l'assemblage commun aux deux sources. */
export function decouperSemaine(cours: CoursExtrait[], groupe: CibleGroupe, lundi: moment.Moment): PlanningWeekDay[] {
    return assemblerSemaine(
        horsVacances(cours).map((brut) => projeterCours(brut, groupe, ';')),
        lundi,
    );
}

/**
 * La plage annuelle de la synchronisation calendrier : la meme projection, a plat.
 *
 * Le separateur est celui du jour (`;`) et non celui de la semaine, bien que la requete utilise
 * `agendaWeek` — c'est le comportement d'origine, et le calendrier systeme affiche ces descriptions.
 */
export function projeterAnnee(cours: CoursExtrait[], groupe: CibleGroupe): PlanningEvent[] {
    return assemblerAnnee(horsVacances(cours).map((brut) => projeterCours(brut, groupe, ';')));
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

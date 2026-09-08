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
    estUnCodeDUE,
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
 * Les modules declares par la source, quelle que soit leur arite — la meme regle que `sitesDuCours`.
 *
 * Le sujet n'en garde que le premier ; la liste entiere est conservee parce qu'un cours a plusieurs
 * codes d'UE ne doit pas perdre les suivants (filtresUe.ts).
 */
export function modulesDuCours(modules: unknown): string[] {
    return sitesDuCours(modules);
}

/** Les espaces ramenees a une : `modules` en sert parfois deux la ou la description n'en a qu'une. */
function normaliserEspaces(valeur: string): string {
    return valeur.replace(/\s+/g, ' ').trim();
}

/**
 * Rend a un module reduit a son seul code l'intitule que porte la description.
 *
 * **Celcat ne declare pas ses modules de la meme facon d'un groupe a l'autre.** La plupart servent
 * `4TIN602U Techn algorithmiques` ; le master Genie Logiciel sert `4TGL902U`, le code nu, et met
 * l'intitule dans la description — `4TGL902U Programmation Large Echelle`. Le cours s'affichait donc
 * sous son code, et l'intitule etait perdu **deux fois** : le sujet n'en portait pas, et la ligne de
 * description qui le portait etait ecartee comme doublon du module, puisqu'elle contient le code.
 * Signale par un utilisateur le 2026-09-08, mesure le meme jour sur `4TGL904S M2 Genie Logiciel`.
 *
 * La consequence silencieuse etait pire que l'affichage : sans intitule, `separerCodeUE` ne separe
 * rien, le cours ne porte **aucun code d'UE**, et les filtres d'UE de ces groupes ne filtraient rien.
 *
 * La ligne retenue est celle qui commence par le code suivi d'une espace. Aucune autre heuristique :
 * si la description ne la porte pas, le module reste tel quel — on ne devine pas un intitule.
 */
export function completerLesModules(modules: readonly string[], lignes: readonly string[]): string[] {
    const normalisees = lignes.map(normaliserEspaces);
    return modules.map((module) => {
        const code = normaliserEspaces(module);
        if (code === '' || !estUnCodeDUE(code)) return module;
        const complet = normalisees.find((ligne) => ligne.length > code.length + 1 && ligne.startsWith(`${code} `));
        return complet ?? module;
    });
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

    // Le code d'origine appelait `.replace` sur la description sans la verifier : une reponse sans ce
    // champ levait, et le `catch` du service vidait la journee entiere en silence.
    const lignes = formatDescription(texte(brut.description)).split(separateur);

    // Les modules **avant** le sujet : la description peut leur rendre un intitule que Celcat ne
    // declare pas (`completerLesModules`), et c'est le sujet et les codes d'UE qui en dependent.
    const modules = completerLesModules(modulesDuCours(brut.modules), lignes);
    const subject = sujetDuCours(modules, categorie);

    // Les lignes qui repetent un module — **chacun**, pas seulement le premier — sont ecartees, aux
    // espaces pres : `modules` sert parfois deux espaces apres le code la ou la description n'en a
    // qu'une (mesure du 2026-08-22), et la ligne survivait alors en doublon du sujet.
    const repetes = [subject, ...modules].map(normaliserEspaces).filter((valeur) => valeur !== '');
    const description: string[] = [];
    for (const ligne of lignes) {
        const normalisee = normaliserEspaces(ligne);
        if (!ligne.includes(categorie) && !repetes.some((repete) => normalisee.includes(repete))) {
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
        modules,
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

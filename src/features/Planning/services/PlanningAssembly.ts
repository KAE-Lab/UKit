/**
 * Le contrat de l'emploi du temps, et l'assemblage commun aux deux sources.
 *
 * Ce module ne connait **aucune** source : il recoit des `PlanningEvent` deja projetes et les range
 * — une journee triee, une semaine en six jours, une annee a plat. Il existe parce que le jalon 6-I
 * a ajoute une seconde source d'emploi du temps (l'export iCalendar) et que ce rangement-la est
 * exactement le meme des deux cotes : six colonnes du lundi au samedi, `dayNumber`, `dayTimestamp`,
 * puis le tri par heure et par sujet. Le recopier aurait fait deux endroits a corriger, donc un jour
 * un seul des deux.
 *
 * Ce qui **n'est pas** ici, et volontairement : tout ce qui depend de la source. Le rejet des
 * evenements `Vacances` et le refiltrage sur la date exacte sont propres a Celcat — le premier parce
 * que ce serveur sert les vacances comme des cours, le second parce qu'il deborde d'un jour — et ils
 * s'appliquent **avant** l'assemblage, dans `PlanningApiMapping`. Les monter ici en ferait des regles
 * generales qu'elles ne sont pas.
 *
 * Comme `PlanningApiMapping`, il n'importe rien de plateforme : ni le socle Aetherius, ni
 * `Translator`. C'est ce qui le rend testable.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-i-planning-universel.md.
 */

import moment from 'moment';
import 'moment/locale/fr';

import { upperCaseFirstLetter } from '../../../shared/utils/formatUtils';

// La locale suivait deja ce module avant la migration : `Translator` la reglera sur la langue
// choisie au chargement, celle-ci n'est que la valeur de depart.
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

/** Le groupe interroge : une chaine, ou la liste des favoris pour le planning agrege. */
export type CibleGroupe = string | string[];

/**
 * Le code d'unite d'enseignement en tete d'un sujet : un chiffre, puis des caracteres dont **au moins
 * une lettre**.
 *
 * La lettre obligatoire est une correction du jalon 6-I, et elle vient d'une mesure. La regle
 * d'origine, `[0-9][A-Z0-9]+`, acceptait un nombre nu — ce qui allait tant que la seule source etait
 * Celcat, dont les codes ressemblent a `4TIN602U`. Les titres d'ADE commencent souvent par une annee :
 * `2025-2026 - Les rencontres du Reseau d'Ecoute` devenait un cours d'UE `2026` intitule
 * `- Les rencontres du Reseau d'Ecoute`, tiret orphelin compris. Seize matieres d'un seul groupe
 * etaient dans ce cas, mesure le 2026-08-15.
 */
const CODE_UE = /([0-9][A-Z0-9]*[A-Z][A-Z0-9]*) (.+)/im;

/**
 * Separe un sujet entre son code d'UE et son intitule, ou rend `null` s'il n'en porte pas.
 *
 * Une seule definition, parce qu'il y en avait deux — ici et dans `CourseManager.computeCourseUE` —
 * et que la seconde a garde le defaut trois heures de plus que la premiere aurait pu.
 */
export function separerCodeUE(sujet: string): { code: string; reste: string } | null {
    const trouve = CODE_UE.exec(sujet);
    return trouve !== null && trouve.length === 3 ? { code: trouve[1], reste: trouve[2] } : null;
}

/**
 * Le tri d'affichage : heure de debut, puis sujet alphabetique **apres retrait du code d'UE**.
 *
 * `4TIN301U Algorithmique` se trie donc sur `Algorithmique`, sans quoi l'ordre suivrait des codes que
 * personne ne lit. Un sujet sans code d'UE — ce que rend l'export iCalendar, qui porte le code dans
 * sa description et non dans son titre — se trie simplement sur lui-meme.
 */
export function trierCours(
    gauche: { subject: string; starttime: string },
    droite: { subject: string; starttime: string },
): number {
    let sujetGauche = gauche.subject.toUpperCase();
    let sujetDroite = droite.subject.toUpperCase();
    sujetGauche = separerCodeUE(sujetGauche)?.reste ?? sujetGauche;
    sujetDroite = separerCodeUE(sujetDroite)?.reste ?? sujetDroite;

    if (gauche.starttime > droite.starttime) return 1;
    if (gauche.starttime < droite.starttime) return -1;
    else if (sujetGauche > sujetDroite) return 1;
    else if (sujetGauche < sujetDroite) return -1;
    return 0;
}

/** Une journee : le tri, et rien d'autre. Le filtrage appartient a la source. */
export function assemblerJour(evenements: PlanningEvent[]): PlanningEvent[] {
    return [...evenements].sort(trierCours);
}

/**
 * Une semaine, decoupee en six jours du lundi au samedi.
 *
 * Le dimanche est ecarte : l'application n'affiche que six colonnes. `lundi` arrive du service parce
 * que le deduire d'un numero de semaine ISO demande l'heure courante et la locale — deux choses qu'un
 * Blueprint n'a pas.
 *
 * Le jour d'un evenement se lit sur `date.start` et non sur la donnee brute : c'est le meme instant,
 * et c'est ce qui rend cet assemblage independant de la source. Une date invalide — la fin nulle d'un
 * evenement de vacances — rend `NaN`, que la borne 1..6 ecarte comme elle le faisait deja.
 */
export function assemblerSemaine(evenements: PlanningEvent[], lundi: moment.Moment): PlanningWeekDay[] {
    const semaine: PlanningWeekDay[] = Array.from({ length: 6 }).map((_, index) => ({
        dayNumber: String(index + 1),
        dayTimestamp: lundi.clone().startOf('day').add(index, 'day').unix(),
        courses: [],
    }));

    for (const evenement of evenements) {
        const debut = moment(evenement.date.start ?? null);
        const jourIso = debut.isoWeekday();
        if (jourIso < 1 || jourIso > 6) continue;

        evenement.day = upperCaseFirstLetter(debut.format('dddd L'));
        evenement.dayNumber = String(jourIso);
        semaine[jourIso - 1].courses.push(evenement);
    }

    for (const jour of semaine) {
        jour.courses.sort(trierCours);
    }

    return semaine;
}

/** La plage annuelle de la synchronisation calendrier : la meme decoration, a plat, sans decoupage. */
export function assemblerAnnee(evenements: PlanningEvent[]): PlanningEvent[] {
    for (const evenement of evenements) {
        const debut = moment(evenement.date.start ?? null);
        evenement.day = upperCaseFirstLetter(debut.format('dddd L'));
        evenement.dayNumber = String(debut.isoWeekday());
    }
    return [...evenements].sort(trierCours);
}

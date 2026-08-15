/**
 * Quelle source d'emploi du temps l'etablissement selectionne publie, s'il en publie une.
 *
 * Le jalon 6-E n'avait qu'une reponse possible — Celcat — et le service pouvait donc l'appeler
 * directement. Le jalon 6-I en ajoute une seconde, l'export iCalendar, parce que Celcat ouvert est
 * une **exception francaise** : un balayage de vingt universites n'a trouve qu'une seule instance
 * interrogeable sans authentification, alors que presque toutes offrent un lien d'abonnement.
 *
 * Ce module est le seul endroit qui sait qu'il existe deux sources. Ce n'est pas une branche par
 * etablissement — il n'y a toujours aucun `if (etablissement === …)` nulle part — c'est une lecture
 * de ce que **le catalogue declare** : une racine Celcat, ou un export iCalendar, ou rien. La regle
 * du jalon 6-G tient donc a la lettre : le catalogue dit ce qui existe, le code relu dit quoi faire.
 *
 * L'ordre de preference est ecrit et il compte : **Celcat gagne quand les deux sont declares**. Un
 * etablissement qui aurait les deux a un serveur interrogeable, donc une liste de groupes vivante et
 * une recherche qui trouve ; le referentiel iCalendar, lui, est un releve d'auteur, forcement
 * partiel. Preferer la source qui se corrige toute seule est le bon defaut.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-i-planning-universel.md.
 */

// L'import vise `../aetherius/failures` et non la porte d'entree `../aetherius` : celle-ci
// re-exporte la facade, qui tire React Native. Meme frontiere que shared/supabase/failures.ts.
import { serviceAbsent, type UkitFailure } from '../aetherius/failures';
import { getEtablissementActif, type EdtIcal } from './catalogue';
import { entreesCelcat, type EntreesCelcat } from './celcat';

/** Le groupe interroge : une chaine, ou la liste des favoris pour le planning agrege. */
type CibleGroupe = string | string[];

/**
 * La source a jouer, deja resolue.
 *
 * Une union discriminee plutot que deux accesseurs : le service doit traiter **les deux** cas, et un
 * `if (celcat !== null) … else if (ical !== null) …` laisserait au prochain appelant le soin de se
 * souvenir qu'il en existe deux.
 *
 * **Se teste avec `source.kind === 'ical'`**, jamais par la presence d'un champ : sans
 * `strictNullChecks`, TypeScript ne restreint pas une union autrement (docs/qualite.md).
 */
export type SourceEdt =
    | { readonly kind: 'celcat'; readonly entrees: EntreesCelcat }
    | { readonly kind: 'ical'; readonly config: EdtIcal };

/**
 * La source d'emploi du temps de l'etablissement selectionne, ou `null` s'il n'en publie aucune.
 *
 * Synchrone, comme tout le catalogue : quatre services la lisent avant d'emettre un run, et un
 * `await` de plus sur ce chemin ne servirait personne.
 */
export function sourceEdt(): SourceEdt | null {
    const celcat = entreesCelcat('groupes');
    if (celcat !== null) return { kind: 'celcat', entrees: celcat };

    const edt = getEtablissementActif().edt;
    if (edt !== null) return { kind: 'ical', config: edt };

    return null;
}

/**
 * Les index de ressource d'une cible : ce qui resout, et ce qui manque.
 *
 * La resolution est **partielle**, et la premiere version ne l'etait pas — elle echouait des qu'un
 * seul nom manquait. Le defaut s'est vu sur appareil : avec cinq favoris dont un perime, l'onglet
 * Planning n'affichait plus rien du tout, et rien ne disait lequel des cinq etait en cause. Or un
 * referentiel se perime a chaque rentree, donc ce cas n'est pas theorique.
 *
 * La justification d'origine — « un planning agrege silencieusement incomplet est pire qu'un echec » —
 * avait raison sur un mot et tort sur l'autre : c'est le **silence** qui est le probleme, pas
 * l'incompletude. Le depot avait deja la troisieme reponse, ecrite pour la base de publication : une
 * couverture partielle n'est ni un succes muet ni un echec, elle se **dit** par un bandeau au-dessus
 * de la liste (docs/sources-externes.md).
 */
export function resoudreRessources(
    config: EdtIcal,
    groupe: CibleGroupe,
): { readonly ressources: string; readonly manquants: readonly string[] } {
    const noms = Array.isArray(groupe) ? groupe : [groupe];
    const index: string[] = [];
    const manquants: string[] = [];

    for (const nom of noms) {
        const trouve = config.groupes.find((entree) => entree.nom === nom);
        if (trouve === undefined) manquants.push(String(nom));
        else index.push(trouve.ressource);
    }

    return { ressources: index.join(','), manquants };
}

/** L'etablissement selectionne publie-t-il un emploi du temps ? Ce que les ecrans lisent pour se taire. */
export function planningDisponible(): boolean {
    return sourceEdt() !== null;
}

/**
 * L'echec d'un emploi du temps que l'etablissement ne publie pas.
 *
 * `config` et non `unavailable` : rien n'est en panne, et proposer de reessayer serait faux — la
 * source n'existe pas, elle ne repondra pas mieux dans dix secondes. Le code nomme le cas pour que
 * l'ecran dise « pas encore d'emploi du temps ici » plutot que « service indisponible ».
 */
export function planningAbsent(): UkitFailure {
    return serviceAbsent(
        'ERROR_TIMETABLE_UNAVAILABLE',
        'PLANNING_ABSENT',
        'l etablissement ne publie pas d emploi du temps',
    );
}

/**
 * L'echec d'un groupe que le referentiel de l'etablissement ne connait pas.
 *
 * Distinct de `planningAbsent()` et d'une panne, et c'est le point : un export iCalendar prend des
 * **index de ressource** qu'aucune source ne nomme, et le referentiel qui les nomme est un releve
 * d'auteur. Un groupe favori releve l'an dernier peut donc ne plus resoudre apres une rentree, et
 * rendre une journee vide ferait passer un referentiel perime pour une semaine sans cours.
 */
export function groupeInconnu(nom: string): UkitFailure {
    return serviceAbsent('ERROR_TIMETABLE_GROUP_UNKNOWN', 'GROUPE_INCONNU', `groupe hors referentiel : ${nom}`);
}

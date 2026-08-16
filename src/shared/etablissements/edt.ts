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
import { getEtablissementActif, type EdtAbonnement, type EdtIcal } from './catalogue';
import { entreesCelcat, type EntreesCelcat } from './celcat';
import { lienEdtActif } from './lienEdt';

/** Le groupe interroge : une chaine, ou la liste des favoris pour le planning agrege. */
type CibleGroupe = string | string[];

/**
 * L'etat de l'emploi du temps de l'etablissement selectionne : ce qu'il y a a jouer, ou ce qui manque.
 *
 * Une union discriminee plutot que plusieurs accesseurs : le service doit traiter **tous** les cas, et
 * une cascade de `if (x !== null)` laisserait au prochain appelant le soin de se souvenir combien il
 * y en a. Elle est **totale** depuis le jalon 6-J — elle ne rend plus jamais `null` — et c'est ce qui
 * force chaque consommateur a decider quoi faire de l'absence au lieu de la laisser tomber dans un
 * `else`.
 *
 * Les deux derniers arbres sont la nouveaute du jalon, et leur distinction est tout son objet :
 * `lien-attendu` veut dire *cette universite a un emploi du temps, il te manque un geste*, quand
 * `aucun` veut dire *elle n'en a pas*. Les confondre afficherait une phrase d'excuse la ou il fallait
 * un bouton — deux gestes opposes de la part d'un etudiant.
 *
 * **Se teste avec `source.kind === 'ical'`**, jamais par la presence d'un champ : sans
 * `strictNullChecks`, TypeScript ne restreint pas une union autrement (docs/qualite.md).
 */
export type SourceEdt =
    | { readonly kind: 'celcat'; readonly entrees: EntreesCelcat }
    | { readonly kind: 'ical'; readonly config: EdtIcal }
    | { readonly kind: 'abonnement'; readonly config: EdtAbonnement; readonly lien: string }
    | { readonly kind: 'lien-attendu'; readonly config: EdtAbonnement }
    | { readonly kind: 'aucun' };

/**
 * La source d'emploi du temps de l'etablissement selectionne, ou ce qui l'empeche.
 *
 * Synchrone, comme tout le catalogue : quatre services la lisent avant d'emettre un run, et un
 * `await` de plus sur ce chemin ne servirait personne.
 *
 * **L'ordre de preference va du plus automatique au plus manuel**, et il compte :
 *
 *   1. **Celcat**, quand il est declare : un serveur interrogeable donne une liste de groupes vivante
 *      et une recherche qui trouve, la ou tout le reste est un releve ou un geste ;
 *   2. **le referentiel iCalendar** (jalon 6-I) : l'etudiant choisit encore son groupe dans une liste,
 *      meme si celle-ci a ete relevee a la main ;
 *   3. **l'abonnement colle** : il marche partout, et il coute un geste que personne n'a envie de
 *      faire. C'est pourquoi il vient en dernier — il est celui qui existe toujours, pas le chemin
 *      principal.
 */
export function sourceEdt(): SourceEdt {
    const celcat = entreesCelcat('groupes');
    if (celcat !== null) return { kind: 'celcat', entrees: celcat };

    // `?? null` sur les deux : un cache de catalogue ecrit avant qu'un de ces champs n'existe rend
    // `undefined`, que `!== null` accepte — et l'application croirait alors a un abonnement la ou il
    // n'y en a pas. Meme cause que la region CROUS rendue `None` (catalogue.ts).
    const etablissement = getEtablissementActif();
    const edt = etablissement.edt ?? null;
    if (edt !== null) return { kind: 'ical', config: edt };

    const abonnement = etablissement.edtAbonnement ?? null;
    if (abonnement !== null) {
        const lien = lienEdtActif();
        return lien === null ? { kind: 'lien-attendu', config: abonnement } : { kind: 'abonnement', config: abonnement, lien };
    }

    return { kind: 'aucun' };
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

/**
 * L'etablissement selectionne publie-t-il un emploi du temps ? Ce que les ecrans lisent pour se taire.
 *
 * **`lien-attendu` compte comme disponible**, et c'est volontaire : l'universite en a bien un, et
 * l'accueil doit donc garder son etape pour proposer le collage. Ce qui change entre les deux n'est
 * pas la presence de l'etape mais **son contenu** — une liste de groupes, ou un champ de lien.
 */
export function planningDisponible(): boolean {
    return sourceEdt().kind !== 'aucun';
}

/**
 * L'emploi du temps de cet etablissement passe-t-il par un **choix de groupe** ?
 *
 * Faux pour un abonnement colle, et c'est une difference de nature, pas de degre : le lien **est**
 * l'emploi du temps de cet etudiant-la, nominatif, deja filtre par son universite. Il n'y a pas de
 * groupe a choisir, donc pas de favoris a avoir — et les deux ecrans qui traitent « aucun favori »
 * comme un etat vide a remplir (l'accueil et l'onglet Planning) doivent le savoir, sans quoi ils
 * inviteraient a chercher un groupe dans une liste qui n'existe pas.
 *
 * C'est le meme raisonnement que `sallesDisponibles()` face a `planningDisponible()` : deux questions
 * qui se ressemblent et ne portent pas sur la meme chose.
 */
export function groupesRequis(): boolean {
    const source = sourceEdt();
    return source.kind === 'celcat' || source.kind === 'ical';
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
 * L'echec d'un emploi du temps qui n'attend qu'un lien.
 *
 * Distinct de `planningAbsent()`, et c'est le coeur du jalon : ici **rien ne manque a l'application**,
 * il manque un geste a l'etudiant. Le message porte donc l'invitation, et l'ecran qui l'affiche pose
 * un bouton la ou l'autre cas n'en a aucun. Meme famille `config` — reessayer ne servirait a rien
 * tant que le lien n'est pas colle.
 */
export function lienEdtAttendu(): UkitFailure {
    return serviceAbsent(
        'ERROR_TIMETABLE_LINK_MISSING',
        'EDT_LIEN_ATTENDU',
        'l etablissement publie un abonnement, aucun lien n a ete colle',
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

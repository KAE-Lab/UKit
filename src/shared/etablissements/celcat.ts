/**
 * Ce que le catalogue fournit aux Blueprints d'emploi du temps.
 *
 * Les six fichiers `ukit.celcat.*` portaient l'hote et les codes d'inventaire dans leurs `vars`
 * jusqu'au jalon 6-G. Ils les recoivent desormais en **entrees**, et les valeurs viennent de la ligne
 * de l'etablissement selectionne. C'est la regle du jalon prise a la lettre : *ce qui varie d'un
 * etablissement a l'autre est une donnee, pas une branche* — aucun `if (etablissement === 'bordeaux')`
 * n'apparait dans un service.
 *
 * `null` n'est pas une panne. Le serveur d'emplois du temps de Bordeaux est interrogeable sans
 * authentification, et c'est une exception francaise plus qu'une regle : la plupart des universites
 * mettent le leur derriere un SSO, ou utilisent un autre produit. Un etablissement sans
 * `celcat_domaine` **ne publie pas** son emploi du temps ici, et l'application doit le dire au lieu
 * d'echouer — les deux appellent des ecrans opposes.
 *
 * Ce module ne touche a rien : il projette une ligne de catalogue. Il vit a cote du catalogue plutot
 * que dans un service parce que **deux** domaines le lisent, Planning et Campus, et qu'il ne doit pas
 * en exister deux versions.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-g-etablissements.md.
 */

// L'import vise `../aetherius/failures` et non la porte d'entree `../aetherius` : celle-ci
// re-exporte la facade, qui tire React Native. Meme frontiere que shared/supabase/failures.ts.
import { serviceAbsent, type UkitFailure } from '../aetherius/failures';
import { getEtablissementActif } from './catalogue';

/** Les entrees communes aux six Blueprints Celcat, prêtes a etre passees a `runBlueprint`. */
export interface EntreesCelcat {
    readonly domaine: string;
    readonly res_type: string;
}

/**
 * Les entrees pour un role d'inventaire, ou `null` si l'etablissement ne publie pas d'emploi du temps.
 *
 * Le role decide du code : les groupes d'etudiants et les salles sont deux inventaires distincts du
 * meme serveur, et c'est la seule chose qui distingue les deux familles de Blueprints.
 */
export function entreesCelcat(role: 'groupes' | 'salles'): EntreesCelcat | null {
    const etablissement = getEtablissementActif();
    if (etablissement.celcatDomaine === null) return null;

    return {
        domaine: etablissement.celcatDomaine,
        res_type: etablissement.celcatResTypes[role],
    };
}

/** L'etablissement selectionne publie-t-il un emploi du temps ? Ce que les ecrans lisent pour se taire. */
export function planningDisponible(): boolean {
    return getEtablissementActif().celcatDomaine !== null;
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

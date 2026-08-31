/**
 * Ce que le catalogue fournit aux Blueprints Celcat.
 *
 * Les six fichiers `ukit.celcat.*` portaient l'hote et les codes d'inventaire dans leurs `vars`
 * jusqu'au jalon 6-G. Ils les recoivent desormais en **entrees**, et les valeurs viennent de la ligne
 * de l'etablissement selectionne. C'est la regle du jalon prise a la lettre : *ce qui varie d'un
 * etablissement a l'autre est une donnee, pas une branche* — aucun `if (etablissement === 'bordeaux')`
 * n'apparait dans un service.
 *
 * `null` n'est pas une panne. Le serveur d'emplois du temps de Bordeaux est interrogeable sans
 * authentification, et c'est une exception francaise plus qu'une regle : la plupart des universites
 * mettent le leur derriere un SSO, ou utilisent un autre produit. Depuis le jalon 6-I, un
 * etablissement sans `celcat_domaine` peut malgre tout avoir un emploi du temps — par son export
 * iCalendar — et c'est `edt.ts` qui arbitre entre les deux sources.
 *
 * **Ce module ne parle donc plus que de Celcat**, et c'est le decoupage que le jalon 6-I a impose :
 * les salles libres du Campus se reconstruisent depuis l'inventaire du *meme serveur* Celcat, elles
 * ne survivent pas a un etablissement qui n'en a pas — meme si celui-ci publie un emploi du temps
 * ailleurs. Melanger les deux questions dans un seul predicat ferait reapparaitre pour Bordeaux INP
 * une section definitivement cassee, c'est-a-dire exactement le defaut que la campagne 6-G avait
 * corrige.
 *
 * Voir docs/features/planning.md, docs/phase-6/6-g-etablissements.md et 6-i-planning-universel.md.
 */

import { getEtablissementActif } from './catalogue';

/** Les entrees communes aux six Blueprints Celcat, prêtes a etre passees a `runBlueprint`. */
export interface EntreesCelcat {
    readonly domaine: string;
    readonly res_type: string;
}

/**
 * Les entrees pour un role d'inventaire, ou `null` si l'etablissement n'a pas de serveur Celcat.
 *
 * Le role decide du code : les groupes d'etudiants et les salles sont deux inventaires distincts du
 * meme serveur, et c'est la seule chose qui distingue les deux familles de Blueprints.
 */
export function entreesCelcat(role: 'groupes' | 'salles'): EntreesCelcat | null {
    const etablissement = getEtablissementActif();

    // Un etablissement peut **emprunter** l'inventaire de salles d'un autre serveur, et c'est une
    // decision produit prise sur appareil le 2026-08-15 : les etudiants de Bordeaux INP sont sur le
    // campus de Talence, celui-la meme dont la recherche de salles libres liste les batiments. Leur
    // refuser la fonctionnalite parce que leur emploi du temps vient d'ailleurs les priverait d'un
    // service qui leur sert reellement. L'emprunt ne concerne **que** les salles : l'emploi du temps
    // continue de venir de leur propre source (voir edt.ts).
    // `?? null` : un cache de catalogue anterieur au jalon qui a ajoute ce champ rend `undefined`, que
    // `!== null` accepte — le run partirait alors avec un domaine `undefined`. Le meme defaut a ete
    // mesure sur la region CROUS au jalon 6-J (catalogue.ts) ; la version de la cle de cache est la
    // premiere ceinture, celle-ci la seconde.
    const empruntees = etablissement.sallesLibres ?? null;
    if (role === 'salles' && empruntees !== null) {
        return empruntees;
    }

    if ((etablissement.celcatDomaine ?? null) === null) return null;

    return {
        domaine: etablissement.celcatDomaine,
        res_type: etablissement.celcatResTypes[role],
    };
}

/**
 * L'etablissement selectionne donne-t-il acces a une recherche de salles libres ?
 *
 * Ce que le Campus lit pour masquer la section. Elle reste **distincte** de `planningDisponible()`,
 * et il ne faut pas les refondre : elles ne dependent pas de la meme chose. Un etablissement peut
 * avoir un emploi du temps sans inventaire de salles — c'est le cas d'un export iCalendar — et,
 * depuis ce jalon, en emprunter un sans avoir d'emploi du temps Celcat. Les confondre a deja produit
 * un defaut au jalon 6-G, et en aurait produit un autre ici.
 */
export function sallesDisponibles(): boolean {
    return entreesCelcat('salles') !== null;
}

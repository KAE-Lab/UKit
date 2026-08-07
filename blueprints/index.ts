/**
 * Le socle embarque : ce que l'application sait jouer sans avoir jamais contacte le reseau.
 *
 * Le registre resout chaque Blueprint entre cette table et la surcouche publiee sur Supabase. Le
 * socle n'est jamais optionnel : une application doit fonctionner au premier lancement, hors ligne,
 * et un manifeste distant ne fait que le mettre a jour.
 *
 * La `version` decide de tout : le distant ne gagne que s'il est **strictement** superieur. Elle
 * s'incremente donc ici a chaque fois qu'un fichier change, sans quoi la correction embarquee et la
 * correction publiee ne pourraient plus etre departagees.
 *
 * Voir docs/blueprints.md et docs/phase-6/6-c-livraison.md.
 */

import campusAffluence from './ukit-campus-affluence.blueprint.json';
import campusAnnonces from './ukit-campus-annonces.blueprint.json';
import campusRestaurants from './ukit-campus-restaurants.blueprint.json';
import celcatSemaine from './ukit-celcat-semaine.blueprint.json';
import scolariteMessagerie from './ukit-scolarite-messagerie.blueprint.json';
import scolariteSso from './ukit-scolarite-sso.blueprint.json';

/**
 * Une entree du socle.
 *
 * Le type sera celui du paquet (`BundledBlueprint`) des le jalon 6-A ; il est decrit ici pour que le
 * squelette compile avant que la dependance ne soit installee, et parce qu'il n'a que deux champs.
 */
export interface BundledBlueprint {
    /** Chaine numerique pointee, ordonnee : "1", "1.4", "2". Pas de SemVer, volontairement. */
    readonly version: string;
    /** Le document, tel qu'importe. Il est valide par le moteur avant d'etre joue. */
    readonly document: unknown;
}

/** Les noms, en un seul endroit : c'est par eux qu'un service demande un Blueprint au registre. */
export const BLUEPRINT = {
    CAMPUS_ANNONCES: 'ukit.campus.annonces',
    CAMPUS_RESTAURANTS: 'ukit.campus.restaurants',
    CAMPUS_AFFLUENCE: 'ukit.campus.affluence',
    CELCAT_SEMAINE: 'ukit.celcat.semaine',
    SCOLARITE_SSO: 'ukit.scolarite.sso',
    SCOLARITE_MESSAGERIE: 'ukit.scolarite.messagerie',
} as const;

export type BlueprintName = (typeof BLUEPRINT)[keyof typeof BLUEPRINT];

/**
 * La table livree avec le binaire.
 *
 * Les six fichiers sont ceux du jalon 3-G d'Aetherius, repris tels quels parce qu'ils ont ete joues
 * contre les vraies sources et verifies sur un telephone. Chaque jalon de migration les decoupe
 * selon les appels que l'application joue reellement — voir blueprints/README.md.
 */
export const BUNDLED: Readonly<Record<BlueprintName, BundledBlueprint>> = {
    [BLUEPRINT.CAMPUS_ANNONCES]: { version: '1', document: campusAnnonces },
    [BLUEPRINT.CAMPUS_RESTAURANTS]: { version: '1', document: campusRestaurants },
    [BLUEPRINT.CAMPUS_AFFLUENCE]: { version: '1', document: campusAffluence },
    [BLUEPRINT.CELCAT_SEMAINE]: { version: '1', document: celcatSemaine },
    [BLUEPRINT.SCOLARITE_SSO]: { version: '1', document: scolariteSso },
    [BLUEPRINT.SCOLARITE_MESSAGERIE]: { version: '1', document: scolariteMessagerie },
};

/**
 * Le prefixe sous lequel un manifeste distant a le droit d'**ajouter** un Blueprint absent du
 * binaire — la seule garde levee, en opt-in, pour rendre le multi-etablissement possible.
 *
 * Il reste volontairement etroit : ouvrir `ukit.` rendrait toutes les sources de l'application
 * remplacables a distance, ce qui est precisement ce que la garde d'origine evite.
 * Voir docs/phase-6/6-g-etablissements.md.
 */
export const REMOTE_NAME_PREFIX = 'ukit.portail.';

/**
 * Les secrets que l'application sait fournir, et donc les seuls qu'un Blueprint — embarque ou
 * publie — a le droit de declarer. Sans cette borne, un fichier distant compromis pourrait reclamer
 * le trousseau et l'exfiltrer par une simple requete.
 */
export const ALLOWED_SECRETS = ['bordeaux_user', 'bordeaux_pass'] as const;

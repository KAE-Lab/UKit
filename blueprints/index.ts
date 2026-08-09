/**
 * Le socle embarque : ce que l'application sait jouer sans avoir jamais contacte le reseau.
 *
 * Le registre resout chaque Blueprint entre cette table et la surcouche publiee sur Supabase. Le
 * socle n'est jamais optionnel : une application doit fonctionner au premier lancement, hors ligne,
 * et un manifeste distant ne fait que le mettre a jour.
 *
 * La `version` decide de tout : le distant ne gagne que s'il est **strictement** superieur. Elle
 * s'incremente donc dans `versions.json` a chaque fois qu'un fichier change, sans quoi la correction
 * embarquee et la correction publiee ne pourraient plus etre departagees.
 *
 * Voir docs/blueprints.md et docs/phase-6/6-c-livraison.md.
 */

import type { BundledBlueprint } from '@aetherius/react-native';

import campusAnnonces from './ukit-campus-annonces.blueprint.json';
import campusBibliothequeAffluence from './ukit-campus-bibliotheque-affluence.blueprint.json';
import campusBibliothequeHoraires from './ukit-campus-bibliotheque-horaires.blueprint.json';
import campusBibliotheques from './ukit-campus-bibliotheques.blueprint.json';
import campusRestaurantMenu from './ukit-campus-restaurant-menu.blueprint.json';
import campusRestaurants from './ukit-campus-restaurants.blueprint.json';
import celcatAnnee from './ukit-celcat-annee.blueprint.json';
import celcatGroupes from './ukit-celcat-groupes.blueprint.json';
import celcatJour from './ukit-celcat-jour.blueprint.json';
import celcatOccupation from './ukit-celcat-occupation.blueprint.json';
import celcatSalles from './ukit-celcat-salles.blueprint.json';
import celcatSemaine from './ukit-celcat-semaine.blueprint.json';
import scolariteDossier from './ukit-scolarite-dossier.blueprint.json';
import scolariteMessagerie from './ukit-scolarite-messagerie.blueprint.json';
import versions from './versions.json';

/**
 * Une entree du socle : `{ version, document }`.
 *
 * Le type vient du paquet, et l'import est volontairement `import type` — il disparait a la
 * compilation, donc ce fichier reste lisible par Node sans tirer React Native (le harnais de parite
 * en depend).
 */
export type { BundledBlueprint };

/** Les noms, en un seul endroit : c'est par eux qu'un service demande un Blueprint au registre. */
export const BLUEPRINT = {
    CAMPUS_ANNONCES: 'ukit.campus.annonces',
    CAMPUS_RESTAURANTS: 'ukit.campus.restaurants',
    CAMPUS_RESTAURANT_MENU: 'ukit.campus.restaurant-menu',
    CAMPUS_BIBLIOTHEQUES: 'ukit.campus.bibliotheques',
    CAMPUS_BIBLIOTHEQUE_AFFLUENCE: 'ukit.campus.bibliotheque-affluence',
    CAMPUS_BIBLIOTHEQUE_HORAIRES: 'ukit.campus.bibliotheque-horaires',
    CELCAT_GROUPES: 'ukit.celcat.groupes',
    CELCAT_SALLES: 'ukit.celcat.salles',
    CELCAT_JOUR: 'ukit.celcat.jour',
    CELCAT_SEMAINE: 'ukit.celcat.semaine',
    CELCAT_ANNEE: 'ukit.celcat.annee',
    CELCAT_OCCUPATION: 'ukit.celcat.occupation',
    SCOLARITE_DOSSIER: 'ukit.scolarite.dossier',
    SCOLARITE_MESSAGERIE: 'ukit.scolarite.messagerie',
} as const;

export type BlueprintName = (typeof BLUEPRINT)[keyof typeof BLUEPRINT];

/**
 * La table livree avec le binaire.
 *
 * Les fichiers viennent du jalon 3-G d'Aetherius, joues contre les vraies sources et verifies sur un
 * telephone. Chaque jalon de migration les decoupe selon les appels que l'application joue
 * reellement, et corrige ce que le branchement revele — voir blueprints/README.md. Le jalon 6-D a
 * ainsi remplace le fichier de reference `ukit.campus.affluence`, qui tenait la carte **et**
 * l'affluence, par les deux Blueprints que deux ecrans demandent a deux moments. Le jalon 6-E a fait
 * de meme avec `ukit.celcat.semaine`, qui portait la liste des groupes en plus de la semaine : il est
 * desormais reduit a son seul appel, et cinq freres portent les cinq autres. Le jalon 6-F a renomme
 * `ukit.scolarite.sso` en `ukit.scolarite.dossier` — `sso` nommait un mecanisme, `dossier` nomme
 * l'appel — et les deux fichiers de scolarite ont gagne la garde qui distingue un mot de passe
 * refuse d'une page qui n'arrive pas.
 *
 * Les versions vivent dans `versions.json` et non ici : le script de publication est un module Node
 * qui ne sait pas lire un fichier TypeScript, et une version que le publieur recopierait a la main
 * serait fausse un jour sur deux. Un manque dans ce fichier est une erreur de compilation, pas une
 * surprise a l'execution.
 */
export const BUNDLED: Readonly<Record<BlueprintName, BundledBlueprint>> = {
    [BLUEPRINT.CAMPUS_ANNONCES]: {
        version: versions[BLUEPRINT.CAMPUS_ANNONCES].version,
        document: campusAnnonces,
    },
    [BLUEPRINT.CAMPUS_RESTAURANTS]: {
        version: versions[BLUEPRINT.CAMPUS_RESTAURANTS].version,
        document: campusRestaurants,
    },
    [BLUEPRINT.CAMPUS_RESTAURANT_MENU]: {
        version: versions[BLUEPRINT.CAMPUS_RESTAURANT_MENU].version,
        document: campusRestaurantMenu,
    },
    [BLUEPRINT.CAMPUS_BIBLIOTHEQUES]: {
        version: versions[BLUEPRINT.CAMPUS_BIBLIOTHEQUES].version,
        document: campusBibliotheques,
    },
    [BLUEPRINT.CAMPUS_BIBLIOTHEQUE_AFFLUENCE]: {
        version: versions[BLUEPRINT.CAMPUS_BIBLIOTHEQUE_AFFLUENCE].version,
        document: campusBibliothequeAffluence,
    },
    [BLUEPRINT.CAMPUS_BIBLIOTHEQUE_HORAIRES]: {
        version: versions[BLUEPRINT.CAMPUS_BIBLIOTHEQUE_HORAIRES].version,
        document: campusBibliothequeHoraires,
    },
    [BLUEPRINT.CELCAT_GROUPES]: {
        version: versions[BLUEPRINT.CELCAT_GROUPES].version,
        document: celcatGroupes,
    },
    [BLUEPRINT.CELCAT_SALLES]: {
        version: versions[BLUEPRINT.CELCAT_SALLES].version,
        document: celcatSalles,
    },
    [BLUEPRINT.CELCAT_JOUR]: {
        version: versions[BLUEPRINT.CELCAT_JOUR].version,
        document: celcatJour,
    },
    [BLUEPRINT.CELCAT_SEMAINE]: {
        version: versions[BLUEPRINT.CELCAT_SEMAINE].version,
        document: celcatSemaine,
    },
    [BLUEPRINT.CELCAT_ANNEE]: {
        version: versions[BLUEPRINT.CELCAT_ANNEE].version,
        document: celcatAnnee,
    },
    [BLUEPRINT.CELCAT_OCCUPATION]: {
        version: versions[BLUEPRINT.CELCAT_OCCUPATION].version,
        document: celcatOccupation,
    },
    [BLUEPRINT.SCOLARITE_DOSSIER]: {
        version: versions[BLUEPRINT.SCOLARITE_DOSSIER].version,
        document: scolariteDossier,
    },
    [BLUEPRINT.SCOLARITE_MESSAGERIE]: {
        version: versions[BLUEPRINT.SCOLARITE_MESSAGERIE].version,
        document: scolariteMessagerie,
    },
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

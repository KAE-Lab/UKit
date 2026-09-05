/**
 * Le socle embarque : les etablissements que l'application connait sans avoir jamais joint la base.
 *
 * **Une copie de `supabase/etablissements.sql` a la date de la release**, ligne pour ligne, et un test
 * le garantit (`socle.test.ts`) : chaque entree ci-dessous doit etre exactement ce que
 * `projeterEtablissement` rend de la ligne publiee. Le socle portait un seul etablissement jusqu'a la
 * 6.1 — « un second etablissement arrive par publication, l'inscrire ici detruirait la preuve » —
 * et la preuve a ete faite : Bordeaux INP est arrive sans release. Mais une installation neuve ne
 * voyait que le College ST tant que le premier rafraichissement n'avait pas repondu, et le premier
 * jour de la rentree, c'est ce qu'un ami a vu (docs/phase-6/6-1-a-robustesse-scolarite.md).
 *
 * La regle du depot tient toujours : **le binaire n'embarque un etablissement que s'il embarque de
 * quoi le jouer** — les Blueprints de portail des lignes ci-dessous sont dans `blueprints/index.ts`,
 * et un test de livraison l'exige.
 *
 * Ce fichier est de la **donnee**, pas de la logique : les projections et les accesseurs vivent dans
 * `catalogue.ts`, qui n'est importe ici que pour ses types (aucun cycle a l'execution).
 *
 * Publier une ligne continue de **remplacer** le socle entierement (regle du jalon 6-G) : le socle se
 * perime a chaque publication d'etablissement, et se remet a jour a la release suivante.
 */

import type { CelcatResTypes, Etablissement, FormatSalles, PointBalayage } from './catalogue';

/** Le code de l'etablissement historique : celui qu'une installation existante est reputee avoir. */
export const ETABLISSEMENT_DEFAUT = 'bordeaux';

/**
 * Les deux points de balayage des bibliotheques du secteur bordelais.
 *
 * **Onze jusqu'en 6.1-C**, couvrant la Nouvelle-Aquitaine. La mesure du 2026-08-08 avait dit ce
 * qu'ils valaient : Bordeaux Centre et Talence/Pessac voient les **memes** 8 sites ; cinq points —
 * Poitiers, Perigueux, Agen, Angouleme, Niort — n'en rendaient aucun ; Pau, La Rochelle, Limoges et
 * Bayonne portaient six sites que personne d'autre ne voyait. Douze requetes par ouverture pour
 * quatorze bibliotheques, dont huit bordelaises.
 *
 * Decision du 2026-09-03, sur ces mesures : UKit vise le secteur bordelais, pas la region (README).
 * Deux points suffisent a ses huit BU, et la **position de l'etudiant** reste toujours le premier
 * point du balayage (`LibraryService`) : un etudiant a Pau garde les siennes. Une ville qui
 * manquerait se rajoute ici et en base — c'est de la donnee de catalogue, corrigeable sans release,
 * depuis le jalon 6-G.
 */
export const POINTS_BORDEAUX: readonly PointBalayage[] = [
    { lat: 44.8377, lng: -0.5791 }, // Bordeaux Centre (Victoire, Bastide, Chartrons)
    { lat: 44.7963, lng: -0.6277 }, // Campus Talence / Pessac / Gradignan
];

/** Les valeurs par defaut d'un champ que la ligne ne porte pas. Un seul endroit, pour un seul sens. */
export const RES_TYPES_PAR_DEFAUT: CelcatResTypes = { groupes: '103', salles: '102' };

/**
 * La region Croustillant du secteur bordelais, telle qu'elle vivait dans les `vars` du Blueprint.
 *
 * Elle est ici pour que le socle embarque reste **exactement** ce qu'il etait : une installation qui
 * n'a jamais joint la base doit continuer d'afficher les restaurants de Bordeaux. La colonne, elle,
 * permet de la corriger — et de la retirer pour un etablissement qui n'en a pas.
 */
export const REGION_CROUS_BORDEAUX = '1';

/**
 * Le format de salle par defaut : celui de Celcat, tel qu'il vivait en dur dans `AppCore` avant le
 * jalon 6-I.
 *
 * Une ligne sans colonne `salles` garde donc **exactement** le comportement d'avant, y compris sur
 * une base qui n'aurait pas encore recu la colonne. C'est la meme regle que `RES_TYPES_PAR_DEFAUT` :
 * un defaut n'est pas une commodite, c'est ce qui rend la migration invisible.
 */
export const SALLES_PAR_DEFAUT: FormatSalles = { separateurs: [' | ', '/'], motif: '([A-Z][0-9]+)', depuis: 2 };

/**
 * Les trois lignes publiees a la date de la release, dans l'ordre de la liste.
 *
 * Chaque commentaire de valeur vit dans `supabase/etablissements.sql`, qui reste la reference : ici
 * on ne raconte pas deux fois, on recopie.
 */
export const SOCLE: Readonly<Record<string, Etablissement>> = {
    [ETABLISSEMENT_DEFAUT]: {
        code: ETABLISSEMENT_DEFAUT,
        // Le NOM change, le CODE non — et la distinction n'est pas cosmetique : le code partitionne
        // le trousseau, les reglages et les favoris (comptes.ts, reglagesParEtablissement.ts). Le
        // renommer deconnecterait tout le parc installe et lui ferait perdre ses groupes.
        //
        // « Universite de Bordeaux » etait trop large : le perimetre reellement porte est celui du
        // college Sciences et Technologies — c'est son Celcat qu'on interroge, ses batiments qu'on
        // reference, ses groupes qu'on propose. Annoncer l'universite entiere promettait des
        // formations que l'application ne sert pas.
        nom: 'Collège Sciences et Technologies',
        nomCourt: 'Collège ST',
        // La commune du campus, pas la metropole : le college ST est a Talence — « Bordeaux » sous
        // le nom d'une fac bordelaise ne disait rien a personne.
        ville: 'Talence',
        // Dans le socle, et pas seulement dans la ligne publiee : la surcouche s'applique en
        // **asynchrone** au lancement, si bien qu'un ecran monte avant elle gardait le repli — le
        // formulaire de connexion s'ouvrait sans logo, puis en avait un si on y revenait plus tard.
        // Le binaire porte donc l'adresse, et la base la met a jour comme le reste.
        logo: 'https://owiksddeqcyyifnmpyqm.supabase.co/storage/v1/object/public/media/etablissements/bordeaux.webp',
        portailDossier: 'ukit.portail.bordeaux.dossier',
        portailMessagerie: 'ukit.portail.bordeaux.messagerie',
        // ReNARD, le service de documents etudiants. Embarque comme les autres Blueprints de
        // Bordeaux : le binaire n'embarque un etablissement que s'il embarque aussi de quoi le jouer.
        portailDocuments: 'ukit.portail.bordeaux.documents',
        // Deux widgets remplis, deux en attente de source. `notes` et `examens` ne figurent pas ici
        // et ce n'est pas un oubli : leurs donnees n'existent pas encore — les resultats tombent en
        // bloc en fin de semestre, et il n'y a pas de calendrier d'epreuves avant la rentree. Leurs
        // rangees s'affichent quand meme et ouvrent leur porte ; le jour ou la source existe, la
        // ligne s'ajoute **par publication**, sans release.
        portailWidgets: {
            messagerie: { blueprint: 'ukit.portail.bordeaux.messagerie', peremptionMin: null },
            moodle: { blueprint: 'ukit.portail.bordeaux.moodle', peremptionMin: null },
        },
        celcatDomaine: 'https://celcat.u-bordeaux.fr/calendar',
        celcatResTypes: { groupes: '103', salles: '102' },
        edt: null,
        // Bordeaux publie son Celcat : personne n'a de lien a coller, et proposer un champ de saisie
        // la ou une recherche de groupes fonctionne serait proposer un travail inutile.
        edtAbonnement: null,
        salles: SALLES_PAR_DEFAUT,
        sallesLibres: null,
        bibliothequesPoints: POINTS_BORDEAUX,
        crousRegion: REGION_CROUS_BORDEAUX,
        services: {
            // `ent.u-bordeaux.fr` **ne resout plus** — mesure le 2026-08-25, et le symptome etait un
            // `NSURLErrorDomain -1003` a chaque ouverture de la porte ENT, y compris en production.
            // Le portail vit sur `intranet`, qui rebondit sur le CAS avec son parametre `service`.
            // Le Blueprint du dossier visait deja cet hote pour l'annuaire ; l'ecran, lui, etait
            // reste sur l'ancien nom.
            ent: 'https://intranet.u-bordeaux.fr',
            email: 'https://webmel.u-bordeaux.fr',
            cas: 'https://cas.u-bordeaux.fr',
            apogee: 'https://apogee.u-bordeaux.fr',
            // Le SSO initie par l'IdP, SANS page de choix d'etablissement : la cascade WAYF de
            // `/login/index.php` a tue la WebView d'un Android le soir de la sortie de la 6.0, et la
            // racine de ce Moodle est une page d'accueil publique ou l'on arrive deconnecte. Le
            // `target` sur /auth/shibboleth/index.php cree la session Moodle. Publie a chaud le
            // 2026-08-31 ; le socle recopie la ligne publiee (supabase/etablissements.sql).
            moodle: 'https://idp-ubx.u-bordeaux.fr/idp/profile/SAML2/Unsolicited/SSO?providerId=https%3A%2F%2Fmoodle.u-bordeaux.fr%2Fauth%2Fshibboleth&target=https%3A%2F%2Fmoodle.u-bordeaux.fr%2Fauth%2Fshibboleth%2Findex.php',
            // Les deux services d'Apogee que l'intranet nomme, releves le 2026-08-28 : la racine nue
            // obligeait a chercher dans un portail, ces adresses ouvrent directement la vue.
            notes: 'https://apogee.u-bordeaux.fr/index.php?srv=RE01',
            examens: 'https://apogee.u-bordeaux.fr/index.php?srv=RE02',
            // Pas une porte de service : l'adresse du formulaire de demande. Elle sert d'action a un
            // etat vide — un widget que l'etablissement ne porte pas propose de le demander, plutot
            // que d'afficher une rangee muette.
            adaptation: 'https://forms.gle/c8vpwBu1QpowkAKC8',
            // L'identite Shibboleth de l'etablissement. Ce n'est **pas une porte** : rien ne s'ouvre
            // a cette adresse. C'est ce que la page de choix d'etablissement de Moodle attend qu'on
            // lui designe, dans une liste de 56 — voir `getPortalInjectedScript`.
            idp_shibboleth: 'https://idp-ubx.u-bordeaux.fr/idp/shibboleth',
        },
        libelles: {},
        ordre: 0,
    },
    'bordeaux-inp': {
        code: 'bordeaux-inp',
        nom: 'Bordeaux INP',
        nomCourt: null,
        ville: 'Talence',
        logo: 'https://owiksddeqcyyifnmpyqm.supabase.co/storage/v1/object/public/media/etablissements/bordeaux-inp.webp',
        portailDossier: 'ukit.portail.bordeaux-inp.dossier',
        portailMessagerie: 'ukit.portail.bordeaux-inp.messagerie',
        portailDocuments: 'ukit.portail.bordeaux-inp.documents',
        portailWidgets: {
            messagerie: { blueprint: 'ukit.portail.bordeaux-inp.messagerie', peremptionMin: null },
        },
        // L'INP est sur ADE, pas sur Celcat : l'emploi du temps arrive par `edt`, la recherche de
        // salles libres emprunte le serveur de l'Universite de Bordeaux (`sallesLibres`).
        celcatDomaine: null,
        celcatResTypes: RES_TYPES_PAR_DEFAUT,
        edt: {
            blueprint: 'ukit.portail.bordeaux-inp.edt',
            blueprintAnnee: 'ukit.portail.bordeaux-inp.edt.annee',
            params: { projet: '1' },
            groupes: [
                { nom: 'ENSC 1A', ressource: '2' },
                { nom: 'ENSC 2A', ressource: '3' },
                { nom: 'ENSC 2A GR1', ressource: '7' },
                { nom: 'ENSC 3A', ressource: '4' },
                { nom: 'ENSEGID 2A', ressource: '140' },
                { nom: 'ENSEGID 3A', ressource: '183' },
                { nom: 'ENSTBB', ressource: '112' },
                { nom: 'ENSEIRB E2', ressource: '200' },
                { nom: 'ENSEIRB S2', ressource: '36' },
                { nom: 'ENSEIRB T2', ressource: '61' },
                { nom: 'ENSEIRB TSI', ressource: '201' },
                { nom: 'ENSEIRB R3', ressource: '123' },
                { nom: 'ENSEIRB SRT', ressource: '38' },
            ],
        },
        edtAbonnement: null,
        salles: { separateurs: [','], motif: '^([A-Z]{2})-', depuis: 0 },
        sallesLibres: { domaine: 'https://celcat.u-bordeaux.fr/calendar', res_type: '102' },
        bibliothequesPoints: POINTS_BORDEAUX,
        crousRegion: REGION_CROUS_BORDEAUX,
        services: {
            ent: 'https://ent.bordeaux-inp.fr',
            email: 'https://partage.bordeaux-inp.fr/mail',
            cas: 'https://cas.bordeaux-inp.fr',
            moodle: 'https://moodle.bordeaux-inp.fr',
            adaptation: 'https://forms.gle/c8vpwBu1QpowkAKC8',
            idp_shibboleth: 'https://sso.bordeaux-inp.fr/idp/shibboleth',
        },
        libelles: { moodle: 'Moodle Bordeaux INP' },
        ordre: 1,
    },
    // « Mon universite n'est pas dans la liste » : l'absence d'universite portee, rendue utilisable
    // par un lien d'abonnement colle a la main (jalon 6-J). Les colonnes de campus sont celles du
    // secteur bordelais, qui est le perimetre du produit.
    autre: {
        code: 'autre',
        nom: 'Autre campus',
        nomCourt: 'Autre campus',
        ville: null,
        logo: null,
        portailDossier: null,
        portailMessagerie: null,
        portailDocuments: null,
        portailWidgets: {},
        celcatDomaine: null,
        celcatResTypes: RES_TYPES_PAR_DEFAUT,
        edt: null,
        edtAbonnement: {
            aide: "l'espace emploi du temps de ton ENT, rubrique « exporter » ou « s'abonner »",
        },
        // Pas de referentiel de lieux : le motif bordelais capturerait un code qui existe chez nous
        // et poserait un marqueur a Talence pour une salle qui n'y est pas.
        salles: null,
        sallesLibres: { domaine: 'https://celcat.u-bordeaux.fr/calendar', res_type: '102' },
        bibliothequesPoints: POINTS_BORDEAUX,
        crousRegion: REGION_CROUS_BORDEAUX,
        services: {
            adaptation: 'https://forms.gle/c8vpwBu1QpowkAKC8',
        },
        libelles: {},
        ordre: 99,
    },
};

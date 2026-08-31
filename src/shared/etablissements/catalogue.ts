/**
 * Le catalogue des etablissements : le socle embarque, et la surcouche publiee par-dessus.
 *
 * Meme modele que le referentiel des lieux et que la livraison des Blueprints, pour la meme raison :
 * **le binaire porte un socle, la base ne fait que le mettre a jour**. Au premier lancement, hors
 * ligne, l'etablissement historique doit rester selectionnable — un ecran de choix vide serait une
 * application inutilisable, pas une application degradee.
 *
 * Ce fichier ne touche **ni** au reseau, **ni** au stockage : il tient une table en memoire, sait la
 * fusionner, et connait l'etablissement actif. La couture de plateforme vit dans `index.ts`, comme
 * `delivery.ts` face a `registry.ts` dans shared/aetherius (docs/qualite.md).
 *
 * Les accesseurs sont **synchrones** : quatre services les lisent avant d'emettre un run, et un
 * `await` de plus sur ce chemin ne servirait personne.
 *
 * Voir docs/features/settings.md et docs/phase-6/6-g-etablissements.md.
 */

import type { EtablissementRow } from '../supabase/types';

/** Un serveur d'inventaire de salles : la racine Celcat, et le code d'inventaire des salles. */
export interface EntreesSalles {
    readonly domaine: string;
    readonly res_type: string;
}

/** Un point de balayage des bibliotheques. Une decision produit, pas une propriete de la source. */
export interface PointBalayage {
    readonly lat: number;
    readonly lng: number;
}

/**
 * Les roles d'inventaire Celcat, projetes sur les codes de la source.
 *
 * `103` = groupes d'etudiants, `102` = salles. Ce sont des conventions du produit, pas un contrat :
 * une autre instance peut parfaitement les numeroter autrement, et c'est pourquoi ils sont une
 * donnee de catalogue plutot qu'une constante de Blueprint.
 */
export interface CelcatResTypes {
    readonly groupes: string;
    readonly salles: string;
}

/** Un groupe d'etudiants du referentiel iCalendar : le nom affiche, et l'index a demander. */
export interface GroupeEdt {
    readonly nom: string;
    readonly ressource: string;
}

/**
 * L'emploi du temps par export iCalendar (jalon 6-I).
 *
 * Le catalogue dit **ce qui existe** — quels Blueprints jouer, avec quels parametres d'annee, et
 * quels groupes proposer — et rien de plus : le *quoi faire* reste dans le Blueprint. C'est la ligne
 * que le jalon 6-G a tracee et qu'une colonne « comment obtenir l'emploi du temps » frolerait.
 *
 * `params` porte les entrees propres a l'etablissement et a l'annee. Chez ADE c'est `projet`, qui
 * designe un projet ADE et **change a chaque rentree** : le loger ici plutot que dans les `vars` du
 * fichier fait qu'une rentree est **une** publication — la meme que celle du referentiel — au lieu
 * de deux.
 *
 * `groupes` est le referentiel releve par `tools/releve-ade.mjs`. Il existe parce qu'ADE n'expose
 * aucun arbre de ressources anonyme : l'export prend des index positionnels, et rien dans la source
 * ne dit lequel est quel groupe.
 */
export interface EdtIcal {
    /** Le Blueprint du jour et de la semaine, sous `ukit.portail.`. */
    readonly blueprint: string;
    /** Celui de la plage annuelle, qui ne differe que par son plafond de delai. */
    readonly blueprintAnnee: string;
    /** Les entrees propres a l'etablissement et a l'annee, etalees dans les entrees du run. */
    readonly params: Readonly<Record<string, string>>;
    readonly groupes: readonly GroupeEdt[];
}

/**
 * L'emploi du temps par **abonnement colle a la main** (jalon 6-J).
 *
 * Le repli universel de la phase : la ou 6-I demandait un referentiel releve par un auteur, celui-ci
 * ne demande rien du tout — l'etudiant colle le lien que son etablissement lui donne, et l'application
 * le joue. C'est le seul chemin qui ajoute un emploi du temps **sans qu'on ait rien a porter**, et
 * c'est pourquoi il existe : porter chaque produit de planning un par un serait sans fin.
 *
 * Le catalogue dit seulement **que cet etablissement publie un abonnement**, jamais comment le jouer :
 * le Blueprint est unique, embarque, et le meme pour tous (`BLUEPRINT.EDT_ABONNEMENT`). C'est la ligne
 * du jalon 6-G prise a la lettre, et c'est aussi ce qui rend le repli universel — un fichier par
 * etablissement le rendrait aussi couteux que ce qu'il remplace.
 *
 * `aide` est un **libelle**, pas une instruction : « ADE → Exporter mon agenda ». Il s'affiche tel
 * quel, comme le nom de l'universite, et pour la meme raison — le chemin exact vers un lien
 * d'abonnement est propre a chaque etablissement, et le traduire n'aurait aucun sens.
 */
export interface EdtAbonnement {
    readonly aide: string | null;
}

/**
 * Comment lire un code de batiment dans un libelle de salle, chez cet etablissement.
 *
 * C'etait du code bordelais jusqu'au jalon 6-I : une decoupe sur ` | ` puis `/`, et un motif
 * `([A-Z][0-9]+)` qui attend `A29` ou `B18`. Aucune salle de Bordeaux INP n'y correspond — elles
 * s'ecrivent `CD-O204`, `CA-N103`, `E103 - FabLaB,CD-O108` — et c'est exactement la constante
 * bordelaise deguisee en regle generale que le jalon 6-G a corrigee onze fois ailleurs.
 *
 * `depuis` existe parce que la ligne de salle n'est pas au meme rang selon la source : les
 * descriptions Celcat la portent a partir de la troisieme ligne, l'iCalendar la met en tete parce
 * qu'elle vient d'un champ separe (`LOCATION`).
 */
export interface FormatSalles {
    /** Les separateurs qui decoupent un libelle en salles successives. */
    readonly separateurs: readonly string[];
    /** Le motif dont le premier groupe capturant est le code de batiment. */
    readonly motif: string;
    /** Le rang de la premiere ligne de description susceptible de porter une salle. */
    readonly depuis: number;
}

/**
 * Un etablissement, tel que l'application le manipule.
 *
 * Les champs a `null` sont des **services absents**, pas des trous a combler : une fac dont le
 * webmail n'est pas extractible, une fac dont l'emploi du temps n'est pas interrogeable. L'ecran le
 * **dit** au lieu d'echouer, et c'est la difference qui vaut le jalon.
 */
export interface Etablissement {
    readonly code: string;
    readonly nom: string;
    /**
     * Le nom **court**, pour les endroits ou la place manque : une ligne de reglage, une pastille,
     * un bouton. `null` : il n'y en a pas, et le nom complet fait l'affaire.
     *
     * Deux noms plutot qu'un seul raccourci partout, et c'est un arbitrage : « College ST » ne veut
     * rien dire a quelqu'un qui choisit son etablissement pour la premiere fois, alors que « College
     * Sciences et Technologies » ne tient pas dans une ligne de reglage. L'ecran de choix garde donc
     * le nom entier ; les espaces contraints prennent celui-ci.
     *
     * A ne pas confondre avec un correctif de gabarit : une ligne qui laisse sa valeur ecraser son
     * libelle est cassee pour **toutes** les valeurs longues, et ca se repare dans la ligne
     * (`shared/ui/Button.tsx`), pas en raccourcissant les donnees.
     */
    readonly nomCourt: string | null;
    readonly ville: string | null;
    readonly logo: string | null;
    /** Le Blueprint du dossier administratif, sous `ukit.portail.`. `null` : pas d'identite lisible. */
    readonly portailDossier: string | null;
    /** Le Blueprint de la messagerie. `null` : pas de compteur de messages, et aucun echec affiche. */
    readonly portailMessagerie: string | null;
    /**
     * Le Blueprint qui rapporte le **certificat de scolarite**, sous `ukit.portail.`.
     *
     * `null` veut dire « personne n'a encore ecrit le Blueprint de ce portail », et rien de plus. La
     * technique ne depend PAS de la stabilite des adresses : le Blueprint lit le lien frais dans le
     * DOM a chaque run et telecharge depuis la page — les deux etablissements portes le prouvent,
     * ReNARD aux adresses deterministes comme PC-Scol aux adresses regenerees a chaque rendu
     * (mesures des 2026-08-25 et 2026-08-29). Sans source, le certificat n'est simplement pas range
     * d'avance, et la section Documents reste un endroit ou l'etudiant depose ce qu'il veut.
     *
     * Une colonne nommee plutot qu'une entree de `portailWidgets`, et la distinction n'est pas
     * formelle : un widget rend un **compteur** qu'une rangee affiche, celui-ci rend un **fichier**
     * qu'on ecrit sur l'appareil. Les melanger aurait fait passer un document par une machinerie qui
     * ne connait que des nombres.
     */
    readonly portailDocuments: string | null;
    /**
     * Les Blueprints qui **remplissent les widgets**, indexes par point de service.
     *
     * C'est la table generale, et `portailMessagerie` en est l'ancetre : la messagerie y figure comme
     * les autres. L'ancienne colonne est conservee **et lue en repli** (voir `blueprintDuWidget`)
     * parce qu'un appareil dont la surcouche de catalogue n'a pas encore ete rafraichie ne connait
     * qu'elle — sans ce repli, mettre a jour l'application eteindrait le compteur jusqu'au prochain
     * rafraichissement du catalogue.
     *
     * Un point **absent** n'est pas une panne : c'est un widget dont la donnee n'existe pas encore
     * chez cet etablissement. La rangee reste affichee et ouvre sa porte — les notes et les examens
     * sont exactement dans ce cas au 2026-08-28 (features/Scolarite/widgets/definitions.ts).
     */
    readonly portailWidgets: Readonly<Record<string, WidgetPublie>>;
    /** La racine du serveur d'emplois du temps. `null` : cet etablissement n'en publie pas ici. */
    readonly celcatDomaine: string | null;
    readonly celcatResTypes: CelcatResTypes;
    /**
     * L'export iCalendar, quand l'etablissement n'est pas sur un Celcat ouvert. `null` : il n'en a
     * pas — et un etablissement dont **les deux** sont nuls n'a pas d'emploi du temps du tout, ce que
     * l'onglet Planning dit au lieu d'echouer (jalon 6-I).
     */
    readonly edt: EdtIcal | null;
    /**
     * L'abonnement iCalendar colle a la main, quand l'etablissement en publie un (jalon 6-J).
     *
     * Il ne remplace pas `edt` : un etablissement peut avoir un referentiel releve **et** accepter un
     * lien personnel. L'ordre de preference est ecrit dans `edt.ts`, et il va du plus automatique au
     * plus manuel.
     */
    readonly edtAbonnement: EdtAbonnement | null;
    /**
     * Comment lire un code de batiment dans une salle, ou `null` quand cet etablissement n'a **pas**
     * de referentiel de lieux.
     *
     * `null` n'est pas un defaut manquant, c'est une decision : chez un etablissement dont on ne
     * connait pas le format des salles, appliquer celui de Bordeaux ferait capturer un code bordelais
     * existant dans un libelle etranger, et afficherait **le mauvais batiment**. *Un batiment sans
     * coordonnees n'est pas une carte vide, c'est une carte fausse* — la regle est ecrite au jalon 6-I,
     * et c'est elle qui impose ce nul. Une colonne **absente**, elle, vaut toujours le comportement
     * Celcat : la migration reste invisible.
     */
    readonly salles: FormatSalles | null;
    /**
     * La region CROUS de l'etablissement, telle que Croustillant la numerote. `null` : pas de
     * restaurants a proposer, et la section disparait.
     *
     * Elle etait une `vars` du Blueprint jusqu'au jalon 6-J, avec un commentaire qui l'assumait —
     * « l'application vise une seule region ». C'etait vrai, et c'est exactement la forme que prend
     * une constante bordelaise avant de devenir fausse : le jalon 6-G en a corrige onze du meme genre.
     * Elle vaut toujours 1 aujourd'hui, et le perimetre du produit est bordelais (voir le README) —
     * mais elle est desormais **une donnee**, donc corrigeable sans release le jour ou ca change.
     */
    readonly crousRegion: string | null;
    /**
     * Le serveur d'inventaire des salles libres, quand il n'est **pas** celui de l'etablissement.
     *
     * `null` : celui de l'etablissement fait l'affaire — c'est le cas general, et celui de Bordeaux.
     * Une valeur : cet etablissement emprunte l'inventaire d'un autre serveur, parce que ses etudiants
     * sont physiquement sur le meme campus. Voir `entreesCelcat`.
     */
    readonly sallesLibres: EntreesSalles | null;
    readonly bibliothequesPoints: readonly PointBalayage[];
    /**
     * Les adresses des services universitaires ouverts dans le navigateur integre, par point d'entree
     * (`ent`, `email`, `cas`, `apogee`).
     *
     * Ce ne sont pas des sources : l'utilisateur pilote ces pages, elles ne sont pas extraites
     * (docs/features/scolarite.md). Elles sont neanmoins propres a l'etablissement, et les laisser en
     * dur enverrait un etudiant d'une fac sur le portail d'une autre.
     */
    readonly services: Readonly<Record<string, string>>;
    /** Les intitules propres a l'etablissement, indexes par role (voir `libelleEtablissement`). */
    readonly libelles: Readonly<Record<string, string>>;
    readonly ordre: number;
}

/**
 * Ce qu'une ligne de catalogue dit d'un widget : quel Blueprint le remplit, et a quel rythme.
 *
 * La peremption est **publiable** plutot que compilee : c'est un compromis entre fraicheur et runs de
 * moteur, et le bon reglage se mesure sur des appareils reels. La regler par une release aurait rendu
 * l'experience impossible a corriger entre deux versions.
 */
export interface WidgetPublie {
    /** Le nom du Blueprint, sous le prefixe reserve. */
    readonly blueprint: string;
    /** La peremption en minutes, ou `null` pour garder celle de la definition. */
    readonly peremptionMin: number | null;
}

/** Le code de l'etablissement historique : celui qu'une installation existante est reputee avoir. */
export const ETABLISSEMENT_DEFAUT = 'bordeaux';

/**
 * Les onze points de balayage des bibliotheques de la region bordelaise.
 *
 * **Mesure du 2026-08-08, a lire avant d'y toucher.** Les onze points rendent 14 bibliotheques, et la
 * repartition n'est pas celle qu'on croit : Bordeaux Centre et Talence/Pessac voient les **memes** 8
 * sites, aucun des deux n'ayant d'exclusivite ; cinq points — Poitiers, Perigueux, Agen, Angouleme,
 * Niort — n'en rendent **aucun** ; et seuls Pau, La Rochelle, Limoges et Bayonne portent des sites que
 * personne d'autre ne voit. Reduire la liste est donc tentant, et ce serait un changement de
 * comportement produit : un point muet aujourd'hui peut cesser de l'etre le jour ou une bibliotheque
 * s'inscrit chez le fournisseur. La decision se prend avec ses propres mesures, pas ici.
 *
 * Ils vivaient en dur dans `LibraryService.ts` jusqu'au jalon 6-G. Ce sont des decisions produit —
 * quelles villes on couvre — donc de la donnee de catalogue, corrigeable sans release.
 */
const POINTS_BORDEAUX: readonly PointBalayage[] = [
    { lat: 44.8377, lng: -0.5791 }, // Bordeaux Centre (Victoire, Bastide, Chartrons)
    { lat: 44.7963, lng: -0.6277 }, // Campus Talence / Pessac / Gradignan
    { lat: 43.2951, lng: -0.3707 }, // Pau
    { lat: 46.1603, lng: -1.1511 }, // La Rochelle
    { lat: 45.8336, lng: 1.2611 },  // Limoges
    { lat: 46.5802, lng: 0.3403 },  // Poitiers
    { lat: 43.4929, lng: -1.4748 }, // Bayonne / Anglet
    { lat: 45.1920, lng: 0.7194 },  // Perigueux
    { lat: 44.2031, lng: 0.6163 },  // Agen
    { lat: 45.6483, lng: 0.1562 },  // Angouleme
    { lat: 46.3237, lng: -0.4647 }, // Niort
];

/** Les valeurs par defaut d'un champ que la ligne ne porte pas. Un seul endroit, pour un seul sens. */
const RES_TYPES_PAR_DEFAUT: CelcatResTypes = { groupes: '103', salles: '102' };

/**
 * La region Croustillant du secteur bordelais, telle qu'elle vivait dans les `vars` du Blueprint.
 *
 * Elle est ici pour que le socle embarque reste **exactement** ce qu'il etait : une installation qui
 * n'a jamais joint la base doit continuer d'afficher les restaurants de Bordeaux. La colonne, elle,
 * permet de la corriger — et de la retirer pour un etablissement qui n'en a pas.
 */
const REGION_CROUS_BORDEAUX = '1';

/**
 * Le format de salle par defaut : celui de Celcat, tel qu'il vivait en dur dans `AppCore` avant le
 * jalon 6-I.
 *
 * Une ligne sans colonne `salles` garde donc **exactement** le comportement d'avant, y compris sur
 * une base qui n'aurait pas encore recu la colonne. C'est la meme regle que `RES_TYPES_PAR_DEFAUT` :
 * un defaut n'est pas une commodite, c'est ce qui rend la migration invisible.
 */
const SALLES_PAR_DEFAUT: FormatSalles = { separateurs: [' | ', '/'], motif: '([A-Z][0-9]+)', depuis: 2 };

/**
 * Le socle embarque : un seul etablissement, et c'est voulu.
 *
 * Le binaire n'embarque que ce dont il embarque aussi les Blueprints. Un second etablissement arrive
 * **par publication** — c'est la preuve que le mecanisme tient, et l'inscrire ici la detruirait.
 */
const SOCLE: Readonly<Record<string, Etablissement>> = {
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
            // `/login/index.php` et **pas la racine** : la racine de ce Moodle est une page d'accueil
            // PUBLIQUE, mesuree le 2026-08-29. On y arrivait donc deconnecte, avec un bouton
            // « Connexion » a presser — et la session persistee ne servait a rien, puisqu'aucune page
            // d'authentification n'etait jamais demandee. `/login/index.php` part sur le WAYF, qui
            // delegue au CAS, ou le ticket vivant passe sans rien retaper. C'est la porte que le
            // Blueprint du widget emprunte deja.
            //
            // Absente du socle jusqu'ici : elle n'existait que dans la ligne publiee, donc une
            // installation qui n'avait pas encore rafraichi son catalogue n'avait pas de porte Moodle.
            moodle: 'https://moodle.u-bordeaux.fr/login/index.php',
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
};

function texteOuNull(valeur: unknown): string | null {
    return typeof valeur === 'string' && valeur !== '' ? valeur : null;
}

/** Les points de balayage d'une ligne, ignorant tout ce qui n'est pas un couple de nombres finis. */
function projeterPoints(valeur: unknown): readonly PointBalayage[] {
    if (!Array.isArray(valeur)) return [];

    const points: PointBalayage[] = [];
    for (const brut of valeur) {
        const lat = (brut as { lat?: unknown })?.lat;
        const lng = (brut as { lng?: unknown })?.lng;
        if (typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)) {
            points.push({ lat, lng });
        }
    }
    return points;
}

/**
 * Une table de chaines d'une ligne, reduite aux paires exploitables.
 *
 * Sert aux intitules et aux adresses de services : les deux sont des colonnes libres cote base, et
 * une valeur qui n'est pas une chaine non vide ne s'affiche ni ne s'ouvre — la retenir ferait porter
 * `undefined` a un composant ou a une WebView.
 */
function projeterTableDeChaines(valeur: unknown): Readonly<Record<string, string>> {
    if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) return {};

    const table: Record<string, string> = {};
    for (const [cle, brut] of Object.entries(valeur as Record<string, unknown>)) {
        if (typeof brut === 'string' && brut !== '') table[cle] = brut;
    }
    return table;
}

function projeterResTypes(valeur: unknown): CelcatResTypes {
    if (valeur === null || typeof valeur !== 'object') return RES_TYPES_PAR_DEFAUT;

    const source = valeur as Record<string, unknown>;
    return {
        groupes: texteOuNull(source.groupes) ?? RES_TYPES_PAR_DEFAUT.groupes,
        salles: texteOuNull(source.salles) ?? RES_TYPES_PAR_DEFAUT.salles,
    };
}

/**
 * Le referentiel des groupes d'un export iCalendar, reduit aux entrees exploitables.
 *
 * Un doublon de **nom** est ecarte, et le premier gagne : le nom est ce que l'utilisateur choisit et
 * ce qui compose la cle de cache, deux ressources sous un meme nom rendraient donc le planning
 * dependant de l'ordre de lecture de la base. Le releve en produit reellement — mesure du
 * 2026-08-15 : `S3` designe cinq index differents.
 */
function projeterGroupesEdt(valeur: unknown): readonly GroupeEdt[] {
    if (!Array.isArray(valeur)) return [];

    const groupes: GroupeEdt[] = [];
    const vus = new Set<string>();
    for (const brut of valeur) {
        const nom = texteOuNull((brut as { nom?: unknown })?.nom);
        const ressource = texteOuNull((brut as { ressource?: unknown })?.ressource);
        if (nom === null || ressource === null || vus.has(nom)) continue;

        vus.add(nom);
        groupes.push({ nom, ressource });
    }
    return groupes;
}

/**
 * L'export iCalendar d'une ligne, ou `null` si elle n'en declare pas d'exploitable.
 *
 * Les deux noms de Blueprint sont **obligatoires** : sans eux il n'y a rien a jouer, et rendre un
 * objet a moitie forme ferait echouer un run au lieu de faire dire a l'ecran « pas d'emploi du temps
 * ici ». Le referentiel, lui, peut etre vide — une universite dont on n'a pas encore releve les
 * groupes est un cas normal, et l'ecran de recherche le montre comme une liste vide.
 */
function projeterEdt(valeur: unknown): EdtIcal | null {
    if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) return null;

    const source = valeur as Record<string, unknown>;
    const blueprint = texteOuNull(source.blueprint);
    const blueprintAnnee = texteOuNull(source.blueprint_annee);
    if (blueprint === null || blueprintAnnee === null) return null;

    return {
        blueprint,
        blueprintAnnee,
        params: projeterTableDeChaines(source.params),
        groupes: projeterGroupesEdt(source.groupes),
    };
}

/**
 * L'abonnement iCalendar d'une ligne, ou `null` si elle n'en declare pas.
 *
 * Un objet vide suffit a le declarer : ce qui compte est **le fait**, pas ses details. `aide` est
 * facultative parce qu'un etablissement peut publier un export sans qu'on sache dire ou l'etudiant le
 * trouve — et une aide inventee serait pire qu'une aide absente.
 */
function projeterEdtAbonnement(valeur: unknown): EdtAbonnement | null {
    if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) return null;

    return { aide: texteOuNull((valeur as Record<string, unknown>).aide) };
}

/**
 * Le format de salle d'une ligne, champ par champ, avec le comportement Celcat en repli.
 *
 * Trois cas, et le troisieme est la nouveaute du jalon 6-J :
 *
 *   - **colonne absente** : le comportement Celcat historique, ce qui rend la migration invisible ;
 *   - **colonne renseignee** : les champs de l'etablissement, defaut par defaut ;
 *   - **`{"reconnaissance": false}`** : `null`, c'est-a-dire *cet etablissement n'a pas de referentiel
 *     de lieux*. Appliquer le format bordelais a un libelle etranger ferait capturer un code qui
 *     existe chez nous et afficher le mauvais batiment ; une carte fausse est pire qu'une carte vide.
 *
 * Un motif illisible n'est pas rejete ici : c'est `shared/locations/salles.ts` qui le compile, et
 * c'est lui qui retombe sur le defaut si le moteur d'expressions le refuse. Separer les deux garde ce
 * module sans effet de bord — il projette une ligne, il n'execute rien.
 */
function projeterSalles(valeur: unknown): FormatSalles | null {
    if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) return SALLES_PAR_DEFAUT;

    const source = valeur as Record<string, unknown>;
    if (source.reconnaissance === false) return null;

    const separateurs = Array.isArray(source.separateurs)
        ? source.separateurs.filter((brut): brut is string => typeof brut === 'string' && brut !== '')
        : null;
    const depuis = source.depuis;

    return {
        separateurs: separateurs !== null && separateurs.length > 0 ? separateurs : SALLES_PAR_DEFAUT.separateurs,
        motif: texteOuNull(source.motif) ?? SALLES_PAR_DEFAUT.motif,
        depuis: typeof depuis === 'number' && Number.isInteger(depuis) && depuis >= 0 ? depuis : SALLES_PAR_DEFAUT.depuis,
    };
}

/**
 * Le serveur d'inventaire emprunte par une ligne, ou `null`.
 *
 * Les deux champs sont obligatoires : un serveur sans code d'inventaire, ou l'inverse, ne permet pas
 * de composer une requete. Rendre `null` fait retomber sur le serveur de l'etablissement, ce qui est
 * le bon repli.
 */
function projeterSallesLibres(valeur: unknown): EntreesSalles | null {
    if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) return null;

    const source = valeur as Record<string, unknown>;
    const domaine = texteOuNull(source.domaine);
    const res_type = texteOuNull(source.res_type);
    return domaine !== null && res_type !== null ? { domaine, res_type } : null;
}

/**
 * Les widgets d'une ligne, reduits aux descripteurs exploitables.
 *
 * Defensive comme ses voisines, et pour la meme raison : la colonne est libre cote base, donc une
 * ligne mal remplie ne doit pas faire tomber le catalogue entier. Une entree sans nom de Blueprint
 * est **ignoree** plutot que retenue vide — la retenir ferait tenter un run sur un nom absent, et
 * l'echec arriverait au milieu d'un rafraichissement, la ou il serait illisible.
 *
 * La peremption n'est validee que sur sa nature : un entier strictement positif, sinon `null`, qui
 * fait garder celle de la definition. Une valeur de zero ferait rejouer le widget a chaque
 * evaluation, ce qui est le seul reglage capable de vider une batterie.
 */
function projeterWidgetsPublies(valeur: unknown): Readonly<Record<string, WidgetPublie>> {
    if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) return {};

    const table: Record<string, WidgetPublie> = {};
    for (const [point, brut] of Object.entries(valeur as Record<string, unknown>)) {
        if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) continue;

        const source = brut as Record<string, unknown>;
        const blueprint = texteOuNull(source.blueprint);
        if (blueprint === null) continue;

        const peremption = source.peremption_min ?? source.peremptionMin;
        table[point] = {
            blueprint,
            peremptionMin: typeof peremption === 'number' && Number.isInteger(peremption) && peremption > 0
                ? peremption
                : null,
        };
    }
    return table;
}

/**
 * Traduit une ligne de la table vers le contrat applicatif.
 *
 * **Une ligne remplace, elle ne corrige pas** — l'inverse exact de `projeterBatiment`, et la
 * difference est de sens : la-bas un nul veut dire « je ne touche pas a ce champ », donc il ne doit
 * rien effacer ; ici un nul veut dire « ce service n'existe pas », donc il doit gagner. Fusionner
 * champ par champ rendrait impossible de **retirer** une messagerie devenue inextractible.
 *
 * Corollaire : une ligne de catalogue s'ecrit **entiere** (supabase/etablissements.sql).
 */
export function projeterEtablissement(row: EtablissementRow): Etablissement {
    return {
        code: row.code,
        nom: row.nom,
        nomCourt: texteOuNull(row.nom_court),
        ville: texteOuNull(row.ville),
        logo: texteOuNull(row.logo_url),
        portailDossier: texteOuNull(row.portail_dossier),
        portailMessagerie: texteOuNull(row.portail_messagerie),
        portailDocuments: texteOuNull(row.portail_documents),
        portailWidgets: projeterWidgetsPublies(row.portail_widgets),
        celcatDomaine: texteOuNull(row.celcat_domaine),
        celcatResTypes: projeterResTypes(row.celcat_res_types),
        edt: projeterEdt(row.edt),
        // L'abonnement se lit dans la **meme** colonne que le referentiel : les deux decrivent
        // l'emploi du temps, et les separer aurait fait deux endroits ou chercher pourquoi une fac
        // n'en a pas.
        edtAbonnement: projeterEdtAbonnement((row.edt as { abonnement?: unknown } | null)?.abonnement),
        salles: projeterSalles(row.salles),
        sallesLibres: projeterSallesLibres(row.salles_libres),
        bibliothequesPoints: projeterPoints(row.bibliotheques_points),
        crousRegion: texteOuNull(row.crous_region),
        services: projeterTableDeChaines(row.services),
        libelles: projeterTableDeChaines(row.libelles),
        ordre: typeof row.ordre === 'number' && Number.isFinite(row.ordre) ? row.ordre : 0,
    };
}

/** La table courante : le socle, puis la surcouche par-dessus. */
let table: Record<string, Etablissement> = { ...SOCLE };

/** Le code selectionne. `SettingsManager` le pose au chargement des reglages et a chaque changement. */
let codeActif: string = ETABLISSEMENT_DEFAUT;

/**
 * L'etablissement selectionne a-t-il ete **retire** du catalogue publie ?
 *
 * Il reste resolu — la couture le reporte depuis le cache precedent — mais la base ne le publie plus.
 * Les deux faits sont distincts et l'ecran a besoin des deux : continuer a fonctionner, et le dire.
 */
let actifRetire = false;

/**
 * Installe une surcouche. Sans argument, revient au socle embarque seul.
 *
 * La lecture ne rend que les etablissements `actif` — c'est la politique de la base qui filtre, pas
 * l'application (supabase/policies.sql). Un etablissement retire disparait donc de la liste sans une
 * ligne de code, **et sans desactiver celui d'un utilisateur qui l'avait choisi** : son socle, ou la
 * derniere surcouche connue de son cache, continue de le porter. Le prevenir est le travail de
 * l'ecran, pas celui de cette table.
 */
export function appliquerCatalogue(
    surcouche?: Readonly<Record<string, Etablissement>> | null,
    retireActif = false,
): void {
    table = surcouche ? { ...SOCLE, ...surcouche } : { ...SOCLE };
    actifRetire = retireActif;
}

/** L'etablissement portant ce code, ou `null`. Synchrone, toujours disponible. */
export function getEtablissement(code: string): Etablissement | null {
    return Object.prototype.hasOwnProperty.call(table, code) ? table[code] : null;
}

/**
 * Le catalogue, dans un ordre **stable** : `ordre` d'abord, puis le nom.
 *
 * Une table n'a pas d'ordre, et s'en remettre a celui que la base rend ferait varier l'ecran de choix
 * d'une lecture a l'autre. Le nom departage a `ordre` egal, pour que deux appareils affichent la meme
 * liste.
 */
export function listeEtablissements(): readonly Etablissement[] {
    return Object.values(table).sort(
        (gauche, droite) => gauche.ordre - droite.ordre || gauche.nom.localeCompare(droite.nom),
    );
}

/**
 * L'etablissement selectionne.
 *
 * Ne rend **jamais** `null` : un code inconnu — un etablissement retire de la base et absent du cache
 * — retombe sur le socle historique plutot que de laisser l'application sans reference. C'est le
 * meme repli que partout ailleurs dans la phase, et il vaut mieux qu'un ecran blanc.
 */
export function getEtablissementActif(): Etablissement {
    return getEtablissement(codeActif) ?? SOCLE[ETABLISSEMENT_DEFAUT];
}

/** Le code selectionne, tel qu'il est persiste — meme s'il ne resout plus. */
export function getCodeEtablissementActif(): string {
    return codeActif;
}

/**
 * L'etablissement selectionne a-t-il ete retire du catalogue publie ?
 *
 * Le cas est reel : une ligne passee a `actif = false` cesse d'etre lue (la politique filtre cote
 * serveur). L'application **ne bascule pas toute seule** — elle continue sur ce qu'elle sait, ce qui
 * est le bon comportement pour quelqu'un au milieu de son annee — mais elle doit le **dire** : un
 * portail qui cessera de fonctionner sans explication est pire qu'un portail retire avec un mot.
 *
 * « Ce qu'elle sait » n'est pas une figure de style : la couture **reporte** l'entree depuis le cache
 * precedent au lieu de la laisser disparaitre (voir index.ts). Sans ce report, l'etablissement
 * cesserait de resoudre et l'application retomberait en silence sur le socle historique — c'est-a-dire
 * qu'elle basculerait quelqu'un sans le lui dire, exactement ce qu'on refuse.
 *
 * **Deux causes, un seul signal**, et la seconde est celle qui a manque : le report ne joue qu'au
 * rafraichissement, et un cache qui a perdu l'entree — une reinstallation, ou un appareil passe par
 * une version qui l'effacait — laisse un code qui ne resout plus. Le repli de `getEtablissementActif`
 * donne alors le socle historique, ce qui est le seul comportement possible mais **ne doit pas etre
 * silencieux**. Mesure sur appareil au jalon 6-G : au redemarrage, l'application s'etait posee toute
 * seule sur l'autre universite.
 */
export function etablissementRetire(): boolean {
    return actifRetire || getEtablissement(codeActif) === null;
}

/** Pose le code selectionne. La persistance et la purge sont ailleurs (index.ts, AppCore). */
export function setCodeEtablissementActif(code: string): void {
    codeActif = typeof code === 'string' && code !== '' ? code : ETABLISSEMENT_DEFAUT;
}

/**
 * Cet etablissement declare-t-il **un** portail, quel qu'il soit ?
 *
 * La question que se posent les ecrans qui **proposent** le compte — l'etape d'accueil et la ligne des
 * reglages : y a-t-il seulement quelque chose derriere quoi s'authentifier ? Elle porte sur la donnee
 * du catalogue et rien d'autre, ce qui la rend synchrone et jouable sous Node.
 *
 * A ne pas confondre avec `portailDisponible(role)` de `ScolariteSession`, qui repond a une question
 * voisine mais differente — *peut-on jouer ce portail ?* — et verifie donc en plus que le nom vit sous
 * le prefixe reserve. La distinction a une consequence utile : une ligne de catalogue mal ecrite
 * laisse la proposition visible, et c'est **l'onglet Scolarite** qui nomme le probleme. C'est le bon
 * endroit pour le dire ; le masquer ferait disparaitre le service sans que personne sache pourquoi.
 */
export function portailPublie(): boolean {
    const etablissement = getEtablissementActif();
    return etablissement.portailDossier !== null || etablissement.portailMessagerie !== null;
}

/**
 * Le nom de l'etablissement selectionne, dans sa forme la plus courte disponible.
 *
 * A employer partout ou la place est contrainte — une ligne de reglage, une pastille. L'ecran de
 * **choix** d'etablissement, lui, garde `nom` : c'est le seul endroit ou quelqu'un doit reconnaitre
 * une fac qu'il ne connait pas encore.
 */
export function nomCourtEtablissement(): string {
    const etablissement = getEtablissementActif();
    return etablissement.nomCourt ?? etablissement.nom;
}

/**
 * L'intitule d'un champ, tel que **cet** etablissement l'appelle.
 *
 * La regle a ne pas confondre : « Numero etudiant » est un libelle **d'ecran**, donc une chaine de
 * `Translator` traduite en trois langues ; le fait qu'une fac appelle ca « Dossier » ou « INE » est
 * une donnee **de catalogue**. Melanger les deux ramenerait des chaines en dur, et traduire un
 * intitule propre a une universite n'aurait aucun sens.
 */
export function libelleEtablissement(role: string, defaut: string): string {
    return getEtablissementActif().libelles[role] ?? defaut;
}

/**
 * Le format de salle de l'etablissement selectionne, ou `null` s'il n'a pas de referentiel de lieux.
 *
 * `null` fait rendre une liste **vide** a la reconnaissance de salle, donc aucune carte. C'est le bon
 * comportement et non une degradation : afficher un batiment bordelais pour une salle qu'on ne sait
 * pas lire serait une carte fausse (voir `projeterSalles`).
 */
export function formatSallesActif(): FormatSalles | null {
    return getEtablissementActif().salles ?? null;
}

/**
 * La region CROUS de l'etablissement selectionne, ou `null` s'il n'en declare pas.
 *
 * `null` fait **disparaitre** la section des restaurants, comme celle des salles libres chez un
 * etablissement sans inventaire : il n'y a rien qui echoue, il n'y a rien a montrer.
 */
export function crousRegionActive(): string | null {
    // `?? null` et non un simple accès : un cache écrit avant que ce champ n'existe rend `undefined`,
    // qui passe le test `=== null` de l'appelant et part **tel quel** dans les entrées d'un run. Le
    // moteur le rend alors `None`, et l'application demande `/regions/None/restaurants`. Mesuré sur
    // appareil au jalon 6-J. La version de la clé de cache est la première ceinture (index.ts), cette
    // normalisation est la seconde — et c'est elle qui tient si quelqu'un oublie la première.
    return getEtablissementActif().crousRegion ?? null;
}

/**
 * L'adresse d'un service universitaire, ou `null` si cet etablissement n'en declare pas.
 *
 * `null` n'est pas une panne : toutes les facs n'ont pas d'Apogee, ni de webmail sous une adresse
 * stable. L'appelant decide alors quoi montrer — le plus souvent, rien.
 */
/**
 * Le Blueprint qui rapporte le certificat de scolarite chez l'etablissement selectionne, ou `null`.
 *
 * `null` veut dire « on ne sait pas aller le chercher ici », et **pas** « panne » : la section
 * Documents reste ce qu'elle est, un endroit ou l'etudiant depose ce qu'il veut. C'est la meme regle
 * que pour `serviceEtablissement` et `widgetPublie` — un service absent se constate, il ne s'annonce
 * pas comme un echec.
 */
export function documentsPublies(): string | null {
    return getEtablissementActif().portailDocuments ?? null;
}

export function serviceEtablissement(nom: string): string | null {
    return getEtablissementActif().services[nom] ?? null;
}

/**
 * Le Blueprint qui remplit un widget chez l'etablissement selectionne, ou `null`.
 *
 * `null` veut dire « pas de source pour ce widget ici », et **pas** « panne » : la rangee reste
 * affichee et ouvre sa porte. C'est la meme regle que pour `serviceEtablissement`, appliquee a la
 * donnee plutot qu'a l'adresse.
 *
 * **Le repli sur `portailMessagerie` n'est pas de la nostalgie.** La surcouche de catalogue s'applique
 * en asynchrone : un appareil qui vient de recevoir cette version de l'application, mais pas encore
 * la ligne de catalogue qui va avec, n'a que l'ancienne colonne. Sans ce repli, mettre a jour
 * eteindrait le compteur de messages jusqu'au prochain rafraichissement — une regression invisible,
 * introduite par une amelioration.
 */
export function widgetPublie(point: string): WidgetPublie | null {
    const etablissement = getEtablissementActif();
    const declare = etablissement.portailWidgets[point];
    if (declare !== undefined) return declare;

    if (point === 'messagerie' && etablissement.portailMessagerie !== null) {
        return { blueprint: etablissement.portailMessagerie, peremptionMin: null };
    }
    return null;
}

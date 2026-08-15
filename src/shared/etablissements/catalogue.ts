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
    readonly ville: string | null;
    readonly logo: string | null;
    /** Le Blueprint du dossier administratif, sous `ukit.portail.`. `null` : pas d'identite lisible. */
    readonly portailDossier: string | null;
    /** Le Blueprint de la messagerie. `null` : pas de compteur de messages, et aucun echec affiche. */
    readonly portailMessagerie: string | null;
    /** La racine du serveur d'emplois du temps. `null` : cet etablissement n'en publie pas ici. */
    readonly celcatDomaine: string | null;
    readonly celcatResTypes: CelcatResTypes;
    /**
     * L'export iCalendar, quand l'etablissement n'est pas sur un Celcat ouvert. `null` : il n'en a
     * pas — et un etablissement dont **les deux** sont nuls n'a pas d'emploi du temps du tout, ce que
     * l'onglet Planning dit au lieu d'echouer (jalon 6-I).
     */
    readonly edt: EdtIcal | null;
    /** Comment lire un code de batiment dans une salle. Le defaut reproduit le comportement Celcat. */
    readonly salles: FormatSalles;
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
        nom: 'Université de Bordeaux',
        ville: 'Bordeaux',
        logo: null,
        portailDossier: 'ukit.portail.bordeaux.dossier',
        portailMessagerie: 'ukit.portail.bordeaux.messagerie',
        celcatDomaine: 'https://celcat.u-bordeaux.fr/calendar',
        celcatResTypes: { groupes: '103', salles: '102' },
        edt: null,
        salles: SALLES_PAR_DEFAUT,
        sallesLibres: null,
        bibliothequesPoints: POINTS_BORDEAUX,
        services: {
            ent: 'https://ent.u-bordeaux.fr',
            email: 'https://webmel.u-bordeaux.fr',
            cas: 'https://cas.u-bordeaux.fr',
            apogee: 'https://apogee.u-bordeaux.fr',
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
 * Le format de salle d'une ligne, champ par champ, avec le comportement Celcat en repli.
 *
 * Un motif illisible n'est pas rejete ici : c'est `shared/locations/salles.ts` qui le compile, et
 * c'est lui qui retombe sur le defaut si le moteur d'expressions le refuse. Separer les deux garde ce
 * module sans effet de bord — il projette une ligne, il n'execute rien.
 */
function projeterSalles(valeur: unknown): FormatSalles {
    if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) return SALLES_PAR_DEFAUT;

    const source = valeur as Record<string, unknown>;
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
        ville: texteOuNull(row.ville),
        logo: texteOuNull(row.logo_url),
        portailDossier: texteOuNull(row.portail_dossier),
        portailMessagerie: texteOuNull(row.portail_messagerie),
        celcatDomaine: texteOuNull(row.celcat_domaine),
        celcatResTypes: projeterResTypes(row.celcat_res_types),
        edt: projeterEdt(row.edt),
        salles: projeterSalles(row.salles),
        sallesLibres: projeterSallesLibres(row.salles_libres),
        bibliothequesPoints: projeterPoints(row.bibliotheques_points),
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
 * L'adresse d'un service universitaire, ou `null` si cet etablissement n'en declare pas.
 *
 * `null` n'est pas une panne : toutes les facs n'ont pas d'Apogee, ni de webmail sous une adresse
 * stable. L'appelant decide alors quoi montrer — le plus souvent, rien.
 */
export function formatSallesActif(): FormatSalles {
    return getEtablissementActif().salles;
}

export function serviceEtablissement(nom: string): string | null {
    return getEtablissementActif().services[nom] ?? null;
}

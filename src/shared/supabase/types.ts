/**
 * Les types du schema, cote application.
 *
 * Ils decrivent ce que la base **rend**, pas ce que les ecrans manipulent : la conversion vers les
 * types applicatifs (`BdeAnnonce`, `BuildingInfo`, …) reste dans les services, comme pour n'importe
 * quelle source distante. Confondre les deux ferait remonter la forme du schema jusqu'aux
 * composants, et rendrait toute evolution de table visible a l'ecran.
 *
 * **Ecrits a la main, et c'est une decision.** Le TODO du jalon 6-A prevoyait de les generer par
 * `supabase gen types typescript` ; la CLI Supabase est une dependance permanente pour six tables
 * que nous ecrivons nous-memes, dans le meme depot, revues dans le meme commit que le schema. La
 * commande reste notee dans supabase/README.md pour verifier ponctuellement l'accord des deux apres
 * une migration.
 *
 * Voir docs/backend.md.
 */

/** Contenu editorial de vie etudiante. Remplace le fichier servi par jsDelivr. */
export interface AnnonceRow {
    readonly id: string;
    readonly titre: string;
    readonly emetteur: string;
    readonly accroche: string | null;
    readonly description: string | null;
    readonly image_url: string | null;
    readonly cta_texte: string | null;
    readonly cta_lien: string | null;
    readonly publiee_le: string;
    readonly expire_le: string | null;
    readonly active: boolean;
    readonly creee_le: string;
}

/**
 * Referentiel des lieux. Surcouche de assets/locations.json, qui reste le socle hors ligne :
 * l'application doit s'afficher completement au premier lancement, sans reseau.
 */
export interface BatimentRow {
    readonly code: string;
    readonly nom: string;
    readonly campus: string | null;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly acces_libre: boolean;
    readonly horaires: unknown;
    readonly image_url: string | null;
}

/**
 * Catalogue des universites et de leurs portails.
 *
 * Un champ nul est un cas **normal**, pas un trou a combler : une fac sans messagerie extractible
 * existe, une fac sans serveur d'emploi du temps interrogeable aussi. Prevoir l'absence des le
 * premier jour coute moins cher que de la decouvrir au second etablissement.
 *
 * Les trois champs `unknown` — `celcat_res_types`, `bibliotheques_points`, `libelles` — sont
 * volontairement libres cote base et **projetes** cote application
 * (`shared/etablissements/catalogue.ts`) : figer leur forme en colonnes obligerait a migrer la base
 * chaque fois qu'un etablissement a un cas particulier, et c'est deja la posture retenue pour les
 * horaires de `batiments`.
 */
export interface EtablissementRow {
    readonly code: string;
    readonly nom: string;
    readonly ville: string | null;
    readonly logo_url: string | null;
    readonly actif: boolean;
    readonly portail_dossier: string | null;
    readonly portail_messagerie: string | null;
    readonly celcat_domaine: string | null;
    readonly celcat_res_types: unknown;
    readonly bibliotheques_points: unknown;
    readonly services: unknown;
    readonly libelles: unknown;
    readonly ordre: number;
}

/** Version courante et minimale par plateforme. Remplace la lecture du fichier VERSION sur GitHub. */
export interface AppReleaseRow {
    readonly plateforme: 'ios' | 'android';
    readonly version_courante: string;
    readonly version_minimale: string;
    readonly lien_store: string;
    readonly message: string | null;
}

/** Bandeau de service : maintenance, incident, information datee. */
export interface ServiceMessageRow {
    readonly id: string;
    readonly niveau: 'info' | 'avertissement' | 'incident';
    readonly titre: string;
    readonly corps: string | null;
    readonly actif: boolean;
    readonly publie_le: string;
    readonly expire_le: string | null;
}

/** L'index de livraison des Blueprints. Lu par le script de publication, pas par l'application. */
export interface BlueprintRow {
    readonly nom: string;
    readonly version: string;
    readonly chemin: string;
    readonly sha256: string;
    readonly min_engine: string | null;
    readonly desactive: boolean;
    readonly publie_le: string;
}

/**
 * Une table, vue par une application qui ne fait que lire.
 *
 * `Insert` et `Update` a `never` n'est pas un raccourci : c'est la meme frontiere que les politiques,
 * exprimee au compilateur. `supabase.from(...).insert(...)` ne compile pas, et l'ecriture reste ce
 * qu'elle doit etre — le script de publication et la console d'administration, avec la cle secrete.
 * Les inventer donnerait l'illusion d'une capacite que la base refuse de toute facon.
 */
interface TableEnLecture<Row> {
    Row: Row;
    Insert: never;
    Update: never;
    Relationships: [];
}

/**
 * Le schema, tel que le client le connait.
 *
 * Toutes les tables y figurent, y compris celles qu'aucun service ne lit encore : `blueprints` est
 * branchee au jalon 6-C, `batiments` au 6-D, `etablissements` au 6-G. Les declarer maintenant coute
 * six lignes et evite que le premier appelant ait a decider seul de leur forme.
 */
export interface Database {
    public: {
        Tables: {
            annonces: TableEnLecture<AnnonceRow>;
            batiments: TableEnLecture<BatimentRow>;
            etablissements: TableEnLecture<EtablissementRow>;
            app_release: TableEnLecture<AppReleaseRow>;
            service_messages: TableEnLecture<ServiceMessageRow>;
            blueprints: TableEnLecture<BlueprintRow>;
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}

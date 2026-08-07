/**
 * Les types du schema, cote application.
 *
 * Ils decrivent ce que la base **rend**, pas ce que les ecrans manipulent : la conversion vers les
 * types applicatifs (`BdeAnnonce`, `BuildingInfo`, …) reste dans les services, comme pour n'importe
 * quelle source distante. Confondre les deux ferait remonter la forme du schema jusqu'aux
 * composants, et rendrait toute evolution de table visible a l'ecran.
 *
 * TODO(6-B) : generer ce fichier depuis le schema plutot que l'ecrire
 * (`supabase gen types typescript`), et le regenerer a chaque migration. Les formes ci-dessous sont
 * celles de supabase/schema.sql ; elles servent a ecrire les services avant que le projet existe.
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
 * Un champ de portail a `null` est un cas **normal** : une fac sans messagerie extractible existe,
 * et l'ecran n'affiche alors pas la carte. Prevoir l'absence des le premier jour coute moins cher
 * que de la decouvrir au second etablissement.
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
    readonly libelles: unknown;
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

/**
 * Le referentiel des lieux : le fichier embarque, et la surcouche publiee par-dessus.
 *
 * Meme modele que la livraison des Blueprints, pour la meme raison : **le binaire porte un socle, la
 * base ne fait que le mettre a jour**. L'application doit s'afficher entierement au premier
 * lancement, hors ligne, sans avoir jamais joint quoi que ce soit — un batiment sans coordonnees
 * n'est pas une carte vide, c'est une carte fausse.
 *
 * Ce fichier ne touche **ni** au reseau, **ni** au stockage : il tient une table en memoire et sait
 * la fusionner. La couture de plateforme vit dans `index.ts`, exactement comme `delivery.ts` face a
 * `registry.ts` dans shared/aetherius (docs/qualite.md).
 *
 * Les accesseurs sont **synchrones**, et c'est la contrainte qui a decide de la forme : quatre
 * appelants lisent ce referentiel pendant un rendu — l'ecran de carte, le bouton d'itineraire, la
 * reconstruction des batiments et l'extraction des lieux d'un cours. Les rendre asynchrones aurait
 * repandu un `await` dans du code qui n'a aucune raison d'attendre.
 *
 * Voir docs/donnees-et-persistance.md et docs/phase-6/6-d-campus.md.
 */

import type { BatimentRow } from '../supabase/types';

const embarque: Record<string, BuildingRef> = require('../../../assets/locations.json');

/** Les horaires d'ouverture d'un batiment, indexes par jour de la semaine ISO (`"1"` = lundi). */
export interface BuildingSchedule {
    [jour: string]: { open: string; close: string };
}

/**
 * Un lieu du referentiel.
 *
 * Les noms sont ceux du fichier embarque et ne bougent pas : la table les traduit vers ce contrat, et
 * non l'inverse. Renommer ici toucherait quatre appelants pour aucun gain.
 */
export interface BuildingRef {
    lat?: number;
    lng?: number;
    freeAccess?: boolean;
    image?: string;
    campus?: string;
    schedule?: BuildingSchedule | null;
    /**
     * Identifiant de lieu du fournisseur de cartes, lu par le bouton d'itineraire.
     *
     * Aucun lieu n'en porte aujourd'hui, ni dans le fichier ni dans la table : le champ est declare
     * parce que le code le lit, pas parce que la donnee existe.
     */
    placeID?: string;
}

/**
 * La table courante : le socle, puis la surcouche appliquee dessus.
 *
 * Une copie du fichier plutot que le fichier lui-meme — `require` rend le meme objet a tous les
 * appelants, et une fusion en place ferait diverger le socle de lui-meme au premier rafraichissement.
 */
let table: Record<string, BuildingRef> = { ...embarque };

/**
 * Traduit une ligne de la table vers le contrat du referentiel.
 *
 * Les colonnes nulles sont **omises**, pas converties : c'est ce qui permet a la fusion de ne jamais
 * effacer une valeur embarquee avec un vide. Une ligne partielle corrige ce qu'elle porte, et rien
 * d'autre.
 */
export function projeterBatiment(row: BatimentRow): BuildingRef {
    const ref: BuildingRef = {};

    if (typeof row.latitude === 'number') ref.lat = row.latitude;
    if (typeof row.longitude === 'number') ref.lng = row.longitude;
    if (typeof row.acces_libre === 'boolean') ref.freeAccess = row.acces_libre;
    if (typeof row.image_url === 'string' && row.image_url !== '') ref.image = row.image_url;
    if (typeof row.campus === 'string' && row.campus !== '') ref.campus = row.campus;
    if (row.horaires !== null && row.horaires !== undefined) ref.schedule = row.horaires as BuildingSchedule;

    return ref;
}

/**
 * Applique une surcouche sur le socle embarque, **champ par champ**.
 *
 * Un code absent de la surcouche garde le socle ; un code absent du socle est **ajoute**. Ajouter est
 * volontaire ici, alors que la livraison des Blueprints le refuse : un Blueprint est de la donnee
 * executable, un batiment est une coordonnee. Corriger un horaire faux sans release est precisement
 * ce que ce referentiel gagne, et couvrir un nouveau batiment en fait partie.
 *
 * La fonction ne mute rien : elle rend la table a installer.
 */
export function fusionner(
    socle: Record<string, BuildingRef>,
    surcouche: Record<string, BuildingRef>,
): Record<string, BuildingRef> {
    const fusion: Record<string, BuildingRef> = { ...socle };

    for (const [code, ref] of Object.entries(surcouche)) {
        fusion[code] = { ...(socle[code] ?? {}), ...ref };
    }

    return fusion;
}

/** Installe une surcouche. Sans argument, revient au socle embarque seul. */
export function appliquerSurcouche(surcouche?: Record<string, BuildingRef> | null): void {
    table = surcouche ? fusionner(embarque, surcouche) : { ...embarque };
}

/** Le lieu portant ce code, ou `null`. Synchrone, toujours disponible. */
export function getBuildingRef(code: string): BuildingRef | null {
    return Object.prototype.hasOwnProperty.call(table, code) ? table[code] : null;
}

/** Tout le referentiel, socle et surcouche confondus. */
export function allBuildingRefs(): Record<string, BuildingRef> {
    return table;
}

/**
 * Ce que l'apercu dessine : la ligne du formulaire projetee sur une annonce, les largeurs que
 * l'application donne a ses cartes, le recadrage, le ratio borne de la fiche, la teinte d'identite.
 *
 * Les nombres sont ceux de l'application, releves dans son code (BdeSection : 60 % de la largeur
 * d'ecran ; BdeScreen : deux cellules par rangee moins la gouttiere ; BdeDetailsScreen : un ratio
 * borne entre 3:4 et 16:9), sur un ecran de la largeur de l'iPhone 13 Pro. La carte v2 (4:5,
 * couvrir autour de la focale, badge de type) est celle que la 6.3 rend (7-I) : l'apercu la dessine
 * en premier, et c'est lui la reference. Ses regles — la focale, l'ajustement, le badge, le partenaire,
 * les emplacements speciaux — viennent du module partage avec l'application
 * (`src/shared/annonces/carte.ts`) ; leurs libelles restent ici, la console n'etant pas traduite.
 *
 * Pur : joue par `npm test` a la racine du depot (modele.test.ts).
 */

import {
    emplacementsSpeciaux,
    estTypeDAnnonce,
    lireAjustement,
    lireFocale,
    partenaireDeCarte,
    typeDeBadge,
    type Ajustement,
    type Focale,
    type Partenaire,
    type TypeDeBadge,
} from '../../../../../src/shared/annonces/carte';
import type { PaletteDeBase } from '../../../../../src/shared/theme/palettes';
import { tokens } from '../../../../../src/shared/theme/tokens';
import { EMPLACEMENTS } from '../../../schema/tables/annonces';

/** Les deux vues de l'apercu : la carte, dans ses carrousels, et la fiche qu'elle ouvre. */
export type Vue = 'carte' | 'fiche';

/** Les endroits de la fiche ou l'apercu se cale quand on edite ce qu'ils montrent. */
export type ZoneDeFiche = 'heros' | 'description' | 'galerie' | 'lieu';

/** La largeur logique de l'iPhone 13 Pro, l'appareil de reference du parc de test. */
export const LARGEUR_TELEPHONE = 390;
/** La largeur d'une carte du carrousel : 60 % de l'ecran, pour que la suivante depasse (BdeSection). */
export const LARGEUR_CARROUSEL = Math.round(LARGEUR_TELEPHONE * 0.6);
/** La largeur d'une cellule de la grille : deux par rangee, moins le rembourrage et la gouttiere (BdeScreen). */
export const LARGEUR_CELLULE = Math.floor((LARGEUR_TELEPHONE - tokens.space.sm * 2 - tokens.space.md) / 2);
/** La largeur d'un visuel de la fiche : l'ecran moins la gouttiere de chaque cote (BdeDetailsScreen). */
export const LARGEUR_VISUEL = LARGEUR_TELEPHONE - 2 * tokens.space.md;
/** La hauteur logique de l'iPhone 13 Pro : la fiche n'en montre pas plus qu'un telephone. */
export const HAUTEUR_TELEPHONE = 844;

export interface AnnonceApercu {
    readonly titre: string;
    readonly emetteur: string;
    readonly accroche: string | null;
    readonly description: string | null;
    readonly imageUrl: string | null;
    readonly images: readonly string[];
    readonly couleur: number | undefined;
    readonly ctaTexte: string | null;
    readonly ctaLien: string | null;
    readonly type: string;
    readonly ajustement: Ajustement;
    readonly focale: Focale;
    readonly partenaire: Partenaire | null;
    readonly emplacements: readonly string[];
    readonly aUnLieu: boolean;
}

function texte(valeur: unknown): string | null {
    if (typeof valeur !== 'string') return null;
    const propre = valeur.trim();
    return propre === '' ? null : propre;
}

function nombre(valeur: unknown): number | null {
    if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null;
    // La saisie est celle du formulaire, qui accepte la virgule decimale : « 44,8 » est un nombre.
    if (typeof valeur === 'string' && valeur.trim() !== '') { const n = Number(valeur.replace(',', '.')); return Number.isFinite(n) ? n : null; }
    return null;
}

/** La ligne telle que le formulaire la tient — saisies, pas colonnes — projetee sur ce que l'apercu dessine. */
export function annonceDApercu(valeurs: Readonly<Record<string, unknown>>): AnnonceApercu {
    const couleur = nombre(valeurs.couleur);
    const type = texte(valeurs.type) ?? 'evenement';
    return {
        titre: texte(valeurs.titre) ?? 'Titre de l’annonce',
        emetteur: texte(valeurs.emetteur) ?? 'Émetteur',
        accroche: texte(valeurs.accroche),
        description: texte(valeurs.description),
        imageUrl: texte(valeurs.image_url),
        images: Array.isArray(valeurs.images) ? valeurs.images.filter((url): url is string => typeof url === 'string' && url !== '') : [],
        couleur: couleur === null || !Number.isInteger(couleur) || couleur < 0 ? undefined : couleur,
        ctaTexte: texte(valeurs.cta_texte),
        ctaLien: texte(valeurs.cta_lien),
        type,
        ajustement: lireAjustement(valeurs.ajustement),
        focale: lireFocale(valeurs.focale),
        partenaire: partenaireDeCarte(type, valeurs.partenaire),
        emplacements: Array.isArray(valeurs.emplacements) ? valeurs.emplacements.filter((e): e is string => typeof e === 'string') : ['annonces'],
        aUnLieu: nombre(valeurs.lat) !== null && nombre(valeurs.lng) !== null,
    };
}

/** La teinte d'identite : la couleur de palette, l'accent en repli — `teinteDAnnonce` de l'application. */
export function teinteDe(couleur: number | undefined, palette: PaletteDeBase): string {
    return (couleur === undefined ? undefined : palette.sectionsHeaders[couleur]) ?? palette.accent;
}

/** Le ratio du cadre d'un visuel de la fiche : celui de l'image, borne entre 3:4 et 16:9 (BdeDetailsScreen). */
export function ratioDeCadre(largeur: number, hauteur: number): number {
    if (!(largeur > 0) || !(hauteur > 0)) return 1;
    return Math.min(Math.max(largeur / hauteur, 3 / 4), 16 / 9);
}

/** Le libelle d'un badge, plus court que celui du choix de type : « Info », pas « Information ». */
const LIBELLES_DE_BADGE: Readonly<Record<TypeDeBadge, string>> = { info: 'Info', bon_plan: 'Bon plan', partenaire: 'Partenaire' };

/** Le badge d'une carte, par la regle partagee ; une valeur hors liste se montre telle quelle, pour qu'on la voie. */
export function badgeDeType(type: string): string | null {
    if (!estTypeDAnnonce(type)) return type;
    const badge = typeDeBadge(type);
    return badge === null ? null : LIBELLES_DE_BADGE[badge];
}

/** Les carrousels a dessiner ou la carte est speciale, avec le libelle de chacun. */
export function carrouselsSpeciaux(emplacements: readonly string[]): readonly { readonly code: string; readonly libelle: string }[] {
    return emplacementsSpeciaux(emplacements).map((code) => ({ code, libelle: EMPLACEMENTS.find((emplacement) => emplacement.valeur === code)?.libelle ?? code }));
}

/**
 * La vue que montre l'apercu quand on edite un champ : la carte pour ce qu'elle porte — le visuel, sa
 * focale, le type et son badge, les emplacements, le partenaire —, la fiche pour ce qu'elle seule
 * montre. `null` pour un champ que les deux portent, ou qu'aucune ne montre : la vue ne bouge pas.
 */
export function vueDuChamp(nom: string): Vue | null {
    if (['image_url', 'focale', 'type', 'emplacements', 'partenaire'].includes(nom)) return 'carte';
    if (['accroche', 'description', 'images', 'lat', 'cta_texte', 'cta_lien'].includes(nom)) return 'fiche';
    return null;
}

/** L'endroit de la fiche ou se caler quand on edite un champ ; `null` quand la fiche n'a pas a bouger. */
export function zoneDuChamp(nom: string): ZoneDeFiche | null {
    switch (nom) {
        case 'titre': case 'emetteur': case 'accroche': return 'heros';
        case 'description': return 'description';
        case 'images': return 'galerie';
        case 'lat': return 'lieu';
        default: return null;
    }
}

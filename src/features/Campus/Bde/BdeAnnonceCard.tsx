/**
 * La carte d'une annonce, v2 (jalon 7-I) : celle que l'apercu de la console dessine depuis 7-F.
 *
 * L'apercu est la reference (console/src/pages/Annonces/apercu/Carte.tsx), et les regles que les deux
 * doivent dire pareil vivent dans un module pur partage, `shared/annonces/carte.ts` : le cadre, la
 * focale, le type et son badge, le partenaire. Sans lui, la console finirait par montrer une carte que
 * le telephone ne rend pas.
 *
 * - **Le cadre est 4:5**, et l'image le **couvre autour de sa focale** : un point choisi dans la
 *   console, applique comme `object-position` — il reste visible, a la meme place relative. Une
 *   affiche deja composee garde « contenir » : entiere, sur une copie floutee d'elle-meme.
 * - **Le blurhash tient la place de l'image** pendant qu'elle arrive, calcule par la console au
 *   televersement (docs/theme.md, « une image annonce sa couleur ») ; cadre comme elle, sinon il
 *   sauterait a l'arrivee.
 * - **Le badge dit le type** — info, bon plan, partenaire — et rien pour un evenement : la norme ne
 *   s'etiquette pas. Un partenaire y pose son logo.
 * - **Sans visuel, l'accroche est l'affiche**, en grand dans la teinte d'identite ; sans accroche non
 *   plus, le pictogramme teinte. Le carre gris a icone centree a ete essaye et defait le 2026-08-30.
 *
 * **Une seule carte, deux cadres.** `affiche` dans son carrousel et dans la grille ; `lieu` quand elle
 * s'insere dans un carrousel de lieux — carte speciale —, ou elle prend le visuel de ses voisines, en
 * couvrir : les cartes d'une section ont la meme hauteur (decision du 2026-09-26).
 *
 * Le pied reste celui de 2026-08-31 : l'emetteur en kicker, le titre. La largeur et les marges
 * arrivent de l'exterieur, comme pour la surface `Card`.
 */

import React from 'react';
import { View, Text, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator, { type TranslationKey } from '../../../shared/i18n/Translator';
import { Card } from '../../../shared/ui/Card';
import { TexteMasque } from '../../../shared/ui/TexteMasque';
import { useSourceRendue } from '../../../shared/ui/useSourceRendue';
import { positionPourExpoImage, RATIO_CARTE, typeDeBadge, type TypeDeBadge } from '../../../shared/annonces/carte';
import { HAUTEUR_VISUEL_CARTE } from '../Dashboard/components/gabarits';
import { teinteDAnnonce } from './PastilleEmetteur';
import type { BdeAnnonce } from '../services/BdeService';

const { couture } = tokens.mouvement;

/** Le cadre d'une carte : l'affiche 4:5, ou le visuel d'une carte de lieu. */
export type CadreDAnnonce = 'affiche' | 'lieu';

/** Les dimensions du visuel selon le cadre ; le squelette les prend aussi (SqueletteDeCarrousel). */
export function dimensionsDuVisuel(cadre: CadreDAnnonce): ViewStyle {
    return cadre === 'affiche' ? { width: '100%', aspectRatio: RATIO_CARTE } : { width: '100%', height: HAUTEUR_VISUEL_CARTE };
}

const LIBELLES_DE_BADGE: Readonly<Record<TypeDeBadge, TranslationKey>> = {
    info: 'ANNONCE_TYPE_INFO',
    bon_plan: 'ANNONCE_TYPE_BON_PLAN',
    partenaire: 'ANNONCE_TYPE_PARTENAIRE',
};

export interface BdeAnnonceCardProps {
    annonce: BdeAnnonce;
    width: number;
    theme: AppThemeType;
    /** Marges de placement : gouttiere de carrousel ou de grille, au choix de l'appelant. */
    style?: StyleProp<ViewStyle>;
    onPress: () => void;
    cadre?: CadreDAnnonce;
    /** Le rang dans une liste qui arrive d'un coup : l'entree s'echelonne (Card). */
    rang?: number;
}

export function BdeAnnonceCard({ annonce, width, theme, style, onPress, cadre = 'affiche', rang }: BdeAnnonceCardProps) {
    const teinte = teinteDAnnonce(annonce.couleur, theme);
    return (
        <Card theme={theme} onPress={onPress} rang={rang} accessibilityLabel={`${annonce.issuer_name}. ${annonce.title}`} style={[{ width }, style]}>
            <VisuelDAnnonce annonce={annonce} cadre={cadre} largeur={width} teinte={teinte} theme={theme} />
            <PiedDAnnonce theme={theme} kicker={annonce.issuer_name} titre={annonce.title} />
        </Card>
    );
}

function VisuelDAnnonce({ annonce, cadre, largeur, teinte, theme }: {
    annonce: BdeAnnonce; cadre: CadreDAnnonce; largeur: number; teinte: string; theme: AppThemeType;
}) {
    // La largeur demandee au rendu est celle de la carte : le carrousel, la grille et une carte
    // speciale n'ont pas la meme, et chacune tombe sur son palier (visuels/rendu.ts).
    const { source, onError, onLoad } = useSourceRendue(annonce.image_url, { largeur, qualite: 70 });
    // Une carte speciale couvre toujours : « contenir » dans 160 points laisserait une vignette.
    const ajustement = cadre === 'lieu' ? 'couvrir' : annonce.ajustement;
    const provisoire = annonce.blurhash !== undefined ? { blurhash: annonce.blurhash } : undefined;

    return (
        <View style={[dimensionsDuVisuel(cadre), styles.visuel, { backgroundColor: source !== null ? theme.greyBackground : `${teinte}14` }]}>
            {source !== null ? (
                ajustement === 'couvrir' ? (
                    <Image
                        source={source}
                        contentFit="cover"
                        contentPosition={positionPourExpoImage(annonce.focale)}
                        placeholder={provisoire}
                        placeholderContentFit="cover"
                        cachePolicy="memory-disk"
                        transition={couture}
                        recyclingKey={annonce.id}
                        onLoad={onLoad}
                        onError={onError}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    <>
                        {/* La copie floutee remplit ce que le format de l'affiche laisse libre du
                            cadre ; elle porte le blurhash, qui a la meme fonction pendant l'attente.
                            Les deux images partagent la source rendue : une requete, un cache. La
                            transition et le repli vivent sur l'affiche seule — deux gestionnaires
                            d'erreur sur la meme source feraient deux replis. */}
                        <Image
                            source={source}
                            blurRadius={16}
                            contentFit="cover"
                            placeholder={provisoire}
                            placeholderContentFit="cover"
                            cachePolicy="memory-disk"
                            recyclingKey={annonce.id}
                            style={StyleSheet.absoluteFill}
                        />
                        <Image
                            source={source}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={couture}
                            recyclingKey={annonce.id}
                            onLoad={onLoad}
                            onError={onError}
                            style={StyleSheet.absoluteFill}
                        />
                    </>
                )
            ) : annonce.info_label ? (
                <View style={styles.afficheTypo}>
                    <Text numberOfLines={cadre === 'affiche' ? 5 : 3} style={[styles.accroche, { color: teinte }]}>
                        {annonce.info_label}
                    </Text>
                </View>
            ) : (
                <MaterialCommunityIcons name="party-popper" size={48} color={teinte} />
            )}
            <BadgeDeType annonce={annonce} teinte={teinte} theme={theme} />
        </View>
    );
}

/** Le badge du type, en haut a gauche du visuel : rien pour un evenement. */
function BadgeDeType({ annonce, teinte, theme }: { annonce: BdeAnnonce; teinte: string; theme: AppThemeType }) {
    const badge = typeDeBadge(annonce.type);
    if (badge === null) return null;
    const logo = annonce.partenaire?.logoUrl ?? null;
    return (
        <View style={[styles.badge, { backgroundColor: theme.cardBackground }]}>
            {logo !== null ? (
                <Image source={{ uri: logo }} contentFit="contain" cachePolicy="memory-disk" style={styles.logo} />
            ) : null}
            <Text style={[styles.libelleDuBadge, { color: teinte }]}>{Translator.get(LIBELLES_DE_BADGE[badge])}</Text>
        </View>
    );
}

/**
 * Le pied, en grammaire editoriale : l'emetteur en petites capitales grises au-dessus du titre — le
 * « kicker » des cartes d'article. La pastille d'emetteur y a vecu et a ete defaite le 2026-08-31 :
 * une capsule coloree sur chaque carte etait du bruit repete. Exporte pour le squelette, qui le rend
 * masque : sa hauteur est celle du vrai pied par construction.
 */
export function PiedDAnnonce({ theme, kicker, titre, masque = false }: {
    theme: AppThemeType; kicker: string; titre: string; masque?: boolean;
}) {
    if (masque) {
        return (
            <View style={styles.pied}>
                <TexteMasque style={styles.kicker} largeur="44%" couleur={theme.border} boite={styles.boiteDuKicker} />
                <TexteMasque style={styles.titre} largeur="78%" couleur={theme.border} />
            </View>
        );
    }
    return (
        <View style={styles.pied}>
            <Text style={[styles.kicker, styles.boiteDuKicker, { color: theme.fontSecondary }]} numberOfLines={1}>{kicker}</Text>
            <Text style={[styles.titre, { color: theme.font }]} numberOfLines={1}>{titre}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    visuel: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    // L'affiche typographique : l'accroche calee en bas, comme le titre d'une affiche.
    afficheTypo: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'flex-end',
        padding: tokens.space.md,
    },
    accroche: {
        fontSize: tokens.fontSize.lg,
        fontWeight: tokens.fontWeight.bold,
        lineHeight: 26,
    },
    // Le badge de l'apercu, sur l'echelle des tokens : un encart de la couleur de la carte, qui flotte.
    badge: {
        position: 'absolute',
        top: tokens.space.sm,
        left: tokens.space.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.xs,
        paddingVertical: tokens.space.xxs,
        paddingHorizontal: tokens.space.sm,
        borderRadius: tokens.radius.sm,
        ...tokens.shadow.md,
    },
    logo: {
        width: 16,
        height: 16,
    },
    libelleDuBadge: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
        letterSpacing: 0.7,
        textTransform: 'uppercase',
    },
    pied: {
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
    },
    kicker: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    boiteDuKicker: {
        marginBottom: tokens.space.xxs,
    },
    titre: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.bold,
    },
});

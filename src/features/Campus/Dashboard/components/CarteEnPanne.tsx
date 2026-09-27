/**
 * Ce qu'une section du tableau de bord montre quand sa source a echoue : une carte, pas une ligne.
 *
 * La panne etait un bandeau d'une ligne a la place d'un carrousel : la section passait de la hauteur
 * d'une carte a celle d'une phrase, et tout ce qui etait dessous remontait (docs/inventaire-mouvement.md,
 * section 5). **Une section garde sa hauteur quoi qu'il arrive a sa source** (docs/theme.md) : la
 * panne prend donc le gabarit de la carte qu'elle remplace, et un Reessayer qui repasse par le
 * squelette puis par les cartes ne deplace rien.
 *
 * - **La hauteur est celle de la vraie carte par construction** : le corps se pose sur le corps
 *   masque d'une carte de lieu, rendu invisible (`CorpsMasqueDeCarteLieu`). Le titre, le message et
 *   le geste tiennent dedans dans toutes les tailles de texte — deux lignes de texte et un titre
 *   restent plus courts que la charpente d'une carte, qui porte une pastille en plus.
 * - **Le visuel porte le filigrane** a six pour cent (GlypheFiligrane), la silhouette du nuage barre
 *   rognee par le coin bas droit : le geste des surfaces d'identite de la Scolarite, choisi sur la
 *   planche B du labo. Une par section : la regle du filigrane interdit la repetition dans une liste,
 *   pas une carte seule dans son carrousel.
 * - **Le geste est la carte entiere**, et son libelle s'ecrit a la place de l'etoile : Reessayer si
 *   la famille d'echec le justifie, sinon Voir tout — c'est `failures.ts` qui decide, pas ce fichier.
 *
 * **Deux gabarits**, ceux des deux cartes du tableau de bord : `lieu` pour les restaurants, les
 * bibliotheques et les salles ; `annonce` pour la section des annonces, ou la carte a le cadre 4:5
 * d'une affiche. La, le message se pose dans le visuel, et le pied porte le titre de la famille en
 * kicker et le geste en titre : le pied d'une annonce n'a que deux lignes.
 *
 * Elle vit ici et non dans `shared/ui/` : ses gabarits sont ceux des cartes de Campus, et elle n'a
 * pas d'autre usage. Elle remontera au second.
 */

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { tokens, type AppThemeType } from '../../../../shared/theme/Theme';
import Translator from '../../../../shared/i18n/Translator';
import type { UkitFailure } from '../../../../shared/aetherius';
import { Card } from '../../../../shared/ui/Card';
import { GlypheFiligrane } from '../../../../shared/ui/GlypheFiligrane';
import { dimensionsDuVisuel, PiedDAnnonce } from '../../Bde/BdeAnnonceCard';
import { CorpsMasqueDeCarteLieu } from './SqueletteDeCarrousel';
import { HAUTEUR_VISUEL_CARTE, LARGEUR_CARTE_ANNONCE, LARGEUR_CARTE_LIEU } from './gabarits';

/**
 * La taille du filigrane : celle de la planche B. Rognee par le coin, la silhouette se lit comme une
 * texture ; a la taille d'une icone, elle se lirait comme une icone de plus.
 */
const TAILLE_FILIGRANE = 150;

/** Le gabarit de la carte que la panne remplace. */
export type GabaritDePanne = 'lieu' | 'annonce';

export interface CarteEnPanneProps {
    theme: AppThemeType;
    failure: UkitFailure;
    /** Le geste de la carte : son libelle et ce qu'il fait. */
    action: { libelle: string; onPress: () => void };
    gabarit?: GabaritDePanne;
}

export function CarteEnPanne({ theme, failure, action, gabarit = 'lieu' }: CarteEnPanneProps) {
    const titre = Translator.get(failure.titleKey);
    const message = Translator.get(failure.messageKey);
    const deLieu = gabarit === 'lieu';

    return (
        <View style={styles.rangee}>
            <Card
                theme={theme}
                onPress={action.onPress}
                accessibilityLabel={`${titre}. ${message} ${action.libelle}`}
                style={{ width: deLieu ? LARGEUR_CARTE_LIEU : LARGEUR_CARTE_ANNONCE }}
            >
                {/* Les coins du haut sont ceux de la carte, qui rogne deja : le filigrane n'a pas a les suivre. */}
                <View style={[deLieu ? styles.visuelDeLieu : dimensionsDuVisuel('affiche'), { backgroundColor: theme.greyBackground }]}>
                    <GlypheFiligrane icone={{ name: 'cloud-off' }} couleur={theme.font} size={TAILLE_FILIGRANE} rayon={0} />
                    {deLieu ? null : (
                        <Text numberOfLines={4} style={[styles.messageDAffiche, { color: theme.fontSecondary }]}>{message}</Text>
                    )}
                </View>

                {deLieu ? (
                    <Gabarit sizer={<CorpsMasqueDeCarteLieu theme={theme} />} style={styles.corpsDeLieu}>
                        <View style={styles.titreRangee}>
                            <Text numberOfLines={1} style={[styles.titre, { color: theme.font }]}>{titre}</Text>
                            <Text style={[styles.action, { color: theme.primary }]}>{action.libelle}</Text>
                        </View>
                        <Text numberOfLines={2} style={[styles.message, { color: theme.fontSecondary }]}>{message}</Text>
                    </Gabarit>
                ) : (
                    <Gabarit sizer={<PiedDAnnonce theme={theme} kicker="" titre="" masque />} style={styles.piedDAnnonce}>
                        <Text numberOfLines={1} style={[styles.kicker, { color: theme.fontSecondary }]}>{titre}</Text>
                        <Text numberOfLines={1} style={[styles.titreDAnnonce, { color: theme.primary }]}>{action.libelle}</Text>
                    </Gabarit>
                )}
            </Card>
        </View>
    );
}

/**
 * Un contenu pose sur le corps masque de la vraie carte, rendu invisible : la hauteur est celle de la
 * carte remplacee par construction, dans toutes les tailles de texte.
 */
function Gabarit({ sizer, style, children }: { sizer: React.ReactNode; style: StyleProp<ViewStyle>; children: React.ReactNode }) {
    return (
        <View>
            <View style={styles.invisible} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {sizer}
            </View>
            <View style={[StyleSheet.absoluteFill, style]}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Le rembourrage du carrousel (CarrouselDeSection) : la carte se pose ou la premiere carte se pose.
    rangee: {
        flexDirection: 'row',
        paddingHorizontal: tokens.space.md,
        paddingBottom: tokens.space.lg,
    },
    visuelDeLieu: {
        width: '100%',
        height: HAUTEUR_VISUEL_CARTE,
    },
    // Le message d'une affiche en panne se cale en bas, comme l'accroche d'une affiche typographique.
    messageDAffiche: {
        position: 'absolute',
        left: tokens.space.md,
        right: tokens.space.md,
        bottom: tokens.space.md,
        fontSize: tokens.fontSize.sm,
    },
    invisible: {
        opacity: 0,
    },
    corpsDeLieu: {
        padding: tokens.space.md,
    },
    // Les mesures du titre de carte (CardTitleRow) : la panne se lit comme une carte de la rangee.
    titreRangee: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: tokens.space.xs,
    },
    titre: {
        flexShrink: 1,
        fontSize: tokens.fontSize.lg,
        fontWeight: tokens.fontWeight.bold,
    },
    action: {
        marginLeft: 'auto',
        paddingLeft: tokens.space.sm,
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
    },
    message: {
        fontSize: tokens.fontSize.sm,
    },
    // Les mesures du pied d'une annonce (PiedDAnnonce).
    piedDAnnonce: {
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
    },
    kicker: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: tokens.space.xxs,
    },
    titreDAnnonce: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.bold,
    },
});

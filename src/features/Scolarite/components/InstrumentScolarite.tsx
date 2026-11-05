/**
 * L'instrument du tableau de bord : les chiffres de l'etudiant sur une seule carte (7-J, deuxieme
 * passe).
 *
 * **Plusieurs signaux fusionnes en un instrument, des chiffres plutot que des phrases** : Moodle, la
 * messagerie et les documents, en trois colonnes. La premiere passe les posait en un heros et deux
 * tuiles, chacune sa carte, son carre de couleur et son grand glyphe en filigrane coupe dans un coin —
 * trois objets generiques la ou il y a trois nombres a lire d'un coup d'oeil (review du 2026-11-05).
 *
 * Ce qui reste des tuiles, parce que c'etait juste : **la forme vient du role, jamais de la donnee**
 * (les trois colonnes sont la chez tous les etablissements, ce qui varie est ce qu'elles disent) ; **un
 * echec tient en deux mots** a la place du chiffre, sans changer la forme, et le toucher ouvre la feuille
 * qui en dit plus ; **une lecture en cours se montre par-dessus** ce qui est affiche, sans le vider. Un
 * zero s'estompe : un chiffre qui ne demande rien ne doit pas peser autant qu'un compteur.
 *
 * La prochaine echeance de Moodle, la seule phrase de l'instrument, se pose sous les colonnes (`pied`) :
 * elle ne tient pas dans un tiers de largeur sans etre tronquee.
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon, type IconSpec } from '../../../shared/ui/Icon';
import { useEnfoncement } from '../../../shared/ui/useEnfoncement';

export interface ColonneInstrument {
    cle: string;
    icone: IconSpec;
    /** Le chiffre ; `null` quand la colonne a un mot a dire plutot qu'un nombre (porte, echec). */
    chiffre: number | null;
    /** Sous le chiffre, ou a sa place : l'unite, la phrase du zero, le nom du service, l'echec. */
    texte: string;
    /** La couleur du texte quand il porte un echec ; absente, le texte est secondaire. */
    couleurDuTexte?: string;
    /** Un service que l'etablissement ne porte pas : la colonne s'efface. */
    attenuee?: boolean;
    chargement?: boolean;
    onPress?: () => void;
    accessibilite: string;
}

function Colonne({ colonne, theme }: { colonne: ColonneInstrument; theme: AppThemeType }) {
    const enfoncement = useEnfoncement();
    const { icone, chiffre, texte, couleurDuTexte, attenuee = false, chargement = false, onPress, accessibilite } = colonne;
    const nombre = chiffre === null ? null : chiffre.toLocaleString();
    return (
        <Pressable
            style={styles.colonne}
            onPress={onPress}
            onPressIn={enfoncement.onPressIn}
            onPressOut={enfoncement.onPressOut}
            disabled={onPress === undefined}
            accessibilityRole={onPress === undefined ? undefined : 'button'}
            accessibilityLabel={accessibilite}
        >
            <Reanimated.View style={[styles.interieur, attenuee && styles.attenuee, enfoncement.style]}>
                <View style={styles.tete}>
                    <Icon icon={icone} size={20} color={couleurDuTexte ?? theme.fontSecondary} />
                    {chargement ? <ActivityIndicator size="small" color={theme.fontTertiary} /> : null}
                </View>
                {nombre !== null ? (
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[styles.chiffre, tokens.texte.chiffres, { color: chiffre === 0 ? theme.fontTertiary : theme.font }]}>
                        {nombre}
                    </Text>
                ) : null}
                <Text numberOfLines={2} style={[nombre === null ? styles.motSeul : styles.texte, { color: couleurDuTexte ?? (nombre === null ? theme.font : theme.fontSecondary) }]}>
                    {texte}
                </Text>
            </Reanimated.View>
        </Pressable>
    );
}

export function InstrumentScolarite({ theme, colonnes, pied }: { theme: AppThemeType; colonnes: readonly ColonneInstrument[]; pied?: React.ReactNode }) {
    return (
        <View style={[styles.carte, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
            <View style={styles.colonnes}>
                {colonnes.map((colonne, index) => (
                    <React.Fragment key={colonne.cle}>
                        {index > 0 ? <View style={[styles.separateur, { backgroundColor: theme.border }]} /> : null}
                        <Colonne colonne={colonne} theme={theme} />
                    </React.Fragment>
                ))}
            </View>
            {pied !== undefined && pied !== null ? (
                <View style={[styles.pied, { borderTopColor: theme.border }]}>{pied}</View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    carte: {
        marginHorizontal: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        ...tokens.shadow.sm,
    },
    colonnes: {
        flexDirection: 'row',
    },
    separateur: {
        width: StyleSheet.hairlineWidth,
        marginVertical: tokens.space.md,
    },
    colonne: {
        flex: 1,
    },
    interieur: {
        padding: tokens.space.md,
        gap: tokens.space.xs,
    },
    attenuee: {
        opacity: 0.55,
    },
    tete: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: tokens.space.xs,
    },
    chiffre: {
        fontSize: tokens.fontSize.xxl,
        fontWeight: tokens.fontWeight.bold,
        letterSpacing: -0.5,
    },
    texte: {
        fontSize: tokens.fontSize.sm,
    },
    motSeul: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    pied: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm + tokens.space.xs,
    },
});

/**
 * Le groupe de reglages et sa rangee (jalon 7-J, lot des Reglages).
 *
 * **Une pile de rangees est un groupe encadre, pas une pile de cartes** (docs/theme.md) : chaque
 * reglage etait sa propre carte, ombre comprise, et l'ecran se lisait comme une pile d'objets sans
 * rapport. Une section est desormais **une** carte ; ses rangees sont separees par un filet fin,
 * indente sous le libelle, et aucun filet ne double le bord bas.
 *
 * **L'icone au trait, neutre, sans carre** (deuxieme passe de 7-J). La premiere passe la posait,
 * blanche, dans un carre de la couleur de sa famille, comme les reglages du systeme : six couleurs
 * hors de l'identite sur un seul ecran, que la review du 2026-11-05 a jugees « prototype ». Le glyphe
 * de Lucide, dans une colonne fixe qui aligne les libelles, dit la rangee sans la colorer ; seule une
 * action qui retire quelque chose prend le rouge.
 *
 * L'intertitre s'aligne sur le texte des rangees, et la phrase qui explique un reglage vit sous son
 * groupe, en pied, comme dans les reglages du systeme.
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Interrupteur } from '../../../shared/ui/Interrupteur';
import { Icon } from '../../../shared/ui/Icon';

/** La colonne de l'icone : sa largeur aligne les libelles d'une rangee a l'autre. */
const COLONNE = 24;
/** Le retrait du filet : il part sous le libelle, apres la colonne de l'icone. */
const RETRAIT = tokens.space.md + COLONNE + tokens.space.md;

type IconeMCI = keyof typeof MaterialCommunityIcons.glyphMap;
type IconeMI = keyof typeof MaterialIcons.glyphMap;

export interface GroupeDeReglagesProps {
    theme: AppThemeType;
    titre?: string;
    /** La phrase qui explique le groupe, posee dessous. */
    pied?: string;
    children: React.ReactNode;
}

export function GroupeDeReglages({ theme, titre, pied, children }: GroupeDeReglagesProps) {
    const rangees = React.Children.toArray(children).filter(Boolean);
    if (rangees.length === 0) return null;
    return (
        <View style={styles.groupe}>
            {titre !== undefined ? <Text style={[styles.titre, { color: theme.fontSecondary }]}>{titre}</Text> : null}
            <View style={[styles.carte, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
                {rangees.map((rangee, index) => (
                    <View key={index}>
                        {rangee}
                        {index < rangees.length - 1 ? (
                            <View style={[styles.filet, { backgroundColor: theme.border }]} />
                        ) : null}
                    </View>
                ))}
            </View>
            {pied !== undefined ? <Text style={[styles.pied, { color: theme.fontSecondary }]}>{pied}</Text> : null}
        </View>
    );
}

export interface RangeeDeReglageProps {
    theme: AppThemeType;
    /** L'icone, d'une famille ou de l'autre : MaterialIcons pour les glyphes qui n'existent que la. */
    icone: IconeMCI | { mi: IconeMI };
    libelle: string;
    /** La valeur a droite ; elle cede avant le libelle. */
    valeur?: string;
    onPress?: () => void;
    interrupteur?: { valeur: boolean; onChange: (valeur: boolean) => void };
    /** Une action en cours : l'indicateur prend la place de l'icone, au meme gabarit. */
    enCours?: boolean;
    desactivee?: boolean;
    /** Une action qui retire quelque chose : son libelle en rouge, sans chevron. */
    destructive?: boolean;
}

function IconeDeRangee({ icone, enCours, destructive, theme }: Pick<RangeeDeReglageProps, 'icone' | 'enCours' | 'destructive' | 'theme'>) {
    const couleur = destructive ? theme.danger : theme.fontSecondary;
    return (
        <View style={styles.colonneIcone}>
            {enCours ? (
                <ActivityIndicator size="small" color={theme.fontSecondary} />
            ) : typeof icone === 'string' ? (
                <Icon icon={{ name: icone }} size={22} color={couleur} />
            ) : (
                <Icon icon={{ family: 'material', name: icone.mi }} size={22} color={couleur} />
            )}
        </View>
    );
}

export function RangeeDeReglage({ theme, icone, libelle, valeur, onPress, interrupteur, enCours = false, desactivee = false, destructive = false }: RangeeDeReglageProps) {
    const aInterrupteur = interrupteur !== undefined;
    return (
        <Pressable
            // Une rangee a interrupteur ne se touche pas elle-meme : l'interrupteur s'actionne par son
            // propre appui, qui porte le retour haptique et l'annonce aux lecteurs d'ecran.
            onPress={aInterrupteur ? undefined : onPress}
            disabled={desactivee || aInterrupteur || onPress === undefined}
            accessibilityRole={aInterrupteur ? undefined : 'button'}
            accessibilityState={aInterrupteur ? undefined : { disabled: desactivee }}
            style={({ pressed }) => [
                styles.rangee,
                pressed && !aInterrupteur ? { backgroundColor: theme.selection } : null,
                desactivee && styles.desactivee,
            ]}
        >
            <IconeDeRangee icone={icone} enCours={enCours} destructive={destructive} theme={theme} />
            {/*
              * Face a une valeur texte, le libelle ne cede jamais : une valeur longue ecrasait
              * « Institution » jusqu'a une lettre par ligne. Face a un interrupteur, il prend l'espace
              * restant et se plie : l'interrupteur a une largeur fixe et ne doit pas sortir de la carte.
              */}
            <Text
                style={[
                    styles.libelle,
                    { color: destructive ? theme.danger : theme.font },
                    aInterrupteur ? styles.libelleExtensible : styles.libelleFixe,
                ]}
            >
                {libelle}
            </Text>
            {aInterrupteur ? (
                <Interrupteur
                    theme={theme.settings}
                    valeur={interrupteur.valeur}
                    onChange={interrupteur.onChange}
                    accessibilityLabel={libelle}
                    style={styles.interrupteur}
                />
            ) : (
                <>
                    {valeur !== undefined ? (
                        <Text numberOfLines={1} style={[styles.valeur, { color: theme.fontSecondary }]}>{valeur}</Text>
                    ) : <View style={styles.vide} />}
                    {!destructive && onPress !== undefined ? (
                        <Icon icon={{ name: 'chevron-right' }} size={20} color={theme.fontTertiary} />
                    ) : null}
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    groupe: {
        marginTop: tokens.space.lg,
    },
    titre: {
        marginLeft: tokens.space.xl,
        marginBottom: tokens.space.sm,
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    carte: {
        marginHorizontal: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        ...tokens.shadow.sm,
    },
    filet: {
        height: StyleSheet.hairlineWidth,
        marginLeft: RETRAIT,
    },
    pied: {
        marginHorizontal: tokens.space.xl,
        marginTop: tokens.space.sm,
        fontSize: tokens.fontSize.xs,
        lineHeight: 17,
    },
    rangee: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        gap: tokens.space.md,
    },
    desactivee: {
        opacity: 0.5,
    },
    colonneIcone: {
        width: COLONNE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    libelle: {
        fontSize: tokens.fontSize.md,
    },
    libelleFixe: {
        flexShrink: 0,
    },
    libelleExtensible: {
        flex: 1,
    },
    valeur: {
        flexShrink: 1,
        marginLeft: 'auto',
        textAlign: 'right',
        fontSize: tokens.fontSize.md,
    },
    vide: {
        flex: 1,
    },
    interrupteur: {
        marginLeft: 'auto',
    },
});

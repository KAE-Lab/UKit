/**
 * Le vocabulaire de rangees de l'onglet Scolarite : un groupe encadre, et les lignes qu'il porte.
 *
 * **Extrait, pas dessine.** Le motif existait deja trois fois, a l'identique — la rangee de
 * messagerie du tableau de bord, et les deux `SectionCard` de l'ecran du compte : meme rayon `lg`,
 * meme filet de 1, meme rembourrage `md`, meme couple titre `fontSize.md` semi-gras / sous-titre
 * `fontSize.sm` secondaire. Ce fichier leur donne un seul nom.
 *
 * Il reste **dans la feature** et ne monte pas dans `shared/ui/` : le socle n'a aucune raison de
 * connaitre la scolarite, et la regle du depot est qu'un composant de domaine reste chez lui
 * (docs/theme.md, « les decisions durables »).
 *
 * Deux details qui ne se devinent pas a la relecture :
 *
 *   - **le filet separe, il n'encadre pas.** Une pile de rangees chacune encadree se lit comme une
 *     pile d'objets sans rapport ; un groupe encadre dont les lignes sont separees par un filet fin
 *     se lit comme une liste. C'est le rendu que l'ecran du compte emploie deja ;
 *   - **la surface d'icone est un carre arrondi** (`radius.md`, 40 points), jamais un disque. C'est
 *     la signature de forme de l'application, et la regle ESLint ne la voit pas
 *     (docs/theme.md, « les surfaces de UKit sont des carres arrondis »).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon, type IconSpec } from '../../../shared/ui/Icon';
import { TexteMasque } from '../../../shared/ui/TexteMasque';

export interface GroupeScolariteProps {
    theme: AppThemeType;
    children: React.ReactNode;
}

/**
 * Le conteneur d'une pile de rangees.
 *
 * Il pose le filet **entre** les enfants et non autour de chacun : `React.Children.toArray` sert a
 * savoir lequel est le dernier, seul moyen de ne pas poser un filet sous la derniere ligne — un
 * filet terminal double le bord du groupe et se voit.
 */
export function GroupeScolarite({ theme, children }: GroupeScolariteProps) {
    const lignes = React.Children.toArray(children).filter(Boolean);

    return (
        <View style={[styles.groupe, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            {lignes.map((ligne, index) => (
                <View key={index}>
                    {ligne}
                    {index < lignes.length - 1 ? (
                        <View style={[styles.filet, { backgroundColor: theme.border }]} />
                    ) : null}
                </View>
            ))}
        </View>
    );
}

export interface LigneScolariteProps {
    theme: AppThemeType;
    icon: IconSpec;
    /** La teinte de l'icone et de sa surface. Un ton semantique passe par `toneColor` chez l'appelant. */
    teinte: string;
    titre: string;
    sousTitre?: string | null;
    /** Ce qui s'affiche a droite : un compteur, une attente. Le chevron, lui, a sa propre prop. */
    droite?: React.ReactNode;
    /**
     * Le chevron de fin de rangee.
     *
     * Une prop plutot qu'un `droite` que chaque appelant composerait : toutes les rangees qui menent
     * quelque part doivent porter le meme, au meme endroit. Le laisser a l'appelant, c'est se
     * retrouver avec trois tailles de chevron dans une meme pile — le defaut exact que le jalon 6-K
     * a trouve sur les etats vides du Planning.
     */
    chevron?: boolean;
    onPress?: () => void;
    /** Le titre en gris : une rangee qui porte un echec ne crie pas, elle s'efface. */
    attenue?: boolean;
    /**
     * Le masque du teaser : l'icone devient un cadenas, et les deux textes **ne sont pas rendus** —
     * une barre prend la boite de chacun.
     *
     * C'est la troisieme tentative, et la seule qui tienne sur les deux plateformes. Le flou natif
     * d'`expo-blur` n'existe pas sur Android au SDK 57 sans cible (`blurTarget`), et sur iOS il
     * laissait lire le texte a toutes les intensites essayees ; baisser l'opacite du contenu donne
     * du gris pale qui se lit encore. Ici il n'y a plus rien a lire : la couleur du texte est
     * `transparent`. La boite du `Text`, elle, se pose normalement — la rangee garde donc exactement
     * la hauteur, les alignements et le rythme des rangees voisines, ce qu'un aplat opaque perdrait.
     */
    masque?: boolean;
}

// Deux longueurs differentes, comme deux vraies lignes de texte — une paire de barres egales se lit
// comme un gabarit de chargement, pas comme du contenu tenu au secret.
const LARGEUR_BARRE_TITRE = '62%';
const LARGEUR_BARRE_SOUS_TITRE = '84%';

export function LigneScolarite({
    theme, icon, teinte, titre, sousTitre, droite, onPress, attenue = false, chevron = false, masque = false,
}: LigneScolariteProps) {
    const contenu = (
        <View style={styles.ligne}>
            {/* `1A` = 10 % d'opacite. Volontairement pas `theme.*Soft` : la teinte vient de
                l'appelant et peut etre une couleur de section, que le theme ne decline pas. */}
            {/* Sous masque, la surface garde sa teinte — c'est le rythme de couleur de la pile, et
                l'effacer rendrait la rangee grise — mais le glyphe du service cede la place au
                cadenas : « pas encore ouvert » plutot que « voici ce que c'est ». */}
            <View style={[styles.surfaceIcone, { backgroundColor: `${teinte}1A` }]}>
                <Icon
                    icon={masque ? { family: 'material', name: 'lock' } : icon}
                    size={22}
                    color={masque ? theme.fontSecondary : teinte}
                />
            </View>

            <View style={styles.textes}>
                {/* Sous masque, le texte tient toujours sa place mais n'apparait pas, et la barre
                    posee par-dessus sa boite dit qu'il y a bien quelque chose la. Le titre garde
                    `numberOfLines={2}` : masquer ne doit pas changer la hauteur de la rangee. */}
                {masque ? <TexteMasque style={styles.titre} largeur={LARGEUR_BARRE_TITRE} couleur={theme.border} /> : (
                    <Text
                        style={[styles.titre, { color: attenue ? theme.fontSecondary : theme.font }]}
                        numberOfLines={2}
                    >
                        {titre}
                    </Text>
                )}
                {sousTitre === null || sousTitre === undefined ? null : (masque
                    ? <TexteMasque style={styles.sousTitre} largeur={LARGEUR_BARRE_SOUS_TITRE} couleur={theme.border} />
                    : (
                        <Text style={[styles.sousTitre, { color: theme.fontSecondary }]} numberOfLines={1}>
                            {sousTitre}
                        </Text>
                    ))}
            </View>

            {droite}
            {chevron ? (
                <Icon icon={{ family: 'material', name: 'chevron-right' }} size={24} color={theme.fontSecondary} />
            ) : null}
        </View>
    );

    if (onPress === undefined) return contenu;
    return (
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
            {contenu}
        </TouchableOpacity>
    );
}

/** Le compteur de la rangee de messagerie : le seul endroit de l'onglet ou une pilule est legitime. */
export function CompteurScolarite({ valeur, teinte, theme }: {
    valeur: number; teinte: string; theme: AppThemeType;
}) {
    return (
        <View style={[styles.compteur, { backgroundColor: teinte }]}>
            <Text style={[styles.compteurTexte, { color: theme.lightFont }]}>{valeur}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    groupe: {
        marginHorizontal: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        // La meme ombre douce que les tuiles et que les cartes du reste de l'application : sur un fond
        // gris clair, un aplat blanc a filet fin se lit comme un gabarit plutot que comme un objet.
        ...tokens.shadow.sm,
    },
    filet: {
        height: StyleSheet.hairlineWidth,
        marginLeft: tokens.space.md + 40 + tokens.space.md,
    },
    ligne: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: tokens.space.md,
        paddingHorizontal: tokens.space.md,
        gap: tokens.space.md,
    },
    surfaceIcone: {
        width: 40,
        height: 40,
        borderRadius: tokens.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textes: {
        flex: 1,
        gap: tokens.space.xxs,
    },
    titre: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    sousTitre: {
        fontSize: tokens.fontSize.sm,
    },
    compteur: {
        borderRadius: tokens.radius.pill,
        paddingHorizontal: tokens.space.sm,
        paddingVertical: tokens.space.xxs,
        minWidth: 24,
        alignItems: 'center',
    },
    compteurTexte: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.bold,
    },
});

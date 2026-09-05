/**
 * La tuile : le pendant carre de `LigneScolarite`, et la moitie « flux » de la grille.
 *
 * Elle ne sait rien des widgets ni des Blueprints — elle recoit un chiffre, un libelle, une ligne de
 * contexte. C'est ce qui lui permet de porter aussi bien un compteur de messages qu'un nombre de
 * documents ranges sur l'appareil, sans que la machinerie de widgets ait a connaitre le second.
 *
 * **Ce qu'une tuile fait qu'une rangee ne fait pas** : elle separe le chiffre du mot qui le qualifie.
 * On vient chercher un nombre dans un carre, pas une phrase — d'ou le grand `3` et le « non lus »
 * dessous, la ou la rangee ecrit « 3 messages non lus ».
 *
 * **Elle porte un chevron**, et c'est un revirement du 2026-08-29. On avait juge qu'un chevron dans un
 * carre etait un ornement de liste egare, la tuile entiere etant la cible. L'appareil a tranche
 * autrement : posees au-dessus de trois rangees qui, elles, en portent un, les tuiles ne se lisaient
 * plus comme cliquables — et leur coin haut paraissait vide. Un signe partage vaut mieux qu'une
 * regle de purete que l'utilisateur doit deviner.
 *
 * **Deux dispositions, et la grande n'est pas une petite etiree.**
 *
 *   - la **petite** empile : icone en haut, la valeur au milieu, contexte en bas. Le chiffre et son
 *     unite partagent **une ligne de base** — « 790 non lus » — comme dans la grande : empiles, le
 *     retour a la ligne creusait la tuile et la faisait paraitre a moitie vide (2026-08-30) ;
 *   - la **grande** aligne : icone a gauche, puis le chiffre a cote de son libelle, puis le contexte
 *     dessous. Elle gagne une ligne pleine pour nommer une echeance — « Devoir de calcul — jeudi »
 *     n'entre pas dans une demi-largeur sans etre tronque.
 *
 * La grande **ne repartit pas sur la hauteur**, et c'est deliberé : avec un espacement force, une
 * carte pleine largeur sans donnee — « Rien a rendre », le cas de presque toute l'annee — devenait
 * une grande boite a moitie vide qui se lisait comme un gabarit inacheve. Alignee, elle est dense
 * qu'elle porte un chiffre ou non.
 *
 * La surface d'icone est un **carre arrondi**, jamais un disque : signature de forme de
 * l'application, que la regle ESLint ne voit pas (docs/theme.md).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { GlypheFiligrane } from '../../../shared/ui/GlypheFiligrane';
import { Icon, type IconSpec } from '../../../shared/ui/Icon';
import { ApparitionEnFondu } from '../../../shared/ui/ApparitionEnFondu';

export interface TuileScolariteProps {
    theme: AppThemeType;
    teinte: string;
    icone: IconSpec;
    /** Le chiffre mis en avant, ou `null` quand la tuile a une phrase a dire plutot qu'un nombre. */
    nombre?: number | null;
    /** Ce qui s'ecrit sous le chiffre — ou a sa place, quand il n'y en a pas. */
    libelle: string;
    /**
     * La ligne du bas.
     *
     * Attendue des qu'une tuile porte une valeur, et c'est une contrainte de mise en page autant que
     * de contenu : la tuile repartit trois blocs sur sa hauteur, et s'il n'y en avait que deux le
     * libelle tomberait au ras du bas — deux tuiles voisines n'auraient plus le meme rythme.
     *
     * **Une seule exception : la tuile en echec**, qui ne dit que deux mots. Sans contexte, le milieu
     * centre le libelle et la hauteur ne bouge pas (`minHeight`, et la rangee etire ses enfants) —
     * la grille garde sa forme quoi qu'il arrive a une source (docs/theme.md, decisions durables).
     */
    contexte?: string | null;
    /** Une lecture est en cours **par-dessus** ce qui est affiche : indicateur, sans vider la tuile. */
    chargement?: boolean;
    /**
     * Ce qui identifie la valeur affichee : elle reapparait en fondu quand cette cle change.
     *
     * Elle vient de l'appelant parce que lui seul sait ce qui compte comme un changement — la
     * **nature** de l'etat, pas le nombre : une messagerie qui passe de 3 a 4 messages non lus n'est
     * pas une arrivee, c'est une mise a jour.
     */
    cleDeFondu?: string;
    /** Le libelle en gris : la tuile n'a rien a promettre aujourd'hui. */
    attenue?: boolean;
    /** Pleine largeur, chiffre a cote du libelle, contexte sur sa propre ligne. */
    large?: boolean;
    /**
     * La silhouette du service en filigrane — l'enveloppe de la messagerie, le dossier des
     * documents, le livre du heros Moodle — rognee au milieu du bord droit. Le geste et ses regles
     * vivent dans `shared/ui/GlypheFiligrane`.
     */
    glypheDeFond?: IconSpec;
    onPress?: () => void;
}

/** La ligne du bas, ou rien : une tuile en echec n'en a pas (voir `contexte`). */
function ContexteDeTuile({ contexte, theme }: { contexte: string | null | undefined; theme: AppThemeType }) {
    if (contexte === undefined || contexte === null || contexte === '') return null;
    return (
        <Text style={[styles.contexte, { color: theme.fontSecondary }]} numberOfLines={1}>
            {contexte}
        </Text>
    );
}

export function TuileScolarite({
    theme, teinte, icone, nombre = null, libelle, contexte,
    chargement = false, attenue = false, large = false, glypheDeFond, onPress, cleDeFondu,
}: TuileScolariteProps) {
    const couleurTexte = attenue ? theme.fontSecondary : theme.font;

    /* `1A` = 10 % d'opacite, comme la rangee : la teinte vient de l'appelant et peut etre une couleur
       de section, que le theme ne decline pas. */
    const surface = (
        <View style={[styles.surfaceIcone, { backgroundColor: `${teinte}1A` }]}>
            <Icon icon={icone} size={22} color={teinte} />
        </View>
    );
    // Le chevron cede la place a l'indicateur pendant une lecture : les deux occupent le meme coin,
    // et deux signes au meme endroit se disputeraient la lecture.
    const coin = chargement
        ? <ActivityIndicator size="small" color={teinte} />
        : <Icon icon={{ family: 'material', name: 'chevron-right' }} size={24} color={theme.fontSecondary} />;

    /*
     * La valeur arrive **en fondu**, et seulement quand elle change de nature — l'attente qui devient
     * un compte, un compte qui devient un echec. La cle porte cette nature : sans elle, chaque
     * relecture qui rend la meme chose rejouerait l'animation, et une tuile qui se rafraichit toutes
     * les vingt minutes clignoterait pour rien. Le reste de la tuile — surface, icone, filigrane — ne
     * bouge pas : c'est la valeur qui arrive, pas la carte.
     */
    const valeur = (
        // La ligne de base est partagee des qu'il y a un chiffre, petite tuile comprise : voir
        // l'en-tete. Sans chiffre, la phrase occupe la place seule.
        <ApparitionEnFondu key={cleDeFondu} style={nombre !== null || large ? styles.valeurLarge : null}>
            {nombre !== null ? (
                <Text style={[styles.nombre, { color: couleurTexte }]} numberOfLines={1}>{nombre}</Text>
            ) : null}
            <Text
                style={[
                    nombre !== null ? styles.unite : styles.libelle,
                    { color: couleurTexte },
                ]}
                numberOfLines={2}
            >
                {libelle}
            </Text>
        </ApparitionEnFondu>
    );
    const bas = <ContexteDeTuile contexte={contexte} theme={theme} />;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[
                styles.tuile,
                large ? styles.large : styles.petite,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
            ]}
        >
            {/*
              * Deux dispositions ecrites separement plutot qu'une seule pleine de conditions : elles
              * ne placent pas les memes elements aux memes endroits — le chevron est en haut a droite
              * dans l'une, en bout de ligne dans l'autre, exactement comme sur une rangee — et les
              * fondre rendait le rendu illisible pour un gain nul.
              */}
            {/* Rendu en premier, il passe sous tout le contenu (shared/ui/GlypheFiligrane). Le heros
                est une carte courte : son glyphe est reduit pour que la silhouette rognee par le bas
                reste devinable — au meme coin que ses voisines, la coherence prime. */}
            {glypheDeFond !== undefined ? (
                <GlypheFiligrane icone={glypheDeFond} couleur={couleurTexte} size={large ? 64 : 88} />
            ) : null}
            {large ? (
                <>
                    {surface}
                    <View style={styles.textesLarge}>
                        {valeur}
                        {bas}
                    </View>
                    {coin}
                </>
            ) : (
                <>
                    <View style={styles.entete}>
                        {surface}
                        {coin}
                    </View>
                    {/* Le milieu s'etire et centre la valeur : une tuile sans chiffre — « Aucun
                        message non lu » — posait tout son texte au ras du bas et laissait un trou
                        entre l'icone et lui. Centre, l'espace libre se repartit des deux cotes et la
                        phrase habite le carre. Le contexte, lui, reste colle en bas : c'est ce qui
                        aligne deux tuiles voisines. */}
                    <View style={styles.milieu}>
                        {valeur}
                    </View>
                    {bas}
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    tuile: {
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
        padding: tokens.space.md,
        // La meme ombre douce que les cartes du reste de l'application (`shared/ui/Card`, Planning) :
        // sur un fond gris clair, un aplat blanc a filet fin se lit comme un gabarit, pas comme un
        // objet. Elle n'invente rien — elle aligne cet ecran sur les autres.
        ...tokens.shadow.sm,
    },
    petite: {
        // `flex: 1` et non une largeur : les deux tuiles se partagent la ligne quel que soit
        // l'appareil, et la grille n'a aucune valeur de largeur ecrite en dur.
        flex: 1,
        // 120 et non 150 : la valeur tient sur une ligne depuis qu'elle partage sa ligne de base, et
        // la hauteur d'avant, calibree pour un chiffre empile, laissait un vide. Deux voisines
        // restent alignees par la rangee, qui etire ses enfants a la plus haute.
        minHeight: 120,
    },
    large: {
        // Alignee, pas repartie : voir l'en-tete du fichier. Aucune hauteur minimale — c'est le
        // contenu qui decide, donc une carte sans donnee reste dense.
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.md,
    },
    milieu: {
        // C'est lui qui absorbe la hauteur libre de la tuile, en la repartissant autour de la valeur.
        flex: 1,
        justifyContent: 'center',
        paddingVertical: tokens.space.xs,
    },
    entete: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textesLarge: {
        flex: 1,
        gap: tokens.space.xxs,
    },
    surfaceIcone: {
        width: 40,
        height: 40,
        borderRadius: tokens.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    valeurLarge: {
        flexDirection: 'row',
        // `baseline` et non `center` : le chiffre et son unite doivent poser sur la meme ligne d'ecriture,
        // sans quoi le mot flotte au milieu du nombre.
        alignItems: 'baseline',
        gap: tokens.space.sm,
    },
    nombre: {
        fontSize: tokens.fontSize.xxl,
        fontWeight: tokens.fontWeight.bold,
    },
    unite: {
        // La difference de taille avec le chiffre porte la hierarchie sur la ligne partagee ; elle
        // se retrecit si la place manque, jamais le chiffre.
        fontSize: tokens.fontSize.lg,
        fontWeight: tokens.fontWeight.semibold,
        flexShrink: 1,
    },
    libelle: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    contexte: {
        fontSize: tokens.fontSize.xs,
    },
});

export default TuileScolarite;

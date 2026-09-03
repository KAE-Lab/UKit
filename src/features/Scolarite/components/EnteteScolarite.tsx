/**
 * L'en-tete de l'onglet Scolarite : le titre, l'accueil, et le contexte.
 *
 * ## Il est collant, et il s'assume comme tel
 *
 * Il a d'abord glisse sous le contenu en s'effacant au defilement, et ca ne pouvait pas marcher ici :
 * *la page est trop courte pour offrir assez de course*. Le titre et la salutation restaient a moitie
 * effaces, l'un par-dessus l'autre, et aucun reglage d'interpolation ne rattrape ca — c'etait la
 * disposition qu'il fallait changer, pas la courbe.
 *
 * Il occupe donc une vraie place, comme celui du Planning, **et il en prend l'habillage** : fond
 * `cardBackground`, filet bas, ombre douce. Transparent, il laissait voir le contenu passer derriere
 * la date et se couper net sur le bord haut de la vue defilante — on lisait un contenu tronque
 * plutot qu'un contenu qui glisse sous une barre.
 *
 * ## Ce qui le remplit
 *
 * **Le titre reste « Scolarite »**, comme chaque onglet porte son nom. La salutation a ete le titre
 * le temps d'un essai (2026-08-30), defait le jour meme — un titre au contenu variable casse sa
 * ligne au premier prenom compose (voir GreetingBlock).
 *
 * **Le logo de l'etablissement, en filigrane a droite.** Aucun autre grand titre de section n'en
 * porte — ni Planning, ni Campus, ni Reglages —, et c'est une **exception assumee pour cet onglet**,
 * decidee apres l'avoir essaye aux deux endroits. Elle se defend : Scolarite est le seul onglet dont
 * tout le contenu appartient a un etablissement, et c'est donc le seul ou le nommer en tete a un
 * sens. Le filigrane est **monochrome et sans fond** (LogoEtablissement) — la vignette sur carre
 * blanc flottait en theme sombre et restait trop petite, calee sur la seule ligne du titre ; aligne
 * sur la salutation, le logo peut etre plus grand et accompagne la ligne personnalisee.
 *
 * **La fraicheur n'y est plus** (2026-08-30) : elle qualifiait le cache des widgets, pas la page, et
 * vit desormais a droite de l'intertitre « En un coup d'oeil » (GrilleScolarite) — au ras de ce
 * qu'elle mesure. C'est aussi ce qui l'empeche de faire jurisprudence : aucun autre onglet n'a de
 * cache a peremption, donc aucun autre n'aura la pastille.
 *
 * **Sans logo publie, rien ne se pose a cote du titre** : la pastille de nom prend le relais sur la
 * ligne de contexte. Un pictogramme generique a cote d'un grand titre serait de l'ornement, pas de
 * l'information — et l'alternative n'est jamais un trou, le nom dit la meme chose en toutes lettres.
 *
 * Le logo de Bordeaux porte « Universite de Bordeaux » la ou l'application dit « College ST » : c'est
 * un englobant, pas une contradiction — le college en fait partie, et c'est ce logo-la que
 * l'etablissement publie.
 *
 * `Badge` et non une pastille maison : le vocabulaire existe (`shared/ui/Badge`), et le releve visuel
 * du jalon 6-K l'a justement extrait de huit copies qui avaient commence a diverger.
 *
 * Sorti de l'ecran pour le garder sous la limite de lignes, comme `PageScolarite` avant lui.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { PastilleService } from '../../../shared/messages/PastilleService';
import { Badge } from '../../../shared/ui/Badge';
import { getEtablissementActif, nomCourtEtablissement } from '../../../shared/etablissements';
import type { ScolariteColdData } from '../services/ScolariteMapping';
import GreetingBlock from './GreetingBlock';
import { LogoEtablissement } from './LogoEtablissement';

export interface EnteteScolariteProps {
    theme: AppThemeType;
    teinte: string;
    insets: EdgeInsets | null;
    coldData: ScolariteColdData | null;
}

export function EnteteScolarite({ theme, teinte, insets, coldData }: EnteteScolariteProps) {
    const logo = getEtablissementActif().logo;

    return (
        <View
            style={[
                styles.conteneur,
                {
                    paddingTop: insets?.top ?? 0,
                    backgroundColor: theme.cardBackground,
                    borderBottomColor: theme.border,
                },
            ]}
        >
            {/*
              * Le titre reste « Scolarite » : la salutation a ete le titre le temps d'un essai
              * (2026-08-30), et il a ete defait le jour meme — un titre au contenu variable casse sa
              * ligne au premier prenom compose, et la page devenait la seule a ne pas porter son nom.
              *
              * Le filigrane s'aligne sur **la salutation**, pas sur le bloc entier : centre sur tout
              * l'en-tete, il ne repondait ni au titre ni a l'accueil — un entre-deux qui se lisait
              * comme une indecision. Ancre a la ligne personnalisee, il l'accompagne ; le titre garde
              * toute sa largeur au-dessus. Sans dossier lu, il se pose sur la ligne du titre.
              */}
            {coldData !== null ? (
                <>
                    <View style={styles.rangeeDuTitre}>
                        <Text style={[styles.titre, styles.colonne, { color: theme.font }]} numberOfLines={1}>
                            {Translator.get('SCOLARITY')}
                        </Text>
                        <PastilleService theme={theme} />
                    </View>
                    <View style={styles.corpsEntete}>
                        <View style={styles.colonne}>
                            <GreetingBlock coldData={coldData} color={teinte} theme={theme} />
                        </View>
                        {logo !== null ? (
                            <LogoEtablissement logo={logo} theme={theme} teinte={teinte} filigrane style={styles.filigrane} />
                        ) : null}
                    </View>
                </>
            ) : (
                <View style={styles.corpsEntete}>
                    <Text style={[styles.titre, styles.colonne, { color: theme.font }]} numberOfLines={1}>
                        {Translator.get('SCOLARITY')}
                    </Text>
                    {/* La pastille d'etat de service, entre le titre et le filigrane. */}
                    <PastilleService theme={theme} />
                    {logo !== null ? (
                        <LogoEtablissement logo={logo} theme={theme} teinte={teinte} filigrane style={styles.filigrane} />
                    ) : null}
                </View>
            )}

            {/*
              * Sans logo publie, la pastille de nom prend le relais : l'alternative n'est jamais un
              * trou, le nom dit la meme chose en toutes lettres. La fraicheur, elle, est partie
              * qualifier ce qu'elle mesure : l'intertitre des widgets (GrilleScolarite).
              */}
            {logo === null ? (
                <View style={styles.contexte}>
                    <Badge label={nomCourtEtablissement()} theme={theme} icon={{ name: 'school-outline' }} />
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    conteneur: {
        // Pas de `position: absolute` : le bloc occupe une vraie place et le contenu commence dessous.
        // C'est ce qui le rend collant.
        paddingHorizontal: tokens.space.md,
        paddingBottom: tokens.space.md,
        // Le filet et l'ombre du meme vocabulaire que l'en-tete du Planning : ils separent le bloc du
        // contenu qui defile dessous, ce qu'un fond seul ne fait pas sur un theme sombre.
        borderBottomWidth: 1,
        ...tokens.shadow.sm,
    },
    // La ligne du titre quand la salutation est en dessous : le titre prend la largeur, la pastille
    // du rappel d'incident se pose a droite.
    rangeeDuTitre: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.md,
    },
    corpsEntete: {
        flexDirection: 'row',
        // `flex-end` et non `center` : centre, le logo depassait du haut de la salutation — il se
        // pose desormais sur le bas de la ligne, comme un texte sur sa ligne d'ecriture.
        alignItems: 'flex-end',
        gap: tokens.space.md,
    },
    colonne: {
        // Elle prend ce qui reste et pousse le filigrane a droite : c'est le texte qui se
        // tronquerait, jamais le logo qui sortirait de l'ecran.
        flex: 1,
    },
    filigrane: {
        // Pose sur le bas de la ligne salutation + date par le `flex-end` du parent ; l'ecart leve
        // le logo du ras exact du texte, qui se lisait comme une collision.
        marginBottom: tokens.space.xxs,
    },
    titre: {
        fontSize: tokens.fontSize.title,
        fontWeight: tokens.fontWeight.bold,
    },
    contexte: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: tokens.space.md,
        gap: tokens.space.sm,
        // Deux pastilles peuvent cohabiter chez un etablissement sans logo : elles passent a la ligne
        // plutot que de deborder.
        flexWrap: 'wrap',
    },
});

export default EnteteScolarite;

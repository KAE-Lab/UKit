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
 * **Le logo de l'etablissement, a droite du titre.** Aucun autre grand titre de section n'en porte —
 * ni Planning, ni Campus, ni Reglages —, et c'est une **exception assumee pour cet onglet**, decidee
 * apres l'avoir essaye aux deux endroits. Elle se defend : Scolarite est le seul onglet dont tout le
 * contenu appartient a un etablissement, et c'est donc le seul ou le nommer en tete a un sens.
 *
 * **La fraicheur, sous l'accueil.** Quand les services ont ete relus. Elle rend visible le cache des
 * widgets, qui est sinon une plomberie invisible : une valeur affichee sans date ne dit pas si elle
 * est d'il y a deux minutes ou d'hier soir. Elle n'apparait qu'une fois quelque chose lu.
 *
 * Les deux ensemble comblaient chacun un manque different — le logo la largeur a cote du titre, la
 * pastille la hauteur sous l'accueil — et les tenir tous les deux garde le meilleur des deux essais.
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
import moment from 'moment';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { Badge } from '../../../shared/ui/Badge';
import { getEtablissementActif, nomCourtEtablissement } from '../../../shared/etablissements';
import type { ScolariteColdData } from '../services/ScolariteMapping';
import type { ValeursWidgets } from '../widgets/runner';
import GreetingBlock from './GreetingBlock';
import { LogoEtablissement } from './LogoEtablissement';

/**
 * Quand les services ont ete relus pour la derniere fois, ou `null` si rien ne l'a jamais ete.
 *
 * **La plus recente des lectures**, et non la plus ancienne : la pastille repond a « ca date de
 * quand ? », pas a « qu'est-ce qui traine ? ». Chaque widget a sa propre peremption, donc la plus
 * ancienne serait toujours celle du widget au rythme le plus lent — elle dirait « il y a six heures »
 * sur une page dont la boite vient d'etre relue.
 */
function derniereLecture(valeurs: ValeursWidgets): string | null {
    let plusRecente: number | null = null;
    for (const valeur of Object.values(valeurs)) {
        const lu = Date.parse(valeur.luLe);
        if (Number.isFinite(lu) && (plusRecente === null || lu > plusRecente)) plusRecente = lu;
    }
    return plusRecente === null ? null : moment(plusRecente).fromNow();
}

export interface EnteteScolariteProps {
    theme: AppThemeType;
    teinte: string;
    insets: EdgeInsets | null;
    coldData: ScolariteColdData | null;
    valeurs: ValeursWidgets;
}

export function EnteteScolarite({ theme, teinte, insets, coldData, valeurs }: EnteteScolariteProps) {
    const fraicheur = derniereLecture(valeurs);
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
            <View style={styles.rangeeDuTitre}>
                <Text style={[styles.titre, { color: theme.font }]} numberOfLines={1}>
                    {Translator.get('SCOLARITY')}
                </Text>
                {/*
                  * Rien ne se pose ici sans logo publie : un pictogramme generique a cote d'un grand
                  * titre serait de l'ornement. C'est la pastille de nom, plus bas, qui prend le relais.
                  */}
                {logo !== null ? (
                    <LogoEtablissement logo={logo} theme={theme} teinte={teinte} compact />
                ) : null}
            </View>

            {coldData !== null ? (
                <GreetingBlock coldData={coldData} color={teinte} theme={theme} />
            ) : null}

            {fraicheur !== null || logo === null ? (
                <View style={styles.contexte}>
                    {logo === null ? (
                        <Badge label={nomCourtEtablissement()} theme={theme} icon={{ name: 'school-outline' }} />
                    ) : null}
                    {fraicheur !== null ? (
                        <Badge
                            label={Translator.get('WIDGETS_REFRESHED', fraicheur)}
                            theme={theme}
                            icon={{ name: 'refresh' }}
                            tone="neutral"
                        />
                    ) : null}
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
    rangeeDuTitre: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.md,
    },
    titre: {
        fontSize: tokens.fontSize.title,
        fontWeight: tokens.fontWeight.bold,
        // Il prend ce qui reste et pousse le logo a droite. `flexShrink` implicite : c'est le titre
        // qui se tronquerait, jamais le logo qui sortirait de l'ecran.
        flex: 1,
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

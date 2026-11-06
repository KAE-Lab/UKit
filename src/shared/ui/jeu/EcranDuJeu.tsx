/**
 * Le jeu, jouable quand on veut (7-J, troisieme passe) : au fond de « A propos », derriere une rangee
 * discrete. Le parcours froid le prete le temps d'une connexion, trop court pour qu'un record compte ;
 * ici, il a un sens, et c'est le meme record (`usePartieDuRenard` le garde sur l'appareil). Le plateau
 * s'agrandit avec l'ecran, et la scene avec lui (`HAUTEUR_DE_SCENE`). Toucher
 * n'importe ou fait sauter, comme pendant la connexion ; tenir saute plus haut, glisser vers le
 * bas fait se baisser.
 */

import React, { useContext } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import style, { tokens } from '../../theme/Theme';
import { AppContext } from '../../services/AppCore';
import Translator from '../../i18n/Translator';
import { JeuDuRenard } from './JeuDuRenard';
import { usePartieDuRenard } from './usePartieDuRenard';

/** La hauteur du jeu : la moitie de l'ecran, bornee pour rester un plateau et non un mur. */
const HAUTEUR = { part: 0.4, minimum: 220, maximum: 300 } as const;

export function EcranDuJeu({ headerPadding }: { headerPadding?: Record<string, unknown> }) {
    const { themeName } = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const theme = style.Theme[themeName ?? 'light'];
    const { height } = useWindowDimensions();
    const partie = usePartieDuRenard({ toujours: true });
    const hauteur = Math.round(Math.min(HAUTEUR.maximum, Math.max(HAUTEUR.minimum, height * HAUTEUR.part)));
    return (
        <GestureDetector gesture={partie.geste}>
            <View style={[styles.page, { backgroundColor: theme.background }]}>
                <View style={[headerPadding, styles.contenu]}>
                    <JeuDuRenard partie={partie} theme={theme} hauteur={hauteur} />
                    <Text style={[styles.consigne, { color: theme.fontTertiary }]}>{Translator.get('JEU_PARTOUT')}</Text>
                </View>
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    contenu: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: tokens.space.md,
    },
    consigne: {
        textAlign: 'center',
        marginTop: tokens.space.md,
        fontSize: tokens.fontSize.sm,
    },
});

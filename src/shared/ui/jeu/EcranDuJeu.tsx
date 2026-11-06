/**
 * Le jeu, jouable quand on veut (7-J, troisieme passe) : au fond de « A propos », derriere une rangee
 * discrete. Le parcours froid le prete le temps d'une connexion, trop court pour qu'un record compte ;
 * ici, il a un sens, et c'est le meme record (`JeuDuRenard` le garde sur l'appareil). Le plateau
 * s'agrandit avec l'ecran, et la scene avec lui (`HAUTEUR_DE_SCENE`). Toucher
 * n'importe ou fait sauter, comme pendant la connexion.
 */

import React, { useContext, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import style, { tokens } from '../../theme/Theme';
import { AppContext } from '../../services/AppCore';
import Translator from '../../i18n/Translator';
import { JeuDuRenard, type CommandeDuJeu } from './JeuDuRenard';

/** La hauteur du jeu : la moitie de l'ecran, bornee pour rester un plateau et non un mur. */
const HAUTEUR = { part: 0.4, minimum: 220, maximum: 300 } as const;

export function EcranDuJeu({ headerPadding }: { headerPadding?: Record<string, unknown> }) {
    const { themeName } = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const theme = style.Theme[themeName ?? 'light'];
    const { height } = useWindowDimensions();
    const jeu = useRef<CommandeDuJeu>(null);
    const hauteur = Math.round(Math.min(HAUTEUR.maximum, Math.max(HAUTEUR.minimum, height * HAUTEUR.part)));
    return (
        <Pressable
            style={[styles.page, { backgroundColor: theme.background }]}
            onPressIn={() => jeu.current?.sauter()}
            accessible={false}
        >
            <View style={[headerPadding, styles.contenu]}>
                <JeuDuRenard ref={jeu} theme={theme} hauteur={hauteur} toujours />
                <Text style={[styles.consigne, { color: theme.fontTertiary }]}>{Translator.get('JEU_PARTOUT')}</Text>
            </View>
        </Pressable>
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

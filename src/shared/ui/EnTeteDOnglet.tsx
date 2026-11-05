/**
 * L'en-tete d'un onglet : fixe, pose sur le fond de la page (7-J, deuxieme passe).
 *
 * **Un seul systeme d'en-tete dans l'application** (review du 2026-11-05). La premiere passe faisait
 * partir le grand titre avec le contenu, puis paraitre une barre compacte, titre au centre : un
 * deuxieme gabarit a cote de l'en-tete fixe du Planning. Le titre reste desormais a sa place, et le
 * contenu passe dessous **en fondu** (`FonduDeBord`), qui parait des le premier point de defilement.
 *
 * **La teinte de la section vit dans l'en-tete**, et seulement la : le fond de l'onglet, ramene a sa
 * hauteur, se ferme a son bas sur la couleur unie de la page. Le fondu part de cette meme couleur, si
 * bien que le raccord ne se voit pas. Elle couvrait le haut de la page entiere, sous le contenu, ou
 * aucun fondu ne pouvait la suivre sans masque.
 *
 * **Ce qui ne bouge pas** : l'element de droite (la pastille d'etat de service), centre sur la ligne
 * du titre.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Extrapolation, interpolate, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../theme/Theme';
import { FondDOnglet } from './FondDOnglet';
import { FonduDeBord, HAUTEUR_DU_FONDU } from './FonduDeBord';
import type { OngletAFond } from './fondDOnglet';

/** La hauteur de la rangee du titre. */
export const HAUTEUR_DE_LA_BARRE = 56;

/** La hauteur de l'en-tete, zone sure comprise : le retrait du contenu qui defile dessous. */
export function hauteurDeLEnTete(hautSur: number): number {
    return hautSur + HAUTEUR_DE_LA_BARRE;
}

export interface EnTeteDOngletProps {
    theme: AppThemeType;
    onglet: OngletAFond;
    titre: string;
    /** Le defilement de la page, lu sur le fil de l'interface : il fait paraitre le fondu. */
    defilement: SharedValue<number>;
    /**
     * Sa valeur au repos : `-hauteur de l'en-tete` sur iOS, ou l'en-tete est un retrait du contenu
     * (`contentInset`), zero ailleurs, ou c'est un rembourrage.
     */
    repos: number;
    /** La zone sure du haut. */
    hautSur: number;
    /** Ce qui se pose a droite : la pastille d'etat de service. */
    droite?: React.ReactNode;
}

export function EnTeteDOnglet({ theme, onglet, titre, defilement, repos, hautSur, droite }: EnTeteDOngletProps) {
    const hauteur = hauteurDeLEnTete(hautSur);
    const opacite = useDerivedValue(() => interpolate(
        defilement.value - repos, [0, HAUTEUR_DU_FONDU / 2], [0, 1], Extrapolation.CLAMP,
    ));

    return (
        // Le conteneur englobe le fondu : un degrade dessine hors des bords de son parent faisait
        // planter le rendu logiciel de l'emulateur (SwiftShader), trois fois sur le banc.
        <View pointerEvents="box-none" style={[styles.enTete, { height: hauteur + HAUTEUR_DU_FONDU }]}>
            <FondDOnglet theme={theme} onglet={onglet} hauteur={hauteur} />
            <View pointerEvents="box-none" style={[styles.rangee, { top: hautSur }]}>
                <Text numberOfLines={1} style={[tokens.texte.grandTitre, styles.titre, { color: theme.font }]}>
                    {titre}
                </Text>
                {droite}
            </View>
            <FonduDeBord fond={theme.background} haut={hauteur} opacite={opacite} />
        </View>
    );
}

const styles = StyleSheet.create({
    enTete: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    rangee: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: HAUTEUR_DE_LA_BARRE,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
    },
    titre: {
        flex: 1,
    },
});

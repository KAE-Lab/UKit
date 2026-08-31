/**
 * La rangee mysterieuse : un widget dont la source n'est pas encore publiee, assume comme un teaser.
 *
 * Les rangees « notes » et « examens » annoncaient leur service en clair alors qu'elles n'ont rien a
 * dire avant la rentree — une promesse plate. Elles passent **sous un flou** : on devine une rangee,
 * on ne lit rien, et le toucher ouvre une modale qui l'assume — « bientot » — avec, quand le service
 * a une porte, un lien discret pour l'ouvrir quand meme. Le mystere ne coute donc aucune capacite.
 *
 * **Le declencheur est la donnee, pas une liste ecrite** : une rangee est mysterieuse tant que son
 * widget n'a pas de source publiee (natures `bientot` et `absent`). Le jour ou la v6.1 publie le
 * Blueprint des notes, le flou tombe de lui-meme, sans release — c'est la these de la phase 6
 * appliquee a un effet de style.
 *
 * `expo-blur` : inclus dans Expo Go, rendu natif sur iOS ; sur Android le vrai flou passe par
 * `experimentalBlurMethod`, avec un voile translucide en repli sur les appareils qui ne le portent
 * pas — le texte reste illisible dans les deux cas, c'est tout ce qu'on demande.
 */

import React, { useContext } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Translator from '../../../shared/i18n/Translator';
import { propsLibelleBouton, tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';

export interface RangeeMysterieuseProps {
    theme: AppThemeType;
    /** La rangee a flouter, rendue **sans** geste propre : c'est le voile qui porte le toucher. */
    children: React.ReactNode;
    onPress: () => void;
}

export function RangeeMysterieuse({ theme, children, onPress }: RangeeMysterieuseProps) {
    const { themeName } = useContext(AppContext) as { themeName: 'light' | 'dark' };

    return (
        <View>
            {children}
            <BlurView
                intensity={30}
                tint={themeName === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
            />
            {/* Le cadenas dit « pas encore ouvert » — l'exclusivite plutot que la promesse. Sans
                signe, une rangee floue se lirait comme un rendu casse. */}
            <View style={[StyleSheet.absoluteFill, styles.centre]} pointerEvents="none">
                <MaterialCommunityIcons name="lock" size={20} color={theme.fontSecondary} />
            </View>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.7} onPress={onPress} />
        </View>
    );
}

export interface ModaleBientotProps {
    theme: AppThemeType;
    visible: boolean;
    fermer: () => void;
    /** Ouvre le service malgre tout, quand l'etablissement en declare un. Absent, pas de lien. */
    ouvrirQuandMeme?: () => void;
    /**
     * Un autre message sous le meme voile : le teaser du campus non relie n'annonce pas la meme
     * chose que celui d'un widget. Absents, la modale dit « bientot ».
     */
    titre?: string;
    corps?: string;
    /**
     * Une action principale a la place de « Compris » — la demande de campus, par exemple. La
     * fermeture passe alors en bouton secondaire : une action ne doit jamais etre la seule sortie.
     */
    action?: { libelle: string; onPress: () => void };
}

/** Ce que le voile promet : la modale qui assume le teaser, et garde la porte du service. */
export function ModaleBientot({ theme, visible, fermer, ouvrirQuandMeme, titre, corps, action }: ModaleBientotProps) {
    const popup = theme.settings.popup;

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={fermer}>
            <TouchableWithoutFeedback onPress={fermer}>
                <View style={popup.background as never}>
                    <TouchableWithoutFeedback>
                        <View style={popup.container as never}>
                            <View style={popup.header as never}>
                                <Text style={popup.textHeader}>{titre ?? Translator.get('COMING_SOON_TITLE')}</Text>
                            </View>
                            <Text style={popup.textDescription}>{corps ?? Translator.get('COMING_SOON_BODY')}</Text>

                            {ouvrirQuandMeme !== undefined ? (
                                <TouchableOpacity onPress={ouvrirQuandMeme} hitSlop={8} style={styles.lien}>
                                    <Text style={{
                                        color: theme.primary,
                                        fontSize: tokens.fontSize.sm,
                                        fontWeight: tokens.fontWeight.semibold,
                                    }}>
                                        {Translator.get('COMING_SOON_OPEN')}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}

                            <View style={popup.buttonContainer as never}>
                                {action !== undefined ? (
                                    <>
                                        <TouchableOpacity style={popup.buttonSecondary as never} onPress={fermer}>
                                            <Text {...propsLibelleBouton} style={popup.buttonTextSecondary as never}>{Translator.get('LATER')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={popup.buttonMain as never} onPress={action.onPress}>
                                            <Text {...propsLibelleBouton} style={popup.buttonTextMain as never}>{action.libelle}</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <TouchableOpacity style={popup.buttonMain as never} onPress={fermer}>
                                        <Text {...propsLibelleBouton} style={popup.buttonTextMain as never}>{Translator.get('COMING_SOON_ACK')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centre: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    lien: {
        marginBottom: tokens.space.sm,
    },
});

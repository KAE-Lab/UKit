/**
 * Le dialogue informatif : un titre, un corps, une action principale, une sortie secondaire, et un
 * lien discret.
 *
 * Extrait de la modale « Bientot » de la Scolarite le jour ou elle a gagne un troisieme hote — le
 * campus non relie de la barre d'onglets, puis la feuille d'echec d'un widget. C'est la regle du
 * depot : un motif qui apparait une deuxieme fois remonte (docs/theme.md). Les trois compositions
 * ne different que par leurs mots et leur action ; le gabarit, lui, est celui des dialogues de
 * confirmation des Reglages (`theme.settings.popup`), pour qu'il n'existe qu'une seule facon de
 * poser une boite au milieu de l'ecran.
 *
 * **Une action ne doit jamais etre la seule sortie** : avec une `action`, la fermeture passe en
 * bouton secondaire (« Plus tard ») ; sans, c'est le bouton plein qui ferme. Le `lien` est la
 * troisieme voie, plus discrete que les deux autres — « ouvrir le service quand meme », « ressaisir
 * mes identifiants ».
 *
 * `Modal` de React Native, et non une feuille du bas : c'est le vocabulaire des dialogues de cette
 * application, et un second dialecte de boite est exactement ce que ce fichier evite.
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import Translator from '../i18n/Translator';
import { propsLibelleBouton, tokens, type AppThemeType } from '../theme/Theme';

export interface ActionDeDialogue {
    readonly libelle: string;
    readonly onPress: () => void;
}

export interface DialogueProps {
    theme: AppThemeType;
    visible: boolean;
    fermer: () => void;
    titre: string;
    corps: string;
    /** L'action principale, en bouton plein. Absente, le bouton plein ferme. */
    action?: ActionDeDialogue;
    /** Un lien discret sous le corps : la troisieme voie, jamais la seule. */
    lien?: ActionDeDialogue;
    /** Le libelle du bouton qui ferme. Defaut : « Plus tard » a cote d'une action, « Fermer » seul. */
    libelleFermer?: string;
}

export function Dialogue({ theme, visible, fermer, titre, corps, action, lien, libelleFermer }: DialogueProps) {
    const popup = theme.settings.popup;
    const fermeture = libelleFermer ?? Translator.get(action !== undefined ? 'LATER' : 'CLOSE');

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={fermer}>
            <TouchableWithoutFeedback onPress={fermer}>
                <View style={popup.background as never}>
                    <TouchableWithoutFeedback>
                        <View style={popup.container as never}>
                            <View style={popup.header as never}>
                                <Text style={popup.textHeader}>{titre}</Text>
                            </View>
                            <Text style={popup.textDescription}>{corps}</Text>

                            {lien !== undefined ? (
                                <TouchableOpacity onPress={lien.onPress} hitSlop={8} style={styles.lien}>
                                    <Text style={[styles.texteDuLien, { color: theme.primary }]}>{lien.libelle}</Text>
                                </TouchableOpacity>
                            ) : null}

                            <View style={popup.buttonContainer as never}>
                                {action !== undefined ? (
                                    <>
                                        <TouchableOpacity style={popup.buttonSecondary as never} onPress={fermer}>
                                            <Text {...propsLibelleBouton} style={popup.buttonTextSecondary as never}>{fermeture}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={popup.buttonMain as never} onPress={action.onPress}>
                                            <Text {...propsLibelleBouton} style={popup.buttonTextMain as never}>{action.libelle}</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <TouchableOpacity style={popup.buttonMain as never} onPress={fermer}>
                                        <Text {...propsLibelleBouton} style={popup.buttonTextMain as never}>{fermeture}</Text>
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
    lien: {
        marginBottom: tokens.space.sm,
    },
    texteDuLien: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
    },
});

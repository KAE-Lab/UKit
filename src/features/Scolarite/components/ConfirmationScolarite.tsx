/**
 * Le dialogue de confirmation de l'onglet Scolarite, dans un seul composant parametre.
 *
 * Il servait deja deux fois dans l'ecran du compte — actualiser le dossier, se deconnecter — et la
 * suppression d'un document en fait un troisieme usage. La regle du depot est **deux**
 * (docs/theme.md), et il etait donc temps : une troisieme copie aurait diverge comme la premiere.
 *
 * Ce qu'il ne refait pas : son habillage vient entierement de `theme.settings.popup`, le meme que
 * les huit autres modales de l'application. La deconnexion portait autrefois un dialecte a elle
 * seule — sa propre superposition, sa propre boite en 85 % de largeur, ses propres boutons.
 *
 * **Une confirmation se reserve aux gestes couteux, et le cout n'est pas toujours une destruction.**
 * « Actualiser mon dossier » ne detruit rien mais rejoue une connexion complete, prend l'ecran
 * plusieurs secondes et ne s'annule pas une fois lancee. L'explication du geste vit donc dans le
 * dialogue, au moment de decider, plutot qu'en ligne d'aide sous le bouton — que personne ne lisait,
 * et qui cassait le rythme des actions de l'ecran.
 */

import React from 'react';
import {
    View, Text, TouchableOpacity, TouchableWithoutFeedback, Modal,
    type StyleProp, type ViewStyle, type TextStyle,
} from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import { type AppThemeType } from '../../../shared/theme/Theme';

export interface ConfirmationScolariteProps {
    theme: AppThemeType;
    visible: boolean;
    titre: string;
    description: string;
    confirmer: string;
    onClose: () => void;
    onConfirm: () => void;
    /** Plein `danger` : reserve a ce qui retire quelque chose qu'on ne recupere pas. */
    destructif?: boolean;
}

/**
 * Les styles composes du dialogue, lus une fois.
 *
 * Le transtypage est **local et assume**, et sa cause est en amont : `Theme.ts` n'emploie pas
 * `StyleSheet.create` — ses styles composes sont des objets litteraux, donc TypeScript elargit
 * `justifyContent: 'center'` en `string`, qui n'est plus assignable a un `ViewStyle`. Les appelants
 * historiques ne le voyaient pas parce que leur prop `theme` n'etait pas typee : le probleme
 * apparait ici precisement parce que ce composant, lui, l'est.
 *
 * Le corriger a la source demanderait de retyper un fichier de donnees de 1 100 lignes, ce qui
 * deborde d'une session d'ecran ; c'est ecrit dans docs/qualite.md plutot que fait en passant.
 */
function stylesDuDialogue(theme: AppThemeType) {
    return theme.settings.popup as unknown as {
        background: StyleProp<ViewStyle>;
        container: StyleProp<ViewStyle>;
        header: StyleProp<ViewStyle>;
        textHeader: StyleProp<TextStyle>;
        textDescription: StyleProp<TextStyle>;
        buttonContainer: StyleProp<ViewStyle>;
        buttonSecondary: StyleProp<ViewStyle>;
        buttonTextSecondary: StyleProp<TextStyle>;
        buttonMain: StyleProp<ViewStyle>;
        buttonTextMain: StyleProp<TextStyle>;
        buttonDestructive: StyleProp<ViewStyle>;
        buttonTextDestructive: StyleProp<TextStyle>;
    };
}

export function ConfirmationScolarite({
    theme, visible, titre, description, confirmer, onClose, onConfirm, destructif = false,
}: ConfirmationScolariteProps) {
    const popup = stylesDuDialogue(theme);

    return (
        <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={popup.background}>
                    <TouchableWithoutFeedback>
                        <View style={popup.container}>
                            <View style={popup.header}>
                                <Text style={popup.textHeader}>{titre}</Text>
                            </View>
                            <Text style={popup.textDescription}>{description}</Text>
                            <View style={popup.buttonContainer}>
                                <TouchableOpacity style={popup.buttonSecondary} onPress={onClose}>
                                    <Text style={popup.buttonTextSecondary}>
                                        {Translator.get('CANCEL')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={destructif ? popup.buttonDestructive : popup.buttonMain}
                                    onPress={onConfirm}
                                >
                                    <Text style={destructif ? popup.buttonTextDestructive : popup.buttonTextMain}>
                                        {confirmer}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

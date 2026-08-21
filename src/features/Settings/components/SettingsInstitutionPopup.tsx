/**
 * Le choix de l'etablissement, depuis les reglages.
 *
 * Deux temps dans une seule modale, et c'est deliberement le cas : la liste, puis la **confirmation**.
 * Changer d'universite efface les groupes favoris, le planning en cache et la session universitaire —
 * meler les donnees de deux facs serait pire que de tout redemander (docs/features/settings.md). Une
 * bascule immediate au premier toucher rendrait ce cout invisible jusqu'a ce qu'il soit paye.
 *
 * Le fichier est a part plutot que dans `SettingsModals.tsx` : celui-ci porte deja quatre modales et
 * approche la limite de lignes, et celle-ci est la seule qui detruise quelque chose.
 *
 * Voir docs/features/settings.md et docs/phase-6/6-g-etablissements.md.
 */

import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import Translator from '../../../shared/i18n/Translator';
import { tokens } from '../../../shared/theme/Theme';
import { listeEtablissements, type Etablissement } from '../../../shared/etablissements';
import type { AppThemeType } from '../../../shared/theme/Theme';

interface Props {
    readonly theme: AppThemeType['settings'];
    readonly popupVisible: boolean;
    readonly popupClose: () => void;
    readonly codeActif: string;
    readonly onConfirm: (code: string) => void;
}

export const SettingsInstitutionPopup = ({ theme, popupVisible, popupClose, codeActif, onConfirm }: Props) => {
    /** L'etablissement que l'utilisateur vient de toucher, en attente de confirmation. */
    const [candidat, setCandidat] = useState<string | null>(null);

    // La liste est relue a chaque ouverture plutot que memorisee : un rafraichissement du catalogue
    // peut avoir eu lieu entre deux visites de cet ecran.
    const etablissements: readonly Etablissement[] = popupVisible ? listeEtablissements() : [];

    const fermer = () => {
        setCandidat(null);
        popupClose();
    };

    const confirmer = () => {
        const code = candidat;
        setCandidat(null);
        if (code !== null) onConfirm(code);
        popupClose();
    };

    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={fermer}>
            <TouchableWithoutFeedback onPress={fermer}>
                <View style={theme.popup.background as never}>
                    <View style={theme.popup.container as never}>
                        {candidat === null ? (
                            <>
                                <View style={theme.popup.header as never}>
                                    <Text style={theme.popup.textHeader}>{Translator.get('INSTITUTION')}</Text>
                                    <TouchableOpacity onPress={fermer} hitSlop={12}>
                                        <MaterialIcons name="close" size={24} style={theme.popup.closeIcon} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={theme.popup.textDescription}>{Translator.get('YOUR_INSTITUTION')}</Text>
                                <ScrollView style={{ marginVertical: tokens.space.sm }}>
                                    {etablissements.map((etablissement) => {
                                        const actif = etablissement.code === codeActif;
                                        return (
                                            <TouchableOpacity
                                                key={etablissement.code}
                                                // Retoucher l'etablissement deja actif ne doit rien declencher : il
                                                // n'y a rien a purger, et une confirmation pour un non-changement
                                                // apprendrait a la valider sans lire.
                                                onPress={() => (actif ? fermer() : setCandidat(etablissement.code))}
                                                style={theme.popup.radioContainer as never}
                                            >
                                                <MaterialIcons
                                                    name={actif ? 'radio-button-on' : 'radio-button-off'}
                                                    size={24}
                                                    color={theme.popup.radioIconColor}
                                                />
                                                {/* Le nom vient du catalogue : c'est une donnee, pas un libelle traduit. */}
                                                <Text style={[theme.popup.radioText, { flexShrink: 1 }]}>
                                                    {etablissement.nom}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </>
                        ) : (
                            <>
                                <View style={theme.popup.header as never}>
                                    <Text style={theme.popup.textHeader}>
                                        {Translator.get('INSTITUTION_CHANGE_TITLE')}
                                    </Text>
                                </View>
                                <Text style={theme.popup.textDescription}>
                                    {Translator.get('INSTITUTION_CHANGE_WARNING')}
                                </Text>
                                <View style={theme.popup.buttonContainer as never}>
                                    <TouchableOpacity style={theme.popup.buttonSecondary as never} onPress={() => setCandidat(null)}>
                                        <Text style={theme.popup.buttonTextSecondary as never}>
                                            {Translator.get('CANCEL')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={theme.popup.buttonMain as never} onPress={confirmer}>
                                        <Text style={theme.popup.buttonTextMain as never}>
                                            {Translator.get('CONFIRM')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

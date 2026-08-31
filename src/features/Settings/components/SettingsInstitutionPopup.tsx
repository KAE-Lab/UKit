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
import { propsLibelleBouton, tokens } from '../../../shared/theme/Theme';
import { listeEtablissements, type Etablissement } from '../../../shared/etablissements';
import type { AppThemeType } from '../../../shared/theme/Theme';

interface Props {
    readonly theme: AppThemeType['settings'];
    readonly popupVisible: boolean;
    readonly popupClose: () => void;
    readonly codeActif: string;
    readonly onConfirm: (code: string) => void;
}

/** Une universite de la liste : la meme option-bouton que la modale de choix generique. */
function OptionEtablissement({ etablissement, selectionne, theme, onPress }: { etablissement: Etablissement; selectionne: boolean; theme: AppThemeType['settings']; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[theme.popup.option, selectionne ? theme.popup.optionSelected : null] as never}
        >
            {/* Le nom vient du catalogue : c'est une donnee, pas un libelle traduit. */}
            <Text
                numberOfLines={2}
                style={[theme.popup.optionText, selectionne ? theme.popup.optionTextSelected : null]}
            >
                {etablissement.nom}
            </Text>
            {/* Emplacement reserve : la coche qui apparait ne doit pas retrecir le libelle — un nom
                long sautait sur deux lignes a chaque selection. */}
            <View style={{ width: 20, marginLeft: tokens.space.sm, alignItems: 'flex-end' }}>
                {selectionne ? (
                    <MaterialIcons name="check" size={20} color={theme.popup.optionCheckColor} />
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

export const SettingsInstitutionPopup = ({ theme, popupVisible, popupClose, codeActif, onConfirm }: Props) => {
    /** L'etablissement touche, en attente du bouton Confirmer. */
    const [candidat, setCandidat] = useState<string | null>(null);
    /** Le second temps : l'avertissement de purge, apres Confirmer sur un autre etablissement. */
    const [avertissement, setAvertissement] = useState(false);
    const choisi = candidat ?? codeActif;

    // La liste est relue a chaque ouverture plutot que memorisee : un rafraichissement du catalogue
    // peut avoir eu lieu entre deux visites de cet ecran.
    const etablissements: readonly Etablissement[] = popupVisible ? listeEtablissements() : [];

    const fermer = () => {
        setCandidat(null);
        setAvertissement(false);
        popupClose();
    };

    // Confirmer l'etablissement deja actif ne doit rien declencher : il n'y a rien a purger, et un
    // avertissement pour un non-changement apprendrait a le valider sans lire.
    const demanderConfirmation = () => {
        if (choisi === codeActif) return fermer();
        setAvertissement(true);
    };

    const confirmer = () => {
        const code = candidat;
        fermer();
        if (code !== null) onConfirm(code);
    };

    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={fermer}>
            <TouchableWithoutFeedback onPress={fermer}>
                <View style={theme.popup.background as never}>
                    <TouchableWithoutFeedback>
                    <View style={theme.popup.container as never}>
                        {!avertissement ? (
                            <>
                                <View style={theme.popup.header as never}>
                                    <Text style={theme.popup.textHeader}>{Translator.get('INSTITUTION')}</Text>
                                    <TouchableOpacity onPress={fermer} hitSlop={12}>
                                        <MaterialIcons name="close" size={24} style={theme.popup.closeIcon} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={theme.popup.textDescription}>{Translator.get('YOUR_INSTITUTION')}</Text>
                                {/* Marge basse : l'ecart options -> boutons vaut 16, comme partout. */}
                                <ScrollView style={{ marginBottom: tokens.space.sm }}>
                                    {etablissements.map((etablissement) => (
                                        <OptionEtablissement
                                            key={etablissement.code}
                                            etablissement={etablissement}
                                            selectionne={etablissement.code === choisi}
                                            theme={theme}
                                            onPress={() => setCandidat(etablissement.code)}
                                        />
                                    ))}
                                </ScrollView>
                                <View style={theme.popup.buttonContainer as never}>
                                    <TouchableOpacity style={theme.popup.buttonSecondary as never} onPress={fermer}>
                                        <Text {...propsLibelleBouton} style={theme.popup.buttonTextSecondary as never}>{Translator.get('CANCEL')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={theme.popup.buttonMain as never} onPress={demanderConfirmation}>
                                        <Text {...propsLibelleBouton} style={theme.popup.buttonTextMain as never}>{Translator.get('CONFIRM')}</Text>
                                    </TouchableOpacity>
                                </View>
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
                                    {/* Annuler revient a la liste, selection intacte : on relit
                                        l'avertissement, on ne ressaisit pas son choix. */}
                                    <TouchableOpacity style={theme.popup.buttonSecondary as never} onPress={() => setAvertissement(false)}>
                                        <Text {...propsLibelleBouton} style={theme.popup.buttonTextSecondary as never}>
                                            {Translator.get('CANCEL')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={theme.popup.buttonMain as never} onPress={confirmer}>
                                        <Text {...propsLibelleBouton} style={theme.popup.buttonTextMain as never}>
                                            {Translator.get('CONFIRM')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

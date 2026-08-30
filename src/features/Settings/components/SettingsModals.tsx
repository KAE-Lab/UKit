/**
 * Les modales des reglages : un choix generique, et deux confirmations.
 *
 * **Le choix est une seule modale** (`SettingsChoicePopup`), que la langue et le calendrier
 * habillent : des options a la forme des boutons de l'application — contour neutre au repos, fond
 * teinte et coche une fois choisie — puis un bouton Confirmer. Les ronds a cocher ne ressemblaient a
 * rien d'autre dans l'application, et un choix applique au premier toucher ne laissait pas se
 * raviser : on validait en essayant.
 *
 * **Les filtres d'UE ne sont plus une modale** : ils ont leur ecran (`FiltersScreen`), pousse comme
 * les autres sous-pages des reglages. Une modale qui prenait tout l'ecran, portait une liste, une
 * recherche et un formulaire etait une sous-page qui ne disait pas son nom — sans en-tete de
 * navigation ni geste de retour.
 */

import React, { useState } from 'react';
import { Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import Translator from '../../../shared/i18n/Translator';
import { propsLibelleBouton, tokens } from '../../../shared/theme/Theme';
import { SettingsManager } from '../../../shared/services/AppCore';

type ThemeSettings = import('../../../shared/theme/Theme').AppThemeType['settings'];

export interface OptionDeChoix {
    /** L'identifiant stable de l'option — un code de langue, un id de calendrier. */
    cle: string;
    libelle: string;
}

interface SettingsChoicePopupProps {
    theme: ThemeSettings;
    titre: string;
    description?: string;
    options: readonly OptionDeChoix[];
    /** La cle de l'option en vigueur : c'est elle qui apparait choisie a l'ouverture. */
    selection: string;
    popupVisible: boolean;
    popupClose: () => void;
    /** Appele a la confirmation, et seulement si le choix a change : rien ne se rejoue pour rien. */
    onConfirm: (cle: string) => void;
}

/**
 * La modale de choix : des options, un Confirmer.
 *
 * Le toucher **prepare** le choix, Confirmer l'applique, fermer l'abandonne — la selection en vigueur
 * reste donc vraie tant qu'on n'a pas confirme, ce que l'application immediate des radios ne
 * permettait pas de montrer.
 */
export const SettingsChoicePopup = ({ theme, titre, description, options, selection, popupVisible, popupClose, onConfirm }: SettingsChoicePopupProps) => {
    const [candidat, setCandidat] = useState<string | null>(null);
    const choisi = candidat ?? selection;

    const fermer = () => {
        setCandidat(null);
        popupClose();
    };

    const confirmer = () => {
        const retenu = choisi;
        setCandidat(null);
        popupClose();
        if (retenu !== selection) onConfirm(retenu);
    };

    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={fermer}>
            <TouchableWithoutFeedback onPress={fermer}>
                <View style={theme.popup.background as never}>
                    {/* Le second garde-toucher rend la carte inerte : sans lui, un toucher a cote
                        d'une option — un rembourrage, la description — fermait la modale. */}
                    <TouchableWithoutFeedback>
                        <View style={theme.popup.container as never}>
                            <View style={theme.popup.header as never}>
                                <Text style={theme.popup.textHeader}>{titre}</Text>
                                <TouchableOpacity onPress={fermer} hitSlop={12}>
                                    <MaterialIcons name="close" size={24} style={theme.popup.closeIcon} />
                                </TouchableOpacity>
                            </View>

                            {description !== undefined ? (
                                <Text style={theme.popup.textDescription}>{description}</Text>
                            ) : null}

                            {/* La marge basse complete le `marginTop` des boutons : l'ecart
                                options -> boutons vaut alors 16, celui de tous les dialogues. */}
                            <ScrollView style={{ marginBottom: tokens.space.sm }}>
                                {options.map((option) => {
                                    const selectionne = option.cle === choisi;
                                    return (
                                        <TouchableOpacity
                                            key={option.cle}
                                            onPress={() => setCandidat(option.cle)}
                                            style={[theme.popup.option, selectionne ? theme.popup.optionSelected : null] as never}
                                        >
                                            <Text
                                                numberOfLines={2}
                                                style={[theme.popup.optionText, selectionne ? theme.popup.optionTextSelected : null]}
                                            >
                                                {option.libelle}
                                            </Text>
                                            {/* L'emplacement de la coche est reserve meme au repos :
                                                sans lui, choisir une option retrecissait son libelle,
                                                et un nom long sautait sur deux lignes en alternance. */}
                                            <View style={{ width: 20, marginLeft: tokens.space.sm, alignItems: 'flex-end' }}>
                                                {selectionne ? (
                                                    <MaterialIcons name="check" size={20} color={theme.popup.optionCheckColor} />
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={theme.popup.buttonContainer as never}>
                                <TouchableOpacity style={theme.popup.buttonSecondary as never} onPress={fermer}>
                                    <Text {...propsLibelleBouton} style={theme.popup.buttonTextSecondary as never}>{Translator.get('CANCEL')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={theme.popup.buttonMain as never} onPress={confirmer}>
                                    <Text {...propsLibelleBouton} style={theme.popup.buttonTextMain as never}>{Translator.get('CONFIRM')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── Popup Langue ────────────────────────────────────────────────────────
export const SettingsLanguagePopup = ({ theme, popupVisible, popupClose, language, onConfirm }: { theme: ThemeSettings; popupVisible: boolean; popupClose: () => void; language: string; onConfirm: (code: string) => void }) => (
    <SettingsChoicePopup
        theme={theme}
        titre={Translator.get('LANGUAGE')}
        description={Translator.get('YOUR_LANGUAGE')}
        options={[
            { cle: 'fr', libelle: Translator.get('FRENCH') },
            { cle: 'en', libelle: Translator.get('ENGLISH') },
            { cle: 'es', libelle: Translator.get('SPANISH') },
        ]}
        selection={language}
        popupVisible={popupVisible}
        popupClose={popupClose}
        onConfirm={onConfirm}
    />
);

// ── Popup Calendrier ────────────────────────────────────────────────────
export const SettingsCalendarPopup = ({ theme, popupVisible, popupClose, selectedCalendar, setCalendar }: { theme: ThemeSettings; popupVisible: boolean; popupClose: () => void; selectedCalendar: string | number; setCalendar: (cal: import('expo-calendar').Calendar | 'UKit') => void }) => {
    const calendars = SettingsManager.getCalendars().filter((cal) => cal.title !== 'UKit');
    const ukitCalendar = SettingsManager.getCalendars().find((cal) => cal.title === 'UKit');

    // Le calendrier dedie a deux identites — la cible symbolique `'UKit'` et l'id du calendrier reel
    // une fois cree — et les deux veulent dire la meme option.
    const selection = selectedCalendar === 'UKit' || selectedCalendar === ukitCalendar?.id
        ? 'UKit'
        : String(selectedCalendar);

    const confirmerCalendrier = (cle: string) => {
        if (cle === 'UKit') return setCalendar('UKit');
        const calendrier = calendars.find((cal) => cal.id === cle);
        if (calendrier !== undefined) setCalendar(calendrier);
    };

    return (
        <SettingsChoicePopup
            theme={theme}
            titre={Translator.get('CALENDAR')}
            description={Translator.get('YOUR_CALENDAR')}
            options={[
                { cle: 'UKit', libelle: Translator.get('UKIT_CALENDAR') },
                ...calendars.map((cal) => ({ cle: cal.id, libelle: cal.title })),
            ]}
            selection={selection}
            popupVisible={popupVisible}
            popupClose={popupClose}
            onConfirm={confirmerCalendrier}
        />
    );
};

// ── Popup Extinction de la synchronisation ──────────────────────────────
/**
 * La confirmation d'extinction de la synchronisation calendrier.
 *
 * Elle existe parce que le geste est **destructif hors de l'application** : il retire des evenements
 * de l'agenda personnel de l'utilisateur, que d'autres applications lisent. Le texte dit les deux
 * moities de ce qui se passe — ce qui part, et ce qui ne bouge pas — parce que « desactiver » ne
 * laisse pas deviner que ca efface quelque chose.
 */
export const SettingsSyncOffPopup = ({ theme, popupVisible, popupClose, disableSync }: { theme: ThemeSettings; popupVisible: boolean; popupClose: () => void; disableSync: () => void }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={popupClose}>
            <TouchableWithoutFeedback onPress={popupClose}>
                <View style={theme.popup.background as never}>
                    <View style={theme.popup.container as never}>
                        <View style={theme.popup.header as never}>
                            <Text style={theme.popup.textHeader}>{Translator.get('DISABLE_SYNC')}</Text>
                        </View>
                        <Text style={theme.popup.textDescription}>{Translator.get('DISABLE_SYNC_CONFIRMATION')}</Text>
                        <View style={theme.popup.buttonContainer as never}>
                            <TouchableOpacity style={theme.popup.buttonSecondary as never} onPress={popupClose}>
                                <Text {...propsLibelleBouton} style={theme.popup.buttonTextSecondary as never}>{Translator.get('CANCEL')}</Text>
                            </TouchableOpacity>
                            {/* Destructif : l'extinction retire de l'agenda personnel les cours deja poses. */}
                            <TouchableOpacity style={theme.popup.buttonDestructive as never} onPress={disableSync}>
                                <Text {...propsLibelleBouton} style={theme.popup.buttonTextDestructive as never}>{Translator.get('DISABLE')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── Popup Réinitialisation ──────────────────────────────────────────────
export const SettingsResetPopup = ({ theme, popupVisible, popupClose, resetApp }: { theme: ThemeSettings; popupVisible: boolean; popupClose: () => void; resetApp: () => void }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={popupClose}>
            <TouchableWithoutFeedback onPress={popupClose}>
                <View style={theme.popup.background as never}>
                    <View style={theme.popup.container as never}>
                        <View style={theme.popup.header as never}>
                            <Text style={theme.popup.textHeader}>{Translator.get('RESET_APP')}</Text>
                        </View>
                        <Text style={theme.popup.textDescription}>{Translator.get('RESET_APP_CONFIRMATION')}</Text>
                        <View style={theme.popup.buttonContainer as never}>
                            <TouchableOpacity style={theme.popup.buttonSecondary as never} onPress={popupClose}>
                                <Text {...propsLibelleBouton} style={theme.popup.buttonTextSecondary as never}>{Translator.get('CANCEL')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={theme.popup.buttonDestructive as never} onPress={resetApp}>
                                <Text {...propsLibelleBouton} style={theme.popup.buttonTextDestructive as never}>{Translator.get('RESET')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

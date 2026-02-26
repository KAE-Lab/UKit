import React, { useRef } from 'react';
import {
    Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback,
    ScrollView, Platform, FlatList, TextInput, KeyboardAvoidingView, Keyboard, SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import Translator from '../../shared/i18n/Translator';
import { SettingsManager } from '../../shared/services/AppCore';

// ── Utilitaire Clavier ──────────────────────────────────────────────────
export const SettingsDismissKeyboard = ({ children }) => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {children}
    </TouchableWithoutFeedback>
);

// ── Popup Calendrier ────────────────────────────────────────────────────
export const SettingsCalendarPopup = ({ theme, popupVisible, popupClose, selectedCalendar, setCalendar }) => {
    function setDefaultCalendar() {
        setCalendar('UKit');
    }

    const calendars = SettingsManager.getCalendars().filter((cal) => cal.title !== 'UKit');
    const ukitCalendar = SettingsManager.getCalendars().find((cal) => cal.title === 'UKit');

    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={popupClose}>
            <TouchableWithoutFeedback onPress={popupClose}>
                <View style={theme.popup.background}>
                    <View style={theme.popup.container}>
                        <View style={theme.popup.header}>
                            <Text style={theme.popup.textHeader}>
                                {Translator.get('CALENDAR').toUpperCase()}
                            </Text>
                            <TouchableOpacity onPress={popupClose}>
                                <MaterialIcons name="close" size={32} style={theme.popup.closeIcon} />
                            </TouchableOpacity>
                        </View>
                        <Text style={theme.popup.textDescription}>
                            {Translator.get('YOUR_CALENDAR')}
                        </Text>
                        <ScrollView style={{ marginVertical: 8 }}>
                            <TouchableOpacity onPress={setDefaultCalendar} style={theme.popup.radioContainer}>
                                <MaterialIcons
                                    name={selectedCalendar === 'UKit' || selectedCalendar === ukitCalendar?.id ? 'radio-button-on' : 'radio-button-off'}
                                    size={24} color={theme.popup.radioIconColor}
                                />
                                <Text style={theme.popup.radioText}>{Translator.get('UKIT_CALENDAR')}</Text>
                            </TouchableOpacity>

                            <Text style={theme.popup.textDescription}>{Translator.get('EXISTING_CALENDARS')}</Text>

                            {calendars.map((calendar, i) => {
                                const _setCalendar = () => setCalendar(calendar);
                                return (
                                    <TouchableOpacity key={calendar.id} onPress={_setCalendar} style={theme.popup.radioContainer}>
                                        <MaterialIcons
                                            name={selectedCalendar === calendar.id ? 'radio-button-on' : 'radio-button-off'}
                                            size={24} color={theme.popup.radioIconColor}
                                        />
                                        <Text style={theme.popup.radioText}>{calendar.title + '  '}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── Popup Filtres ───────────────────────────────────────────────────────
export const SettingsFiltersPopup = ({ theme, popupVisible, popupClose, filterList, filterTextInput, setFilterTextInput, submitFilterTextInput }) => {
    const flatListRef = useRef(null);
    const scrollToEnd = () => flatListRef.current.scrollToEnd();
    
    const renderFilterItem = ({ item }) => {
        const removeFilters = () => SettingsManager.removeFilters(item);
        return (
            <TouchableOpacity key={item} onLongPress={removeFilters} style={theme.popup.filters.button}>
                <Text style={theme.popup.filters.buttonText}>{item}</Text>
            </TouchableOpacity>
        );
    };

    const addFilterTextInput = () => {
        submitFilterTextInput();
        setTimeout(() => scrollToEnd(), 500);
    };

    return (
        <Modal animationType="slide" transparent={true} visible={popupVisible} onRequestClose={popupClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'height' : ''} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <SettingsDismissKeyboard>
                        <View style={theme.popup.filters.container}>
                            <View style={theme.popup.filters.header}>
                                <Text style={theme.popup.textHeader}>{Translator.get('FILTERS').toUpperCase()}</Text>
                                <TouchableOpacity onPress={popupClose}>
                                    <MaterialIcons name="close" size={32} style={theme.popup.closeIcon} />
                                </TouchableOpacity>
                            </View>
                            <Text style={theme.popup.textDescription}>{Translator.get('REMOVE_FILTER')}</Text>
                            <View style={theme.popup.filterListContainer}>
                                <FlatList
                                    ref={flatListRef}
                                    keyExtractor={(item) => item}
                                    data={filterList}
                                    renderItem={renderFilterItem}
                                    numColumns={2}
                                    ListEmptyComponent={
                                        <Text style={theme.popup.textDescription}>{Translator.get('NO_FILTER')}</Text>
                                    }
                                />
                            </View>
                            <View style={theme.popup.filters.footer}>
                                <TextInput
                                    style={theme.popup.textInput}
                                    onChangeText={setFilterTextInput}
                                    value={filterTextInput}
                                    placeholder="4TIN603U"
                                    placeholderTextColor={theme.popup.textInputPlaceholderColor}
                                    autoCorrect={false}
                                    keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
                                />
                                <TouchableOpacity onPress={addFilterTextInput}>
                                    <MaterialIcons name="add" size={32} color={theme.popup.textInputIconColor} />
                                </TouchableOpacity>
                            </View>
                            <Text style={theme.popup.textDescription}>{Translator.get('FILTERS_ENTER_CODE')}</Text>
                        </View>
                    </SettingsDismissKeyboard>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ── Popup Langue ────────────────────────────────────────────────────────
export const SettingsLanguagePopup = ({ theme, popupVisible, popupClose, language, setLanguageToFrench, setLanguageToEnglish, setLanguageToSpanish }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={popupClose}>
            <TouchableWithoutFeedback onPress={popupClose}>
                <View style={theme.popup.background}>
                    <View style={theme.popup.container}>
                        <View style={theme.popup.header}>
                            <Text style={theme.popup.textHeader}>{Translator.get('LANGUAGE').toUpperCase()}</Text>
                            <TouchableOpacity onPress={popupClose}>
                                <MaterialIcons name="close" size={32} style={theme.popup.closeIcon} />
                            </TouchableOpacity>
                        </View>
                        <Text style={theme.popup.textDescription}>{Translator.get('YOUR_LANGUAGE')}</Text>
                        <View style={{ marginVertical: 8 }}>
                            <TouchableOpacity onPress={setLanguageToFrench} style={theme.popup.radioContainer}>
                                <MaterialIcons name={language === 'fr' ? 'radio-button-on' : 'radio-button-off'} size={24} color={theme.popup.radioIconColor} />
                                <Text style={theme.popup.radioText}>{Translator.get('FRENCH')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={setLanguageToEnglish} style={theme.popup.radioContainer}>
                                <MaterialIcons name={language === 'en' ? 'radio-button-on' : 'radio-button-off'} size={24} color={theme.popup.radioIconColor} />
                                <Text style={theme.popup.radioText}>{Translator.get('ENGLISH')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={setLanguageToSpanish} style={theme.popup.radioContainer}>
                                <MaterialIcons name={language === 'es' ? 'radio-button-on' : 'radio-button-off'} size={24} color={theme.popup.radioIconColor} />
                                <Text style={theme.popup.radioText}>{Translator.get('SPANISH')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── Popup Réinitialisation ──────────────────────────────────────────────
export const SettingsResetPopup = ({ theme, popupVisible, popupClose, resetApp }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={popupClose}>
            <TouchableWithoutFeedback onPress={popupClose}>
                <View style={theme.popup.background}>
                    <View style={theme.popup.container}>
                        <View style={theme.popup.header}>
                            <Text style={theme.popup.textHeader}>{Translator.get('RESET_APP').toUpperCase()}</Text>
                            <TouchableOpacity onPress={popupClose}>
                                <MaterialIcons name="close" size={32} style={theme.popup.closeIcon} />
                            </TouchableOpacity>
                        </View>
                        <Text style={theme.popup.textDescription}>{Translator.get('RESET_APP_CONFIRMATION')}</Text>
                        <View style={theme.popup.buttonContainer}>
                            <TouchableOpacity style={theme.popup.buttonSecondary} onPress={popupClose}>
                                <Text style={theme.popup.buttonTextSecondary}>{Translator.get('CANCEL')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={theme.popup.buttonMain} onPress={resetApp}>
                                <Text style={theme.popup.buttonTextMain}>{Translator.get('RESET')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};
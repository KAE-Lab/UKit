import React, { useRef, useState } from 'react';
import {
    Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback,
    ScrollView, Platform, FlatList, TextInput, KeyboardAvoidingView, Keyboard, SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { SettingsManager } from '../../../shared/services/AppCore';
import { PlanningDataManager as DataManager } from '../../Planning/services/PlanningDataManager';
import type { UeRencontree } from '../../Planning/services/PlanningAssembly';

// ── Utilitaire Clavier ──────────────────────────────────────────────────
export const SettingsDismissKeyboard = ({ children }: { children: React.ReactNode }) => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {children}
    </TouchableWithoutFeedback>
);

// ── Popup Calendrier ────────────────────────────────────────────────────
export const SettingsCalendarPopup = ({ theme, popupVisible, popupClose, selectedCalendar, setCalendar }: { theme: import('../../../shared/theme/Theme').AppThemeType['settings']; popupVisible: boolean; popupClose: () => void; selectedCalendar: string | number; setCalendar: (cal: import('expo-calendar').Calendar | 'UKit') => void }) => {
    function setDefaultCalendar() {
        setCalendar('UKit');
    }

    const calendars = SettingsManager.getCalendars().filter((cal) => cal.title !== 'UKit');
    const ukitCalendar = SettingsManager.getCalendars().find((cal) => cal.title === 'UKit');

    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={popupClose}>
            <TouchableWithoutFeedback onPress={popupClose}>
                <View style={theme.popup.background as never}>
                    <View style={theme.popup.container as never}>
                        <View style={theme.popup.header as never}>
                            <Text style={theme.popup.textHeader}>
                                {Translator.get('CALENDAR')}
                            </Text>
                            <TouchableOpacity onPress={popupClose} hitSlop={12}>
                                <MaterialIcons name="close" size={24} style={theme.popup.closeIcon} />
                            </TouchableOpacity>
                        </View>
                        <Text style={theme.popup.textDescription}>
                            {Translator.get('YOUR_CALENDAR')}
                        </Text>
                        <ScrollView style={{ marginVertical: tokens.space.sm }}>
                            <TouchableOpacity onPress={setDefaultCalendar} style={theme.popup.radioContainer as never}>
                                <MaterialIcons
                                    name={selectedCalendar === 'UKit' || selectedCalendar === ukitCalendar?.id ? 'radio-button-on' : 'radio-button-off'}
                                    size={24}
                                    color={theme.popup.radioIconColor}
                                />
                                <Text style={theme.popup.radioText}>{Translator.get('UKIT_CALENDAR')}</Text>
                            </TouchableOpacity>

                            <Text style={theme.popup.textDescription}>{Translator.get('EXISTING_CALENDARS')}</Text>

                            {calendars.map((calendar, i) => {
                                const isSelected = selectedCalendar === calendar.id;
                                const _setCalendar = () => setCalendar(calendar);
                                return (
                                    <TouchableOpacity key={calendar.id} onPress={_setCalendar} style={theme.popup.radioContainer as never}>
                                        <MaterialIcons
                                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                            size={24}
                                            color={theme.popup.radioIconColor}
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

/**
 * Un filtre actif : son code, et l'intitule de l'UE quand un planning charge le connait.
 *
 * Le code seul n'etait pas exploitable — `4TIN606U` ne se relie a un cours qu'en ouvrant son emploi du
 * temps. L'intitule existait deja dans la donnee ; l'indexation le jetait
 * (`PlanningAssembly.indexerUes`).
 *
 * `null` est un cas ordinaire : un filtre saisi a la main, ou herite d'une annee precedente, nomme une
 * UE qu'aucun planning charge ne porte. L'ecran affiche alors le code seul, comme avant.
 */
const FiltreActif = ({ theme, code }: { theme: import('../../../shared/theme/Theme').AppThemeType['settings']; code: string }) => {
    const nom = DataManager.nomDUE(code);

    return (
        <TouchableOpacity
            onLongPress={() => SettingsManager.removeFilters(code)}
            style={[
                theme.popup.filters.button as never,
                { flex: 1, minWidth: 0, alignItems: 'flex-start', flexDirection: 'column' },
            ]}
        >
            <Text style={theme.popup.filters.buttonText}>{code}</Text>
            {nom !== null ? (
                <Text
                    numberOfLines={2}
                    style={{ fontSize: tokens.fontSize.xs, color: theme.popup.filters.iconColor, marginTop: tokens.space.xxs }}
                >
                    {nom}
                </Text>
            ) : null}
        </TouchableOpacity>
    );
};

// ── Popup Filtres ───────────────────────────────────────────────────────
export const SettingsFiltersPopup = ({ theme, popupVisible, popupClose, filterList, filterTextInput, setFilterTextInput, submitFilterTextInput }: { theme: import('../../../shared/theme/Theme').AppThemeType['settings']; popupVisible: boolean; popupClose: () => void; filterList: string[]; filterTextInput: string | null; setFilterTextInput: (input: string) => void; submitFilterTextInput: () => void }) => {
    const flatListRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [availableUEs, setAvailableUEs] = useState(DataManager.getUEs());
    const scrollToEnd = () => flatListRef.current?.scrollToEnd();

    // Subscribe to UE updates
    React.useEffect(() => {
        const updateUEs = (ues: UeRencontree[]) => setAvailableUEs([...ues]);
        DataManager.on('availableUEs', updateUEs);
        // Refresh on open
        setAvailableUEs(DataManager.getUEs());
    }, [popupVisible]);

    // La recherche porte sur le code **et** sur l'intitule : personne ne retient `4TIN606U`, tout le
    // monde retient « Histoire ».
    const filteredSuggestions = searchQuery.length > 0
        ? availableUEs.filter(ue =>
            (ue.code.toUpperCase().includes(searchQuery.toUpperCase()) ||
                ue.nom.toUpperCase().includes(searchQuery.toUpperCase())) &&
            !filterList.includes(ue.code)
        )
        : [];

    const renderFilterItem = ({ item }: { item: string }) => <FiltreActif theme={theme} code={item} />;

    const addFilterTextInput = () => {
        submitFilterTextInput();
        setTimeout(() => scrollToEnd(), 500);
    };

    const onSuggestionPress = (ue: string) => {
        SettingsManager.addFilters(ue);
        setSearchQuery('');
        setTimeout(() => scrollToEnd(), 500);
    };

    return (
        <Modal animationType="slide" transparent={true} visible={popupVisible} onRequestClose={popupClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <SettingsDismissKeyboard>
                        <View style={theme.popup.filters.container as never}>
                            <View style={theme.popup.filters.header as never}>
                                <Text style={theme.popup.textHeader}>{Translator.get('FILTERS')}</Text>
                                <TouchableOpacity onPress={popupClose} hitSlop={12}>
                                    <MaterialIcons name="close" size={24} style={theme.popup.closeIcon} />
                                </TouchableOpacity>
                            </View>

                            <Text style={theme.popup.textDescription}>
                                {Translator.get('REMOVE_FILTER')}
                            </Text>

                            {/* ── Active filters list ── */}
                            <View style={theme.popup.filterListContainer as never}>
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

                            {/* ── Search / Suggestions ── */}
                            <SearchAndSuggestions 
                                availableUEs={availableUEs} 
                                searchQuery={searchQuery} 
                                setSearchQuery={setSearchQuery} 
                                filteredSuggestions={filteredSuggestions} 
                                onSuggestionPress={onSuggestionPress} 
                                theme={theme} 
                            />

                            {/* ── Manual input ── */}
                            <View style={theme.popup.filters.footer as never}>
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
                            <Text style={theme.popup.textDescription}>
                                {Translator.get('FILTERS_ENTER_CODE')}
                            </Text>
                        </View>
                    </SettingsDismissKeyboard>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const SearchAndSuggestions = ({ availableUEs, searchQuery, setSearchQuery, filteredSuggestions, onSuggestionPress, theme }) => {
    if (availableUEs.length === 0) return null;
    return (
        <View style={{ marginHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}>
            <TextInput
                style={[theme.popup.textInput, { marginHorizontal: 0, marginBottom: tokens.space.sm }]}
                onChangeText={setSearchQuery}
                value={searchQuery}
                placeholder={Translator.get('SEARCH_UE')}
                placeholderTextColor={theme.popup.textInputPlaceholderColor}
                autoCorrect={false}
                keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
            />
            {filteredSuggestions.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: tokens.space.xs }}
                    contentContainerStyle={{ paddingVertical: tokens.space.xs }}
                    keyboardShouldPersistTaps="handled"
                >
                    {filteredSuggestions.map((ue) => (
                        <TouchableOpacity
                            key={ue.code}
                            onPress={() => onSuggestionPress(ue.code)}
                            style={{
                                paddingHorizontal: tokens.space.sm,
                                paddingVertical: tokens.space.xs,
                                borderRadius: tokens.radius.sm,
                                marginRight: tokens.space.sm,
                                borderWidth: 1,
                                // `iconColor` (la teinte pleine) et non `filters.button.backgroundColor`,
                                // qui est un bleu a 8 % d'opacite prevu comme **fond** : employe en couleur
                                // de texte il rendait la pastille quasi illisible. Le repli `|| '#009ee0'`
                                // qui le doublait ne s'est jamais declenche — la valeur existe (jalon 6-K).
                                borderColor: theme.popup.filters.iconColor,
                                backgroundColor: 'transparent',
                            }}
                        >
                            <Text style={{
                                fontSize: tokens.fontSize.xs,
                                fontWeight: tokens.fontWeight.semibold,
                                color: theme.popup.filters.iconColor,
                            }}>
                                {/* Le code identifie, l'intitule reconnait : les deux, ou le code seul. */}
                                {ue.nom === '' ? ue.code : `${ue.code} · ${ue.nom}`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
            {searchQuery.length > 0 && filteredSuggestions.length === 0 && (
                <Text style={[theme.popup.textDescription, { fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xs }]}>
                    {Translator.get('NO_UE_FOUND')}
                </Text>
            )}
        </View>
    );
};

// ── Popup Langue ────────────────────────────────────────────────────────
export const SettingsLanguagePopup = ({ theme, popupVisible, popupClose, language, setLanguageToFrench, setLanguageToEnglish, setLanguageToSpanish }: { theme: import('../../../shared/theme/Theme').AppThemeType['settings']; popupVisible: boolean; popupClose: () => void; language: string; setLanguageToFrench: () => void; setLanguageToEnglish: () => void; setLanguageToSpanish: () => void }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={popupVisible} onRequestClose={popupClose}>
            <TouchableWithoutFeedback onPress={popupClose}>
                <View style={theme.popup.background as never}>
                    <View style={theme.popup.container as never}>
                        <View style={theme.popup.header as never}>
                            <Text style={theme.popup.textHeader}>{Translator.get('LANGUAGE')}</Text>
                            <TouchableOpacity onPress={popupClose} hitSlop={12}>
                                <MaterialIcons name="close" size={24} style={theme.popup.closeIcon} />
                            </TouchableOpacity>
                        </View>
                        <Text style={theme.popup.textDescription}>{Translator.get('YOUR_LANGUAGE')}</Text>
                        <View style={{ marginVertical: tokens.space.sm }}>
                            <TouchableOpacity onPress={setLanguageToFrench} style={theme.popup.radioContainer as never}>
                                <MaterialIcons name={language === 'fr' ? 'radio-button-on' : 'radio-button-off'} size={24} color={theme.popup.radioIconColor} />
                                <Text style={[theme.popup.radioText, { flexShrink: 1, marginLeft: tokens.space.sm, fontWeight: tokens.fontWeight.semibold }]}>{Translator.get('FRENCH')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={setLanguageToEnglish} style={theme.popup.radioContainer as never}>
                                <MaterialIcons name={language === 'en' ? 'radio-button-on' : 'radio-button-off'} size={24} color={theme.popup.radioIconColor} />
                                <Text style={[theme.popup.radioText, { flexShrink: 1, marginLeft: tokens.space.sm, fontWeight: tokens.fontWeight.semibold }]}>{Translator.get('ENGLISH')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={setLanguageToSpanish} style={theme.popup.radioContainer as never}>
                                <MaterialIcons name={language === 'es' ? 'radio-button-on' : 'radio-button-off'} size={24} color={theme.popup.radioIconColor} />
                                <Text style={[theme.popup.radioText, { flexShrink: 1, marginLeft: tokens.space.sm, fontWeight: tokens.fontWeight.semibold }]}>{Translator.get('SPANISH')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── Popup Réinitialisation ──────────────────────────────────────────────
/**
 * La confirmation d'extinction de la synchronisation calendrier.
 *
 * Elle existe parce que le geste est **destructif hors de l'application** : il retire des evenements
 * de l'agenda personnel de l'utilisateur, que d'autres applications lisent. Le texte dit les deux
 * moities de ce qui se passe — ce qui part, et ce qui ne bouge pas — parce que « desactiver » ne
 * laisse pas deviner que ca efface quelque chose.
 */
export const SettingsSyncOffPopup = ({ theme, popupVisible, popupClose, disableSync }: { theme: import('../../../shared/theme/Theme').AppThemeType['settings']; popupVisible: boolean; popupClose: () => void; disableSync: () => void }) => {
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
                                <Text style={theme.popup.buttonTextSecondary as never}>{Translator.get('CANCEL')}</Text>
                            </TouchableOpacity>
                            {/* Destructif : l'extinction retire de l'agenda personnel les cours deja poses. */}
                            <TouchableOpacity style={theme.popup.buttonDestructive as never} onPress={disableSync}>
                                <Text style={theme.popup.buttonTextDestructive as never}>{Translator.get('DISABLE')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export const SettingsResetPopup = ({ theme, popupVisible, popupClose, resetApp }: { theme: import('../../../shared/theme/Theme').AppThemeType['settings']; popupVisible: boolean; popupClose: () => void; resetApp: () => void }) => {
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
                                <Text style={theme.popup.buttonTextSecondary as never}>{Translator.get('CANCEL')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={theme.popup.buttonDestructive as never} onPress={resetApp}>
                                <Text style={theme.popup.buttonTextDestructive as never}>{Translator.get('RESET')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};
/**
 * L'ecran des filtres d'UE : ce que le planning ne doit pas afficher.
 *
 * C'etait une modale qui prenait tout l'ecran — une sous-page qui ne disait pas son nom, sans
 * en-tete de navigation ni geste de retour, et elle portait trois defauts mesures : le retrait d'un
 * filtre passait par un **appui long** qu'aucun signe n'annoncait (le texte francais promettait
 * d'ailleurs une croix qui n'existait pas), le champ de saisie **gardait son code** apres l'ajout,
 * et l'abonnement aux UE disponibles ne se desabonnait jamais — il s'empilait a chaque ouverture.
 *
 * L'ecran parle le vocabulaire des Reglages dont il vient : intertitres en petites capitales,
 * rangees-cartes blanches, et la croix de retrait est un vrai bouton.
 *
 * La donnee vit dans les managers (`SettingsManager` pour les filtres, `PlanningDataManager` pour
 * les UE rencontrees) : l'ecran s'abonne, il ne possede rien — c'est ce qui permet au bouton de
 * retrait de filtre d'une fiche de cours d'ecrire dans la meme liste sans le connaitre.
 *
 * Voir docs/features/settings.md.
 */

import React, { useContext, useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext, SettingsManager } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { HEADER_OFFSET } from '../../../shared/ui/ScreenState';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { SettingsTextHeader } from '../components/SettingsSections';
import { PlanningDataManager as DataManager } from '../../Planning/services/PlanningDataManager';
import type { UeRencontree } from '../../Planning/services/PlanningAssembly';

type ThemeSettings = import('../../../shared/theme/Theme').AppThemeType['settings'];

/** Un filtre actif : son code, l'intitule quand un planning charge le connait, et sa croix. */
function RangeeDeFiltre({ code, themeSettings, couleurNom, onRetirer }: { code: string; themeSettings: ThemeSettings; couleurNom: string; onRetirer: () => void }) {
    const nom = DataManager.nomDUE(code);

    return (
        <View style={[themeSettings.button, { alignItems: 'center' }] as never}>
            <View style={{ flex: 1 }}>
                <Text style={themeSettings.buttonMainText as never}>{code}</Text>
                {nom !== null ? (
                    <Text
                        numberOfLines={2}
                        style={{ fontSize: tokens.fontSize.xs, color: couleurNom, marginHorizontal: tokens.space.md, marginTop: tokens.space.xxs }}
                    >
                        {nom}
                    </Text>
                ) : null}
            </View>
            {/* Un vrai geste de retrait, a la place de l'appui long qu'aucun signe n'annoncait. */}
            <TouchableOpacity onPress={onRetirer} hitSlop={12} style={{ paddingHorizontal: tokens.space.md }}>
                <MaterialIcons name="close" size={20} color={couleurNom} />
            </TouchableOpacity>
        </View>
    );
}

/**
 * La carte d'ajout : recherche parmi les UE rencontrees, ou saisie du code.
 *
 * Elle possede ses deux champs : la recherche et le code n'existent que le temps d'un ajout, et ils
 * se vident quand il aboutit — un code qui reste dans le champ apres l'ajout se lit comme un ajout
 * qui n'a pas pris.
 */
function CarteAjout({ theme, themeSettings, ues, filtres }: { theme: import('../../../shared/theme/Theme').AppThemeType; themeSettings: ThemeSettings; ues: UeRencontree[]; filtres: string[] }) {
    const [recherche, setRecherche] = useState('');
    const [codeManuel, setCodeManuel] = useState('');

    // La recherche porte sur le code **et** sur l'intitule : personne ne retient `4TIN606U`, tout le
    // monde retient « Histoire ».
    const suggestions = recherche.length > 0
        ? ues.filter((ue) =>
            (ue.code.toUpperCase().includes(recherche.toUpperCase())
                || ue.nom.toUpperCase().includes(recherche.toUpperCase()))
            && !filtres.includes(ue.code))
        : [];

    const ajouter = (code: string) => {
        SettingsManager.addFilters(code.toUpperCase());
        setRecherche('');
        setCodeManuel('');
    };

    const ajouterLeCodeManuel = () => {
        const code = codeManuel.trim();
        if (code !== '') ajouter(code);
    };

    return (
        <View style={[themeSettings.button, { flexDirection: 'column', alignItems: 'stretch', padding: tokens.space.md }] as never}>
            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 20, marginBottom: tokens.space.sm }}>
                {Translator.get('FILTERS_ENTER_CODE')}
            </Text>

            {/* La recherche n'a de sens que si un planning a deja rapporte des UE. */}
            {ues.length > 0 ? (
                <TextInput
                    style={[themeSettings.popup.textInput, { marginRight: 0, marginBottom: tokens.space.sm }] as never}
                    onChangeText={setRecherche}
                    value={recherche}
                    placeholder={Translator.get('SEARCH_UE')}
                    placeholderTextColor={themeSettings.popup.textInputPlaceholderColor}
                    autoCorrect={false}
                    keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
                />
            ) : null}

            {suggestions.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm, marginBottom: tokens.space.sm }}>
                    {suggestions.map((ue) => (
                        <TouchableOpacity
                            key={ue.code}
                            onPress={() => ajouter(ue.code)}
                            style={{
                                paddingHorizontal: tokens.space.sm,
                                paddingVertical: tokens.space.xs,
                                borderRadius: tokens.radius.sm,
                                borderWidth: 1,
                                borderColor: themeSettings.popup.filters.iconColor,
                            }}
                        >
                            <Text style={{
                                fontSize: tokens.fontSize.xs,
                                fontWeight: tokens.fontWeight.semibold,
                                color: themeSettings.popup.filters.iconColor,
                            }}>
                                {/* Le code identifie, l'intitule reconnait : les deux, ou le code seul. */}
                                {ue.nom === '' ? ue.code : `${ue.code} · ${ue.nom}`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : null}

            {recherche.length > 0 && suggestions.length === 0 ? (
                <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, marginBottom: tokens.space.sm }}>
                    {Translator.get('NO_UE_FOUND')}
                </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                    style={themeSettings.popup.textInput as never}
                    onChangeText={(texte) => setCodeManuel(texte.toUpperCase())}
                    value={codeManuel}
                    placeholder="4TIN603U"
                    placeholderTextColor={themeSettings.popup.textInputPlaceholderColor}
                    autoCorrect={false}
                    keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
                    onSubmitEditing={ajouterLeCodeManuel}
                />
                <TouchableOpacity onPress={ajouterLeCodeManuel} hitSlop={8}>
                    <MaterialIcons name="add" size={28} color={themeSettings.popup.textInputIconColor} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function FiltersScreen({ onAnimatedScroll }: { onAnimatedScroll?: (event: unknown) => void }) {
    const { themeName } = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const theme = style.Theme[themeName ?? 'light'];
    const themeSettings = theme.settings;

    const [filtres, setFiltres] = useState<string[]>(SettingsManager.getFilters());
    const [ues, setUes] = useState<UeRencontree[]>(DataManager.getUEs());

    useEffect(() => {
        const relireFiltres = () => setFiltres([...SettingsManager.getFilters()]);
        const relireUes = (liste: UeRencontree[]) => setUes([...liste]);
        SettingsManager.on('filter', relireFiltres);
        DataManager.on('availableUEs', relireUes);
        return () => {
            SettingsManager.unsubscribe('filter', relireFiltres);
            DataManager.unsubscribe('availableUEs', relireUes);
        };
    }, []);

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
                    {/* Le defilement nourrit l'animation d'en-tete : le titre s'efface quand le
                        contenu monte, au lieu de le laisser passer derriere. */}
                    <Animated.ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        onScroll={onAnimatedScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={{
                            paddingTop: (insets?.top ?? 0) + HEADER_OFFSET,
                            paddingBottom: tokens.space.xxl,
                        }}
                    >
                        <SettingsTextHeader theme={themeSettings} text={Translator.get('FILTERS_ACTIVE')} />

                        {filtres.length === 0 ? (
                            <View style={[themeSettings.button, { alignItems: 'center' }] as never}>
                                {/* `buttonSecondaryText` porte un `marginLeft: 'auto'` — la valeur a
                                    droite d'une rangee de reglage. Ici le texte est seul : il se cale
                                    a gauche, comme un libelle. */}
                                <Text style={[themeSettings.buttonSecondaryText, { marginLeft: tokens.space.md }] as never}>
                                    {Translator.get('NO_FILTER')}
                                </Text>
                            </View>
                        ) : (
                            filtres.map((code) => (
                                <RangeeDeFiltre
                                    key={code}
                                    code={code}
                                    themeSettings={themeSettings}
                                    couleurNom={theme.fontSecondary}
                                    onRetirer={() => SettingsManager.removeFilters(code)}
                                />
                            ))
                        )}

                        <SettingsTextHeader theme={themeSettings} text={Translator.get('FILTERS_ADD')} />

                        <CarteAjout theme={theme} themeSettings={themeSettings} ues={ues} filtres={filtres} />
                    </Animated.ScrollView>
                </KeyboardAvoidingView>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
}

export default withHeaderAnimation(FiltersScreen);

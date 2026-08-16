/**
 * Les etapes du parcours d'accueil, et rien d'autre.
 *
 * Elles vivaient dans `WelcomeScreen.tsx` jusqu'au jalon 6-G ; l'etape d'etablissement l'aurait porte
 * au-dela des 400 lignes, et un ecran qui compose n'a pas a porter le detail de cinq mises en page.
 * L'ecran garde ce qui decide — l'enchainement, les valeurs par defaut, la bascule de `firstload` —
 * et ce fichier ne fait que rendre.
 *
 * Voir docs/features/onboarding.md.
 */

import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View, Platform } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import Translator from '../../../shared/i18n/Translator';
import { tokens } from '../../../shared/theme/Theme';
import type { Etablissement } from '../../../shared/etablissements';
// Deux dependances croisees entre features, et elles sont volontaires — voir la section
// « Dependances entre features » de docs/architecture.md. L'accueil propose depuis le jalon 6-J deux
// gestes qui appartiennent a d'autres domaines : se connecter au compte universitaire, et coller un
// lien d'emploi du temps. Les recopier ici ferait deux formulaires vers le meme trousseau, qui
// divergeraient a la premiere correction — exactement ce que le partage evite.
import ScolariteLoginView from '../../Scolarite/components/ScolariteLoginView';
import LienEdtForm from '../../Planning/components/LienEdtForm';

type ThemeObj = Record<string, string>;

const MAXIMUM_NUMBER_ITEMS_GROUPLIST = 10;

/** La carte qui enveloppe chaque groupe de choix. Une seule definition, cinq usages. */
const carte = (themeObj: ThemeObj) => ({
    backgroundColor: themeObj.cardBackground,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    marginBottom: tokens.space.md,
    borderWidth: 1,
    borderColor: themeObj.border,
    ...tokens.shadow.sm,
});

const titreDeCarte = (themeObj: ThemeObj) => ({
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: themeObj.font,
    marginBottom: tokens.space.md,
});

/** Une pastille de choix : le motif visuel de tout le parcours, factorise plutot que recopie. */
const pastille = (themeObj: ThemeObj, selected: boolean) => ({
    backgroundColor: themeObj.greyBackground,
    borderWidth: 2,
    borderColor: selected ? themeObj.primary : 'transparent',
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginRight: tokens.space.sm,
    marginBottom: tokens.space.sm,
});

const texteDePastille = (themeObj: ThemeObj, selected: boolean) => ({
    color: selected ? themeObj.primary : themeObj.fontSecondary,
    fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium,
    fontSize: tokens.fontSize.sm,
});

export const WelcomePagination = ({ pageNumber, maxPage, themeObj }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: tokens.space.md }}>
        {Array.from({ length: pageNumber }).map((_, i) => <View key={`f-${i}`} style={{ width: 24, height: 8, marginHorizontal: tokens.space.xs, borderRadius: tokens.radius.md, backgroundColor: themeObj.primary }} />)}
        {Array.from({ length: maxPage - pageNumber }).map((_, i) => <View key={`e-${i}`} style={{ width: 8, height: 8, marginHorizontal: tokens.space.xs, borderRadius: tokens.radius.md, backgroundColor: themeObj.greyBackground }} />)}
    </View>
);

export const WelcomeBackButton = ({ onPress, visible, themeObj, topInset }) => (
    <TouchableOpacity
        onPress={onPress}
        disabled={!visible}
        style={{
            position: 'absolute',
            top: (topInset || 0),
            left: tokens.space.md,
            zIndex: 10,
            opacity: visible ? 1 : 0,
            padding: tokens.space.xs
        }}
    >
        <MaterialIcons name="arrow-back" size={28} color={themeObj.font} />
    </TouchableOpacity>
);

export const StepIntro = ({ themeObj }) => (
    <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl, paddingBottom: 100 }}>
        <Image source={require('../../../../assets/icons/logo.png')} style={{ width: 200, height: 100, resizeMode: 'contain', marginBottom: tokens.space.xl }} />
        <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: themeObj.font, textAlign: 'center', marginBottom: tokens.space.sm }}>{Translator.get('WELCOME')}</Text>
        <Text style={{ fontSize: tokens.fontSize.md, color: themeObj.fontSecondary, textAlign: 'center', lineHeight: 24 }}>{Translator.get('SETTINGS_TO_MAKE')}</Text>
    </View>
);

/**
 * Le choix de l'etablissement, juste avant les groupes qu'il conditionne (jalon 6-G).
 *
 * Les universites sont des **lignes pleine largeur** et non des pastilles : un nom d'universite ne
 * tient pas sur une puce, et le tronquer donnerait trois libelles indiscernables.
 */
export const StepEtablissement = ({ themeObj, etablissements, codeActif, selectEtablissement }) => (
    <ScrollView style={{ flexGrow: 1, paddingHorizontal: tokens.space.md }} contentContainerStyle={{ paddingTop: tokens.space.xxl * 2, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={carte(themeObj)}>
            <Text style={titreDeCarte(themeObj)}>{Translator.get('YOUR_INSTITUTION')}</Text>
            {etablissements.map((etablissement: Etablissement) => {
                const selected = etablissement.code === codeActif;
                return (
                    <TouchableOpacity
                        key={etablissement.code}
                        onPress={() => selectEtablissement(etablissement.code)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: themeObj.greyBackground,
                            borderWidth: 2,
                            borderColor: selected ? themeObj.primary : 'transparent',
                            paddingVertical: tokens.space.md,
                            paddingHorizontal: tokens.space.md,
                            borderRadius: tokens.radius.md,
                            marginBottom: tokens.space.sm,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            {/* Le nom vient du catalogue : c'est une donnee, pas un libelle traduit. */}
                            <Text style={{ color: selected ? themeObj.primary : themeObj.font, fontWeight: tokens.fontWeight.bold, fontSize: tokens.fontSize.sm }}>
                                {etablissement.nom}
                            </Text>
                            {etablissement.ville !== null && (
                                <Text style={{ color: themeObj.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: 2 }}>
                                    {etablissement.ville}
                                </Text>
                            )}
                        </View>
                        {selected && <MaterialCommunityIcons name="check-circle" size={20} color={themeObj.primary} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    </ScrollView>
);

export const StepPreferences = ({ themeObj, navigatorState, themeList, languageList, selectTheme, selectLanguage }) => (
    <ScrollView style={{ flexGrow: 1, paddingHorizontal: tokens.space.md }} contentContainerStyle={{ paddingTop: tokens.space.xxl * 2 }} showsVerticalScrollIndicator={false}>
        <View style={carte(themeObj)}>
            <Text style={titreDeCarte(themeObj)}>{Translator.get('YOUR_THEME')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {themeList.map((themeEntry) => {
                    const selected = navigatorState.theme === themeEntry.id;
                    return (
                        <TouchableOpacity key={themeEntry.id} onPress={() => selectTheme(themeEntry)} style={pastille(themeObj, selected)}>
                            <Text style={texteDePastille(themeObj, selected)}>{Translator.get(themeEntry.title)}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
        <View style={carte(themeObj)}>
            <Text style={titreDeCarte(themeObj)}>{Translator.get('YOUR_LANGUAGE')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {languageList.map((langEntry) => {
                    const selected = navigatorState.language === langEntry.id;
                    return (
                        <TouchableOpacity key={langEntry.id} onPress={() => selectLanguage(langEntry)} style={pastille(themeObj, selected)}>
                            <Text style={texteDePastille(themeObj, selected)}>{Translator.get(langEntry.title)}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    </ScrollView>
);

/**
 * Le pied de la liste de groupes : ce qu'on ne montre pas, et pourquoi.
 *
 * Trois etats, et ils disent trois choses differentes — des resultats caches, aucun resultat, ou
 * simplement l'invitation a affiner. Les confondre ferait croire a une liste vide la ou il y a
 * seulement trop de monde.
 */
export const WelcomeGroupFooter = ({ themeObj, textFilter, filtres }) => {
    const style = { color: themeObj.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: tokens.space.sm, textAlign: 'center' as const };

    if (textFilter && filtres.length > MAXIMUM_NUMBER_ITEMS_GROUPLIST) {
        return (
            <View style={{ marginTop: tokens.space.sm }}>
                <Text style={{ ...style, marginTop: 0 }}>
                    {Translator.get('HIDDEN_RESULT', filtres.length - MAXIMUM_NUMBER_ITEMS_GROUPLIST)}
                </Text>
                <Text style={{ ...style, marginTop: 4 }}>{Translator.get('USE_SEARCH_BAR')}</Text>
            </View>
        );
    }
    if (textFilter && filtres.length === 0) {
        return <Text style={style}>{Translator.get('NO_GROUP_FOUND_WITH_THIS_SEARCH')}</Text>;
    }
    return <Text style={style}>{Translator.get('USE_SEARCH_BAR')}</Text>;
};

/**
 * L'etape des groupes.
 *
 * `parAnnee` decide de la presence du tri annee/semestre, et c'est la **source** qui le dit, pas
 * l'etablissement : Celcat publie plusieurs centaines de groupes qu'il faut reduire, un referentiel
 * iCalendar en compte treize qui tiennent a l'ecran. Les pastilles s'appuyaient sur une table de
 * fragments propre au nommage bordelais — les afficher ailleurs proposait un tri qui ne triait rien
 * (jalon 6-J).
 */
export const StepGroupes = ({ themeObj, navigatorState, yearList, seasonList, filterList, selectGroup, parAnnee = true }) => (
    <ScrollView style={{ flexGrow: 1, paddingHorizontal: tokens.space.md }} contentContainerStyle={{ paddingTop: tokens.space.xxl * 2, paddingBottom: 140 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ ...carte(themeObj), marginBottom: 0 }}>
            {parAnnee && (
                <>
                    <Text style={titreDeCarte(themeObj)}>{Translator.get('YOUR_YEAR')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: tokens.space.lg }}>
                        {yearList.map((yearEntry) => {
                            const selected = navigatorState.year?.id === yearEntry.id;
                            return (
                                <TouchableOpacity
                                    key={yearEntry.id}
                                    onPress={() => filterList(yearEntry, navigatorState.season, navigatorState.textFilter)}
                                    style={{
                                        ...pastille(themeObj, selected),
                                        width: '48%',
                                        alignItems: 'center',
                                        paddingHorizontal: 0,
                                        marginRight: 0,
                                    }}
                                >
                                    <Text style={texteDePastille(themeObj, selected)}>
                                        {Translator.get(yearEntry.title)} {yearEntry.suffix}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={titreDeCarte(themeObj)}>{Translator.get('YOUR_SEMESTER')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: tokens.space.lg }}>
                        {seasonList.map((seasonEntry) => {
                            const selected = navigatorState.season?.id === seasonEntry.id;
                            return (
                                <TouchableOpacity key={seasonEntry.id} onPress={() => filterList(navigatorState.year, seasonEntry, navigatorState.textFilter)} style={pastille(themeObj, selected)}>
                                    <Text style={texteDePastille(themeObj, selected)}>{Translator.get(seasonEntry.title)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </>
            )}

            <Text style={titreDeCarte(themeObj)}>{Translator.get('YOUR_GROUP')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeObj.greyBackground, borderRadius: tokens.radius.md, paddingHorizontal: tokens.space.sm, marginBottom: tokens.space.md }}>
                <MaterialCommunityIcons name="magnify" size={20} color={themeObj.fontSecondary} style={{ marginRight: tokens.space.xs }} />
                <TextInput autoCorrect={false} style={{ flex: 1, paddingVertical: Platform.OS === 'ios' ? tokens.space.md : tokens.space.sm, color: themeObj.font, fontSize: tokens.fontSize.sm }} defaultValue={navigatorState.textFilter} placeholder={Translator.get('GROUP_NAME')} placeholderTextColor={themeObj.fontSecondary} onChangeText={(t) => filterList(navigatorState.year, navigatorState.season, t)} />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {navigatorState.groupListFiltered.slice(0, MAXIMUM_NUMBER_ITEMS_GROUPLIST + 1).map((item: string) => {
                    const selected = navigatorState.groups.includes(item);
                    return (
                        <TouchableOpacity key={item} onPress={() => selectGroup(item)} style={pastille(themeObj, selected)}>
                            <Text style={texteDePastille(themeObj, selected)}>{item}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <WelcomeGroupFooter
                themeObj={themeObj}
                textFilter={navigatorState.textFilter}
                filtres={navigatorState.groupListFiltered}
            />
        </View>
    </ScrollView>
);

/**
 * L'etape du compte universitaire (jalon 6-J).
 *
 * Elle **n'a pas de mise en page a elle** : c'est le formulaire de l'onglet Scolarite, tel quel, avec
 * sa sortie « Plus tard ». Deux formulaires vers le meme trousseau auraient diverge a la premiere
 * correction, et c'est precisement pour rendre ce partage possible que `CredentialsProvider` a remonte
 * au-dessus des deux branches (`rootContainer.tsx`).
 */
export const StepCompte = ({ themeObj, onSuivant }) => (
    <View style={{ flex: 1, paddingTop: tokens.space.xxl }}>
        {/*
          * `onSkip` et `onSuccess` mènent au **même endroit** — l'étape suivante — et c'est voulu : le
          * compte est proposé, pas exigé. Ce qui les distingue est ce qui se passe derrière, pas où
          * l'on va. Sans `onSuccess`, le bouton restait figé sur « Connexion… » une fois la session
          * réussie, parce que rien ne remplace cet écran ici (voir ScolariteLoginView).
          */}
        <ScolariteLoginView
            theme={themeObj}
            color={themeObj.primary}
            topPadding={0}
            onSkip={onSuivant}
            onSuccess={onSuivant}
            compact
        />
    </View>
);

/**
 * L'etape « colle ton lien », pour un etablissement qui publie un abonnement (jalon 6-J).
 *
 * Elle rend le formulaire **en place** et non derriere une navigation : l'accueil vit hors de toute
 * pile (`rootContainer.tsx`), il n'a nulle part ou pousser un ecran. C'est aussi ce qui a decide que
 * la saisie soit un composant et pas un ecran.
 */
export const StepLienEdt = ({ onDone }) => (
    <View style={{ flex: 1, paddingTop: tokens.space.xxl }}>
        {/*
          * `onDone` avance d'une etape. Sans lui, le bouton « Terminer » qui suit une verification
          * reussie ne ferait **rien** — le formulaire l'utilise ailleurs pour refermer son ecran de
          * pile, et un bouton mort au milieu d'un parcours d'accueil est pire que pas de bouton.
          */}
        <LienEdtForm onDone={onDone} />
    </View>
);

export const StepFin = ({ themeObj }) => (
    <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl, paddingBottom: 100 }}>
        <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: tokens.space.xl }}>
            <MaterialCommunityIcons name="check-circle-outline" size={100} color={themeObj.primary} />
        </View>
        <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: themeObj.font, textAlign: 'center', marginBottom: tokens.space.sm }}>{Translator.get('WELL_DONE')}</Text>
        <Text style={{ fontSize: tokens.fontSize.md, color: themeObj.fontSecondary, textAlign: 'center', lineHeight: 24 }}>{Translator.get('APP_READY')}</Text>
    </View>
);

export { MAXIMUM_NUMBER_ITEMS_GROUPLIST };

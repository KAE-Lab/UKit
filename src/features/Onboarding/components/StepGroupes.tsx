/**
 * L'etape des groupes du parcours d'accueil, et son pied.
 *
 * Sortie de `WelcomeSteps.tsx` en 6.1-C, quand elle a gagne ses deux etats — l'attente et l'echec de
 * la liste — et que le fichier des etapes touchait la limite de lignes.
 *
 * Voir docs/features/onboarding.md.
 */

import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Translator from '../../../shared/i18n/Translator';
import { tokens } from '../../../shared/theme/Theme';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import {
    DEGAGEMENT_PIED_PARCOURS,
    MAXIMUM_NUMBER_ITEMS_GROUPLIST,
    carte,
    pastille,
    texteDePastille,
    titreDeCarte,
} from './stylesDuParcours';

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
                <Text style={{ ...style, marginTop: tokens.space.xs }}>{Translator.get('USE_SEARCH_BAR')}</Text>
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
export const StepGroupes = ({ themeObj, navigatorState, yearList, seasonList, filterList, selectGroup, relancerGroupes, parAnnee = true }) => {
    // Une liste vide se dit : une installation hors ligne restait sur une carte muette qui invitait a
    // « affiner » une liste qui n'existait pas (limite ecrite depuis 6-G, corrigee en 6.1-C). Le
    // manager porte l'etat de sa lecture ; l'etape ne fait que le montrer, comme l'etablissement.
    const listeVide = navigatorState.groupList.length === 0;
    const { chargement, echec } = navigatorState.groupesEtat;
    return (
    /*
     * Le cadre clavier vit DANS l'etape, comme pour le compte et le lien iCal (voir WelcomeScreen) :
     * sans lui, le clavier recouvrait les groupes trouves sous le champ de recherche, et rien ne
     * permettait de les atteindre tant qu'on ne le fermait pas (constate sur iPhone le 2026-09-02).
     * `padding` sur les deux plateformes, le comportement valide sur le formulaire de connexion.
     */
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    <ScrollView style={{ flexGrow: 1, paddingHorizontal: tokens.space.md }} contentContainerStyle={{ paddingTop: tokens.space.xxl * 2, paddingBottom: DEGAGEMENT_PIED_PARCOURS }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {listeVide && chargement ? (
            <LoadingState theme={themeObj} message={Translator.get('GROUPS_LOADING')} />
        ) : listeVide && echec !== null ? (
            <SourceFailureNotice failure={echec} theme={themeObj} onRetry={relancerGroupes} variant="card" />
        ) : (
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
        )}
    </ScrollView>
    </KeyboardAvoidingView>
    );
};


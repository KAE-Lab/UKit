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
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import Translator from '../../../shared/i18n/Translator';
import { tokens } from '../../../shared/theme/Theme';
import { LoadingState } from '../../../shared/ui/LoadingState';
import type { Etablissement } from '../../../shared/etablissements';
import { DEGAGEMENT_PIED_PARCOURS, carte, pastille, texteDePastille, titreDeCarte } from './stylesDuParcours';
// Deux dependances croisees entre features, et elles sont volontaires — voir la section
// « Dependances entre features » de docs/architecture.md. L'accueil propose depuis le jalon 6-J deux
// gestes qui appartiennent a d'autres domaines : se connecter au compte universitaire, et coller un
// lien d'emploi du temps. Les recopier ici ferait deux formulaires vers le meme trousseau, qui
// divergeraient a la premiere correction — exactement ce que le partage evite.
import ScolariteLoginView from '../../Scolarite/components/ScolariteLoginView';
import LienEdtForm from '../../Planning/components/LienEdtForm';

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
    <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl, paddingBottom: DEGAGEMENT_PIED_PARCOURS }}>
        <Image source={require('../../../../assets/icons/logo.png')} style={{ width: 200, height: 100, resizeMode: 'contain', marginBottom: tokens.space.xl }} />
        <Text style={{ alignSelf: 'stretch', fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: themeObj.font, textAlign: 'center', marginBottom: tokens.space.sm }}>{Translator.get('WELCOME')}</Text>
        <Text style={{ alignSelf: 'stretch', fontSize: tokens.fontSize.md, color: themeObj.fontSecondary, textAlign: 'center', lineHeight: 24 }}>{Translator.get('SETTINGS_TO_MAKE')}</Text>
    </View>
);

/**
 * Le choix de l'etablissement, juste avant les groupes qu'il conditionne (jalon 6-G).
 *
 * Les universites sont des **lignes pleine largeur** et non des pastilles : un nom d'universite ne
 * tient pas sur une puce, et le tronquer donnerait trois libelles indiscernables.
 *
 * `chargement` : le premier rafraichissement du catalogue n'a pas encore repondu. L'etape le dit
 * plutot que d'afficher une liste qu'elle sait peut-etre en retard — plafonne a quelques secondes
 * par l'appelant, apres quoi la liste connue s'affiche et se complete si le reseau revient (6.1-A).
 */
export const StepEtablissement = ({ themeObj, etablissements, codeActif, selectEtablissement, chargement }) => (
    <ScrollView style={{ flexGrow: 1, paddingHorizontal: tokens.space.md }} contentContainerStyle={{ paddingTop: tokens.space.xxl * 2, paddingBottom: DEGAGEMENT_PIED_PARCOURS }} showsVerticalScrollIndicator={false}>
        <View style={carte(themeObj)}>
            <Text style={titreDeCarte(themeObj)}>{Translator.get('YOUR_INSTITUTION')}</Text>
            {chargement ? (
                <LoadingState theme={themeObj} message={Translator.get('INSTITUTIONS_LOADING')} />
            ) : etablissements.map((etablissement: Etablissement) => {
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
                                <Text style={{ color: themeObj.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: tokens.space.xxs }}>
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
 * L'etape du compte universitaire (jalon 6-J).
 *
 * Elle **n'a pas de mise en page a elle** : c'est le formulaire de l'onglet Scolarite, tel quel, avec
 * sa sortie « Plus tard ». Deux formulaires vers le meme trousseau auraient diverge a la premiere
 * correction, et c'est precisement pour rendre ce partage possible que `CredentialsProvider` a remonte
 * au-dessus des deux branches (`rootContainer.tsx`).
 */
export const StepCompte = ({ themeObj, onSuivant, onConnecte, onAutreCampus, onEnSession }) => (
    /*
     * Le degagement du haut vit dans `topPadding` — DANS le contenu defilant — et pas sur ce
     * conteneur : pose ici, il decoupait le defilement a sa ligne et le contenu disparaissait
     * derriere une bande de la couleur du fond (constate a l'accueil le 2026-08-31).
     */
    <View style={{ flex: 1 }}>
        {/*
          * `onSkip` avance simplement ; `onConnecte` est distinct depuis le 2026-08-31, parce
          * qu'une connexion reussie a pu **regler l'emploi du temps au passage** — les propositions
          * du dossier posent les favoris pendant le parcours froid — et l'ecran d'accueil decide
          * alors de sauter l'etape EDT devenue sans question. Sans `onSuccess`, le bouton restait
          * fige sur « Connexion… » une fois la session reussie (voir ScolariteLoginView).
          */}
        <ScolariteLoginView
            theme={themeObj}
            color={themeObj.primary}
            topPadding={tokens.space.xxl}
            onSkip={onSuivant}
            onSuccess={onConnecte}
            onAutreCampus={onAutreCampus}
            onEnSession={onEnSession}
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
    /* Meme decision que StepCompte : le degagement defile avec le contenu, sans bande de coupe. */
    <View style={{ flex: 1 }}>
        {/*
          * `onDone` avance d'une etape. Sans lui, le bouton « Terminer » qui suit une verification
          * reussie ne ferait **rien** — le formulaire l'utilise ailleurs pour refermer son ecran de
          * pile, et un bouton mort au milieu d'un parcours d'accueil est pire que pas de bouton.
          */}
        {/* Aucun en-tete ici : le parcours d'accueil est rendu hors de la navigation. */}
        <LienEdtForm onDone={onDone} topPadding={tokens.space.xxl + tokens.space.md} />
    </View>
);

export const StepFin = ({ themeObj }) => (
    <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl, paddingBottom: DEGAGEMENT_PIED_PARCOURS }}>
        <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: tokens.space.xl }}>
            <MaterialCommunityIcons name="check-circle-outline" size={100} color={themeObj.primary} />
        </View>
        <Text style={{ alignSelf: 'stretch', fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: themeObj.font, textAlign: 'center', marginBottom: tokens.space.sm }}>{Translator.get('WELL_DONE')}</Text>
        <Text style={{ alignSelf: 'stretch', fontSize: tokens.fontSize.md, color: themeObj.fontSecondary, textAlign: 'center', lineHeight: 24 }}>{Translator.get('APP_READY')}</Text>
    </View>
);

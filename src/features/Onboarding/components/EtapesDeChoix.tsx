/**
 * Les etapes de l'accueil qui posent une question : le theme et la langue, puis l'etablissement
 * (accueil refait, 7-J, direction A).
 *
 * La question en grand titre, a gauche, et ses reponses en tuiles qu'on touche, sans carte qui les
 * enveloppe : les etapes etaient des cartes grises identiques posees en haut d'un ecran vide (review
 * du 2026-11-06). Le theme se choisit sur un **apercu** : chaque tuile rend une vraie journee de cours
 * (`CourseRow`) dans son theme, et le choix repeint l'ecran aussitot, comme avant.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import Translator from '../../../shared/i18n/Translator';
import style, { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { Icon } from '../../../shared/ui/Icon';
import type { Etablissement } from '../../../shared/etablissements';
import { CourseRow } from '../../Planning/components/CourseRow';
import { LogoEtablissement } from '../../Scolarite/components/LogoEtablissement';
import { coursDExemple, MINUTE_D_EXEMPLE } from './exemples';
import { useDegagementDuPied } from './stylesDuParcours';
import type { OptionListee, OptionTheme } from '../hooks/useWelcomeState';

/** Le haut du contenu d'une etape : sous l'en-tete du parcours (retour et progression). */
export const HAUT_D_ETAPE = tokens.space.xxl * 2;

/**
 * Les langues s'ecrivent dans leur propre langue, comme dans tout selecteur de langue : on doit
 * reconnaitre la sienne meme quand l'ecran est dans une autre. Ce ne sont donc pas des libelles a
 * traduire.
 */
const AUTONYMES: Readonly<Record<string, string>> = { fr: 'Français', en: 'English', es: 'Español' };

export function vibrer() {
    void Haptics.selectionAsync().catch(() => undefined);
}

export function TitreDEtape({ theme, children }: { theme: AppThemeType; children: string }) {
    return <Text style={[tokens.texte.grandTitre, styles.titre, { color: theme.font }]}>{children}</Text>;
}

/** Une reponse choisie : le contour d'accent, et la coche ronde. */
export function Coche({ theme, choisie }: { theme: AppThemeType; choisie: boolean }) {
    return (
        <View style={[styles.coche, { borderColor: choisie ? theme.accent : theme.fontTertiary, backgroundColor: choisie ? theme.accent : 'transparent' }]}>
            {choisie ? <Icon icon={{ family: 'material', name: 'check' }} size={14} color={theme.lightFont} /> : null}
        </View>
    );
}

/** Un choix court parmi quelques-uns : la langue, le semestre. Le choisi se pose en relief. */
export function Segments<T extends { id: string }>({ theme, options, choisie, libelle, onChoisir }: {
    theme: AppThemeType;
    options: readonly T[];
    choisie: string | null | undefined;
    libelle: (option: T) => string;
    onChoisir: (option: T) => void;
}) {
    return (
        <View style={[styles.segments, { backgroundColor: theme.greyBackground }]} accessibilityRole="radiogroup">
            {options.map((option) => {
                const estChoisie = choisie === option.id;
                return (
                    <Pressable
                        key={option.id}
                        onPress={() => { vibrer(); onChoisir(option); }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: estChoisie }}
                        style={[styles.segment, estChoisie ? [styles.segmentChoisi, { backgroundColor: theme.cardBackground }] : null]}
                    >
                        <Text style={[styles.texteDeSegment, { color: estChoisie ? theme.font : theme.fontSecondary }]}>{libelle(option)}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

/**
 * L'apercu d'un theme : une journee de cours dessinee a la largeur d'un telephone, puis reduite a
 * celle de la tuile. Dessinee plus etroite, la matiere se coupait au milieu d'un mot.
 */
function ApercuDuTheme({ nom }: { nom: 'light' | 'dark' }) {
    const theme = style.Theme[nom];
    const [largeur, setLargeur] = useState(0);
    const echelle = largeur > 0 ? largeur / DESSIN : 0;
    return (
        <View
            style={[styles.apercu, { backgroundColor: theme.background }]}
            pointerEvents="none"
            onLayout={(evenement) => setLargeur(evenement.nativeEvent.layout.width)}
        >
            <View style={[styles.apercuDessin, { transform: [{ scale: echelle }], opacity: echelle > 0 ? 1 : 0 }]}>
                <Text style={[tokens.texte.grandTitre, styles.apercuJour, { color: theme.font }]}>{Translator.get('TODAY')}</Text>
                {coursDExemple(theme).map((cours) => (
                    <CourseRow key={cours.starttime} data={cours} theme={theme} minute={MINUTE_D_EXEMPLE} />
                ))}
            </View>
        </View>
    );
}

export function StepPreferences({ themeObj, navigatorState, themeList, languageList, selectTheme, selectLanguage }: {
    themeObj: AppThemeType;
    navigatorState: { theme: string; language: string };
    themeList: readonly OptionTheme[];
    languageList: readonly OptionListee[];
    selectTheme: (entree: OptionTheme) => void;
    selectLanguage: (entree: OptionListee) => void;
}) {
    const degagement = useDegagementDuPied();
    return (
        <ScrollView contentContainerStyle={[styles.etape, { paddingBottom: degagement }]} showsVerticalScrollIndicator={false}>
            <TitreDEtape theme={themeObj}>{Translator.get('THEME_QUESTION')}</TitreDEtape>
            <View style={styles.duo}>
                {themeList.map((entree) => {
                    const choisie = navigatorState.theme === entree.id;
                    return (
                        <Pressable
                            key={entree.id}
                            onPress={() => { vibrer(); selectTheme(entree); }}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: choisie }}
                            accessibilityLabel={Translator.get(entree.title)}
                            style={[styles.tuileDeTheme, { backgroundColor: themeObj.cardBackground, borderColor: choisie ? themeObj.accent : themeObj.contourDeCarte }]}
                        >
                            <ApercuDuTheme nom={entree.id === 'dark' ? 'dark' : 'light'} />
                            <View style={styles.piedDeTuile}>
                                <Text style={[styles.libelle, { color: themeObj.font }]}>{Translator.get(entree.title)}</Text>
                                <Coche theme={themeObj} choisie={choisie} />
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            <Text style={[tokens.texte.intertitre, styles.intertitre, { color: themeObj.fontSecondary }]}>{Translator.get('LANGUAGE')}</Text>
            <Segments
                theme={themeObj}
                options={languageList}
                choisie={navigatorState.language}
                libelle={(entree) => AUTONYMES[entree.id] ?? Translator.get(entree.title)}
                onChoisir={selectLanguage}
            />
        </ScrollView>
    );
}

/**
 * Le choix de l'etablissement, juste avant les groupes qu'il conditionne (jalon 6-G) : une tuile
 * pleine largeur par etablissement, son logo en filigrane, son nom et sa ville. `chargement` : le
 * premier rafraichissement du catalogue n'a pas encore repondu (6.1-A).
 */
export function StepEtablissement({ themeObj, etablissements, codeActif, selectEtablissement, chargement }: {
    themeObj: AppThemeType;
    etablissements: readonly Etablissement[];
    codeActif: string | null;
    selectEtablissement: (code: string) => void;
    chargement: boolean;
}) {
    const degagement = useDegagementDuPied();
    return (
        <ScrollView contentContainerStyle={[styles.etape, { paddingBottom: degagement }]} showsVerticalScrollIndicator={false}>
            <TitreDEtape theme={themeObj}>{Translator.get('YOUR_INSTITUTION')}</TitreDEtape>
            {chargement ? (
                <LoadingState theme={themeObj} message={Translator.get('INSTITUTIONS_LOADING')} />
            ) : etablissements.map((etablissement) => {
                const choisie = etablissement.code === codeActif;
                return (
                    <Pressable
                        key={etablissement.code}
                        onPress={() => { vibrer(); selectEtablissement(etablissement.code); }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: choisie }}
                        style={[styles.tuileDEtablissement, { backgroundColor: themeObj.cardBackground, borderColor: choisie ? themeObj.accent : themeObj.contourDeCarte }]}
                    >
                        <View style={styles.logo}>
                            <LogoEtablissement logo={etablissement.logo} theme={themeObj} teinte={themeObj.font} filigrane hauteur={LOGO} />
                        </View>
                        <View style={styles.nom}>
                            {/* Le nom vient du catalogue : c'est une donnee, pas un libelle traduit. */}
                            <Text style={[styles.libelle, { color: themeObj.font }]}>{etablissement.nom}</Text>
                            {etablissement.ville !== null ? (
                                <Text style={[styles.ville, { color: themeObj.fontSecondary }]}>{etablissement.ville}</Text>
                            ) : null}
                        </View>
                        <Coche theme={themeObj} choisie={choisie} />
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const COCHE = 22;
const LOGO = 28;
/** La largeur a laquelle la journee de l'apercu est dessinee : celle d'un telephone. */
const DESSIN = 390;
const HAUTEUR_D_APERCU = 150;

const styles = StyleSheet.create({
    etape: {
        paddingTop: HAUT_D_ETAPE,
        paddingHorizontal: tokens.space.lg,
    },
    titre: {
        alignSelf: 'stretch',
        marginBottom: tokens.space.xl,
    },
    duo: {
        flexDirection: 'row',
        gap: tokens.space.md,
    },
    tuileDeTheme: {
        flex: 1,
        borderRadius: tokens.radius.xl,
        borderWidth: 2,
        padding: tokens.space.sm,
    },
    apercu: {
        height: HAUTEUR_D_APERCU,
        borderRadius: tokens.radius.lg,
        overflow: 'hidden',
    },
    apercuDessin: {
        width: DESSIN,
        padding: tokens.space.md,
        transformOrigin: 'left top',
    },
    apercuJour: {
        marginBottom: tokens.space.sm,
    },
    piedDeTuile: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: tokens.space.xs,
        paddingTop: tokens.space.sm,
    },
    libelle: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    coche: {
        width: COCHE,
        height: COCHE,
        borderRadius: COCHE / 2,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    intertitre: {
        marginTop: tokens.space.xl,
        marginBottom: tokens.space.sm,
        marginLeft: tokens.space.xs,
    },
    segments: {
        flexDirection: 'row',
        borderRadius: tokens.radius.lg,
        padding: tokens.space.xxs,
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: tokens.space.sm + tokens.space.xxs,
        borderRadius: tokens.radius.md,
    },
    segmentChoisi: {
        ...tokens.shadow.sm,
    },
    texteDeSegment: {
        alignSelf: 'stretch',
        textAlign: 'center',
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    tuileDEtablissement: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.md,
        borderRadius: tokens.radius.xl,
        borderWidth: 2,
        paddingVertical: tokens.space.md,
        paddingHorizontal: tokens.space.md,
        marginBottom: tokens.space.sm,
    },
    logo: {
        width: LOGO * 2,
        alignItems: 'center',
    },
    nom: {
        flex: 1,
    },
    ville: {
        fontSize: tokens.fontSize.sm,
        marginTop: tokens.space.xxs,
    },
});

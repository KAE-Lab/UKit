/**
 * L'etape des groupes du parcours d'accueil, et son pied.
 *
 * Sortie de `WelcomeSteps.tsx` en 6.1-C, quand elle a gagne ses deux etats — l'attente et l'echec de
 * la liste — et que le fichier des etapes touchait la limite de lignes.
 *
 * Voir docs/features/onboarding.md.
 */

import React, { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';

import Translator from '../../../shared/i18n/Translator';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import { MAXIMUM_NUMBER_ITEMS_GROUPLIST, useDegagementDuPied } from './stylesDuParcours';
import { Coche, HAUT_D_ETAPE, Segments, TitreDEtape, vibrer } from './EtapesDeChoix';
import type { OptionListee } from '../hooks/useWelcomeState';
import { partiesDuGroupe } from './groupes';
import { Icon } from '../../../shared/ui/Icon';

/**
 * Le pied de la liste de groupes : ce qu'on ne montre pas.
 *
 * Deux etats, des resultats caches ou aucun resultat : les confondre ferait croire a une liste vide
 * la ou il y a seulement trop de monde. L'invitation a « utiliser la barre de recherche » est
 * retiree, la barre est juste au-dessus (review du 2026-11-06).
 */
export const WelcomeGroupFooter = ({ themeObj, textFilter, filtres }) => {
    const style = { color: themeObj.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: tokens.space.sm, textAlign: 'center' as const };

    if (textFilter && filtres.length > MAXIMUM_NUMBER_ITEMS_GROUPLIST) {
        return (
            <Text style={style}>
                {Translator.get('HIDDEN_RESULT', filtres.length - MAXIMUM_NUMBER_ITEMS_GROUPLIST)}
            </Text>
        );
    }
    if (textFilter && filtres.length === 0) {
        return <Text style={style}>{Translator.get('NO_GROUP_FOUND_WITH_THIS_SEARCH')}</Text>;
    }
    return null;
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
function RangeeDeGroupe({ nom, choisie, themeObj, onPress }: { nom: string; choisie: boolean; themeObj: AppThemeType; onPress: () => void }) {
    const { libelle, code } = partiesDuGroupe(nom);
    return (
        <Pressable
            onPress={() => { vibrer(); onPress(); }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: choisie }}
            accessibilityLabel={nom}
            style={[styles.rangee, { backgroundColor: themeObj.cardBackground, borderColor: choisie ? themeObj.accent : themeObj.contourDeCarte }]}
        >
            <View style={styles.nom}>
                <Text style={[styles.libelle, { color: themeObj.font }]} numberOfLines={2}>{libelle}</Text>
                {code !== null ? <Text style={[tokens.texte.chiffres, styles.code, { color: themeObj.fontSecondary }]}>{code}</Text> : null}
            </View>
            <Coche theme={themeObj} choisie={choisie} />
        </Pressable>
    );
}

export const StepGroupes = ({ themeObj, navigatorState, yearList, seasonList, filterList, selectGroup, relancerGroupes, parAnnee = true }) => {
    // Une liste vide se dit : une installation hors ligne restait sur une carte muette qui invitait a
    // « affiner » une liste qui n'existait pas (limite ecrite depuis 6-G, corrigee en 6.1-C). Le
    // manager porte l'etat de sa lecture ; l'etape ne fait que le montrer, comme l'etablissement.
    const listeVide = navigatorState.groupList.length === 0;
    const { chargement, echec } = navigatorState.groupesEtat;
    const degagement = useDegagementDuPied();
    // Le champ monte en haut de la zone visible quand il prend le focus : sur les 360 points de l'A8,
    // le cadre clavier le laissait colle au clavier, et les groupes trouves restaient dessous tant
    // qu'on ne faisait pas defiler (lot 2, audit de l'accueil).
    const defilement = useRef<ScrollView>(null);
    const hautDuChamp = useRef(0);
    const champActif = useRef(false);
    // Le haut de l'etape (`HAUT_D_ETAPE`) est sous la barre de progression : le champ s'arrete juste dessous.
    const monterLeChamp = () => defilement.current?.scrollTo({ y: Math.max(0, hautDuChamp.current - HAUT_D_ETAPE), animated: true });
    // Aussi a l'ouverture du clavier : ferme puis rouvert d'un toucher, le champ garde son focus et
    // `onFocus` ne repart pas. Une image plus tard, apres le defilement natif vers le champ focalise.
    useEffect(() => {
        const abonnement = Keyboard.addListener('keyboardDidShow', () => { if (champActif.current) requestAnimationFrame(monterLeChamp); });
        return () => abonnement.remove();
    }, []);
    return (
    /*
     * Le cadre clavier vit DANS l'etape, comme pour le compte et le lien iCal (voir WelcomeScreen) :
     * sans lui, le clavier recouvrait les groupes trouves sous le champ de recherche, et rien ne
     * permettait de les atteindre tant qu'on ne le fermait pas (constate sur iPhone le 2026-09-02).
     * `padding` sur les deux plateformes, le comportement valide sur le formulaire de connexion.
     */
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    <ScrollView ref={defilement} contentContainerStyle={[styles.etape, { paddingBottom: degagement }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TitreDEtape theme={themeObj}>{Translator.get('YOUR_GROUP')}</TitreDEtape>
        {listeVide && chargement ? (
            <LoadingState theme={themeObj} message={Translator.get('GROUPS_LOADING')} />
        ) : listeVide && echec !== null ? (
            <SourceFailureNotice failure={echec} theme={themeObj} onRetry={relancerGroupes} variant="card" />
        ) : (
        <>
            {parAnnee && (
                <>
                    <Text style={[tokens.texte.intertitre, styles.intertitre, { color: themeObj.fontSecondary }]}>{Translator.get('YOUR_YEAR')}</Text>
                    <View style={styles.annees}>
                        {yearList.map((yearEntry) => {
                            const choisie = navigatorState.year?.id === yearEntry.id;
                            return (
                                <Pressable
                                    key={yearEntry.id}
                                    onPress={() => { vibrer(); filterList(yearEntry, navigatorState.season, navigatorState.textFilter); }}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: choisie }}
                                    style={[styles.annee, { backgroundColor: choisie ? themeObj.accent : themeObj.greyBackground }]}
                                >
                                    <Text style={[styles.texteDAnnee, { color: choisie ? themeObj.lightFont : themeObj.font }]}>
                                        {Translator.get(yearEntry.title)} {yearEntry.suffix}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Text style={[tokens.texte.intertitre, styles.intertitre, { color: themeObj.fontSecondary }]}>{Translator.get('YOUR_SEMESTER')}</Text>
                    <Segments<OptionListee>
                        theme={themeObj}
                        options={seasonList}
                        choisie={navigatorState.season?.id}
                        libelle={(entree) => Translator.get(entree.title)}
                        onChoisir={(entree) => filterList(navigatorState.year, entree, navigatorState.textFilter)}
                    />
                </>
            )}

            <View style={[styles.recherche, { backgroundColor: themeObj.greyBackground }]} onLayout={(e) => { hautDuChamp.current = e.nativeEvent.layout.y; }}>
                <Icon icon={{ name: 'magnify' }} size={20} color={themeObj.fontSecondary} />
                <TextInput autoCorrect={false} style={[styles.champ, { color: themeObj.font }]} defaultValue={navigatorState.textFilter} placeholder={Translator.get('GROUP_NAME')} placeholderTextColor={themeObj.fontSecondary} onChangeText={(t) => filterList(navigatorState.year, navigatorState.season, t)} onFocus={() => { champActif.current = true; monterLeChamp(); }} onBlur={() => { champActif.current = false; }} />
            </View>

            {navigatorState.groupListFiltered.slice(0, MAXIMUM_NUMBER_ITEMS_GROUPLIST + 1).map((item: string) => (
                <RangeeDeGroupe key={item} nom={item} choisie={navigatorState.groups.includes(item)} themeObj={themeObj} onPress={() => selectGroup(item)} />
            ))}
            <WelcomeGroupFooter
                themeObj={themeObj}
                textFilter={navigatorState.textFilter}
                filtres={navigatorState.groupListFiltered}
            />
        </>
        )}
    </ScrollView>
    </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    etape: {
        paddingTop: HAUT_D_ETAPE,
        paddingHorizontal: tokens.space.lg,
    },
    intertitre: {
        marginTop: tokens.space.md,
        marginBottom: tokens.space.sm,
        marginLeft: tokens.space.xs,
    },
    annees: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: tokens.space.sm,
    },
    annee: {
        width: '31.5%',
        alignItems: 'center',
        paddingVertical: tokens.space.md,
        borderRadius: tokens.radius.lg,
    },
    texteDAnnee: {
        alignSelf: 'stretch',
        textAlign: 'center',
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    recherche: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
        borderRadius: tokens.radius.lg,
        paddingHorizontal: tokens.space.md,
        marginTop: tokens.space.xl,
        marginBottom: tokens.space.md,
    },
    champ: {
        flex: 1,
        paddingVertical: Platform.OS === 'ios' ? tokens.space.md : tokens.space.sm,
        fontSize: tokens.fontSize.md,
    },
    rangee: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.md,
        borderRadius: tokens.radius.xl,
        borderWidth: 2,
        paddingVertical: tokens.space.md,
        paddingHorizontal: tokens.space.md,
        marginBottom: tokens.space.sm,
    },
    nom: {
        flex: 1,
    },
    libelle: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    code: {
        fontSize: tokens.fontSize.sm,
        marginTop: tokens.space.xxs,
    },
});

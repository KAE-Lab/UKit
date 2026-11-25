/**
 * Le formulaire de retour natif (phase 8, lot 3 ; docs/phase-8/3-formulaire.md) : un probleme, une idee
 * ou une demande de campus, ecrit dans l'application au lieu du formulaire Google.
 *
 * Une page de reglage, au gabarit des Reglages refaits en 7-J : la nature en choix coches, les problemes
 * connus avant d'ecrire un bug, le texte, les captures, ce qui part avec, l'accord de reponse, puis
 * l'envoi. Un seul paragraphe en tete dit ce qui part et ce que deviennent les captures ; aucun pied
 * n'explique un controle (review du 2026-11-06). Tout ce qui decide vit dans `useFormulaireDeRetour`.
 */

import React, { useContext } from 'react';
import { Animated, KeyboardAvoidingView, StyleSheet, Text } from 'react-native';

import Translator from '../../shared/i18n/Translator';
import { URL } from '../../shared/constants/urls';
import { parametresDuFormulaire } from '../../shared/navigation/liensDuFormulaire';
import { AppContext } from '../../shared/services/AppCore';
import style, { tokens, type AppThemeType } from '../../shared/theme/Theme';
import { ActionButton } from '../../shared/ui/ActionButton';
import { ErrorAlert } from '../../shared/ui/Alerts';
import type { IssueDuDepot } from '../../shared/retours';
import type { NatureDeRetour } from '../../shared/retours/donnees';
import { GroupeDeReglages, IntroDePage, RangeeDeReglage } from '../../shared/ui/GroupeDeReglages';
import { Champ, Paragraphe } from './components/Elements';
import { BlocsJoints, CapturesJointes } from './components/Joints';
import { ProblemesConnus } from './components/ProblemesConnus';
import { CAPTURES_MAX, TEXTE_MAX, useFormulaireDeRetour, type ParametresDuFormulaire } from './useFormulaireDeRetour';

interface RetourScreenProps {
    navigation: { goBack: () => void; push: (route: string, params?: object) => void; navigate: (route: string, params?: object) => void };
    route: { params?: ParametresDuFormulaire };
    headerPadding?: Record<string, unknown>;
    onAnimatedScroll?: (event: unknown) => void;
}

const NATURES: readonly { readonly nature: NatureDeRetour; readonly cle: 'RETOUR_BUG' | 'RETOUR_IDEE' | 'CAMPUS_REQUEST_ACTION' }[] = [
    { nature: 'bug', cle: 'RETOUR_BUG' },
    { nature: 'fonctionnalite', cle: 'RETOUR_IDEE' },
    { nature: 'campus', cle: 'CAMPUS_REQUEST_ACTION' },
];

/** Ce que l'envoi est devenu, dit d'un toast : un geste ne se confirme pas par un dialogue (theme.md). */
function direLIssue(issue: IssueDuDepot): boolean {
    if (issue.etat === 'refuse') {
        const cle = issue.raison.startsWith('plafond_') ? 'RETOUR_REFUSE_PLAFOND' : issue.raison === 'appareil_bloque' ? 'RETOUR_REFUSE_BLOQUE' : 'RETOUR_REFUSE';
        new ErrorAlert(Translator.get(cle)).show();
        return false;
    }
    const cle = issue.etat === 'en-attente' ? 'RETOUR_EN_ATTENTE' : issue.capturesPerdues > 0 ? 'RETOUR_ENVOYE_SANS_CAPTURES' : 'RETOUR_ENVOYE';
    new ErrorAlert(Translator.get(cle)).show();
    return true;
}

function BrancheDuCampus({ theme, f, ouvrirEngagement }: { theme: AppThemeType; f: ReturnType<typeof useFormulaireDeRetour>; ouvrirEngagement: () => void }) {
    return (
        <>
            <GroupeDeReglages theme={theme} titre={Translator.get('CAMPUS_NOM')}>
                <Champ theme={theme} value={f.campus} onChangeText={f.setCampus} placeholder={Translator.get('CAMPUS_NOM_EXEMPLE')} maxLength={120} />
                <Champ theme={theme} lignes={3} value={f.texte} onChangeText={f.setTexte} placeholder={Translator.get('CAMPUS_ATTENTES')} maxLength={TEXTE_MAX} />
            </GroupeDeReglages>
            <GroupeDeReglages theme={theme} pied={f.adresseValide ? undefined : Translator.get('ADRESSE_INVALIDE')}>
                <RangeeDeReglage theme={theme} icone="hand-heart-outline" libelle={Translator.get('VOLONTAIRE')} interrupteur={{ valeur: f.volontaire, onChange: f.setVolontaire }} />
                {f.volontaire ? <Paragraphe theme={theme}>{Translator.get('VOLONTAIRE_TEXTE')}</Paragraphe> : null}
                {f.volontaire ? <RangeeDeReglage theme={theme} icone="web" libelle={Translator.get('VOLONTAIRE_LIEN')} onPress={ouvrirEngagement} /> : null}
                {f.volontaire ? (
                    <Champ theme={theme} value={f.contact} onChangeText={f.setContact} placeholder={Translator.get('VOLONTAIRE_ADRESSE')}
                        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} />
                ) : null}
            </GroupeDeReglages>
        </>
    );
}

export default function RetourScreen({ navigation, route, headerPadding, onAnimatedScroll }: RetourScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];
    const parametres = route.params ?? {};
    const f = useFormulaireDeRetour(parametres);
    const deCampus = f.nature === 'campus';

    const envoyer = async () => {
        const issue = await f.envoyer();
        if (issue !== null && direLIssue(issue)) navigation.goBack();
    };

    return (
        <KeyboardAvoidingView style={[styles.page, { backgroundColor: theme.background }]} behavior="padding">
            <Animated.ScrollView
                contentContainerStyle={[headerPadding, styles.contenu]}
                onScroll={onAnimatedScroll as never}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <IntroDePage theme={theme}>{Translator.get(deCampus ? 'RETOUR_INTRO_CAMPUS' : f.nature === 'bug' ? 'RETOUR_INTRO_BUG' : 'RETOUR_INTRO')}</IntroDePage>

                {f.probleme !== null ? (
                    <Text style={[styles.detailPour, { color: theme.font }]}>{Translator.get('RETOUR_DETAIL_POUR', f.probleme.titre)}</Text>
                ) : (
                    <GroupeDeReglages theme={theme} titre={Translator.get('RETOUR_NATURE')} filetCourt>
                        {NATURES.map(({ nature, cle }) => (
                            <RangeeDeReglage key={nature} theme={theme} libelle={Translator.get(cle)} coche={f.nature === nature} onPress={() => f.setNature(nature)} />
                        ))}
                    </GroupeDeReglages>
                )}

                {f.nature === 'bug' && f.probleme === null ? (
                    <ProblemesConnus
                        theme={theme}
                        problemes={f.problemes}
                        votes={f.votes}
                        aVote={(id) => f.setVotes((avant) => [...avant, id])}
                        detailler={(p) => navigation.push('Retour', { ...parametres, nature: 'bug', probleme: { id: p.id, titre: p.titre } })}
                    />
                ) : null}

                {deCampus ? (
                    <BrancheDuCampus theme={theme} f={f} ouvrirEngagement={() => navigation.navigate('WebBrowser', parametresDuFormulaire(URL.ENGAGEMENT_CAMPUS))} />
                ) : (
                    <>
                        <GroupeDeReglages theme={theme} titre={Translator.get('RETOUR_DESCRIPTION')}>
                            <Champ
                                theme={theme}
                                lignes={5}
                                value={f.texte}
                                onChangeText={f.setTexte}
                                maxLength={TEXTE_MAX}
                                placeholder={Translator.get(f.probleme !== null ? 'RETOUR_TEXTE_DETAIL' : f.nature === 'bug' ? 'RETOUR_TEXTE_BUG' : 'RETOUR_TEXTE_IDEE')}
                                compte={f.texte.length > TEXTE_MAX * 0.8 ? `${f.texte.length} / ${TEXTE_MAX}` : undefined}
                            />
                        </GroupeDeReglages>
                        <CapturesJointes
                            theme={theme}
                            captures={f.captures}
                            ajouter={() => { void f.ajouterUneCapture(); }}
                            retirer={f.retirerUneCapture}
                            ajout={f.ajout}
                            max={CAPTURES_MAX}
                        />
                    </>
                )}

                {f.blocs.length > 0 ? <BlocsJoints theme={theme} blocs={f.blocs} retires={f.retires} basculer={f.basculerBloc} /> : null}

                <GroupeDeReglages theme={theme}>
                    <RangeeDeReglage theme={theme} icone="message-reply-text-outline" libelle={Translator.get('REPONSE_ICI')} interrupteur={{ valeur: f.reponseIci, onChange: f.setReponseIci }} />
                </GroupeDeReglages>

                <ActionButton
                    theme={theme}
                    label={Translator.get('RETOUR_ENVOYER')}
                    icon={{ name: 'send' }}
                    onPress={() => { void envoyer(); }}
                    disabled={!f.pret || f.envoi}
                    style={styles.envoyer}
                />
            </Animated.ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    contenu: {
        paddingBottom: tokens.space.xxl,
    },
    detailPour: {
        marginHorizontal: tokens.space.xl,
        marginTop: tokens.space.lg,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    envoyer: {
        marginHorizontal: tokens.space.md,
        marginTop: tokens.space.xl,
    },
});

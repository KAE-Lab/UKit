/**
 * La boite a idees (phase 8, lot 4 ; docs/phase-8/4-sondages-idees-notation.md) : ce que l'equipe a
 * retenu des retours, reformule, par statut — en cours, proposees, livrees —, chacune avec « Moi aussi »
 * et « Ajouter un detail ». Une page de reglage au gabarit de 7-J : un paragraphe en tete, des groupes,
 * puis la porte vers le formulaire pour une idee qui n'y est pas encore.
 */

import React, { useContext } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';

import Translator from '../../shared/i18n/Translator';
import { soutenir } from '../../shared/retours/idees';
import { AppContext } from '../../shared/services/AppCore';
import style, { tokens } from '../../shared/theme/Theme';
import { GroupeDeReglages, IntroDePage, RangeeDeReglage } from '../../shared/ui/GroupeDeReglages';
import { ElementsSuivis, type ElementSuivi } from './components/ElementsSuivis';
import { elementDIdee } from './elementsSuivis';
import { useBoiteAIdees } from './useBoiteAIdees';

interface IdeesScreenProps {
    navigation: { push: (route: string, params?: object) => void };
    headerPadding?: Record<string, unknown>;
    onAnimatedScroll?: (event: unknown) => void;
}

export default function IdeesScreen({ navigation, headerPadding, onAnimatedScroll }: IdeesScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];
    const { boite, soutiens, aSoutenu } = useBoiteAIdees();
    const detailler = (i: ElementSuivi) => navigation.push('Retour', { nature: 'fonctionnalite', idee: { id: i.id, titre: i.titre } });
    const groupes = boite === null ? [] : [
        { cle: 'IDEES_EN_COURS', idees: boite.enCours },
        { cle: 'IDEES_PROPOSEES', idees: boite.proposees },
        { cle: 'IDEES_LIVREES', idees: boite.livrees },
    ] as const;
    const vide = boite !== null && groupes.every((g) => g.idees.length === 0);

    return (
        <View style={[styles.page, { backgroundColor: theme.background }]}>
            <Animated.ScrollView contentContainerStyle={[headerPadding, styles.contenu]} onScroll={onAnimatedScroll as never} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
                <IntroDePage theme={theme}>{Translator.get(vide ? 'IDEES_VIDE' : 'IDEES_INTRO')}</IntroDePage>
                {boite === null ? <ActivityIndicator style={styles.attente} color={theme.accent} /> : null}
                {groupes.map((g) => (
                    <ElementsSuivis
                        key={g.cle}
                        theme={theme}
                        titre={Translator.get(g.cle)}
                        elements={g.idees.map((i) => elementDIdee(i, false))}
                        votes={soutiens}
                        soutenir={soutenir}
                        fait="IDEE_SOUTENUE"
                        aVote={aSoutenu}
                        detailler={detailler}
                    />
                ))}
                <GroupeDeReglages theme={theme}>
                    <RangeeDeReglage theme={theme} icone="lightbulb-on-outline" libelle={Translator.get('IDEES_PROPOSER')} onPress={() => navigation.push('Retour', { nature: 'fonctionnalite' })} />
                </GroupeDeReglages>
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    contenu: {
        paddingBottom: tokens.space.xxl,
    },
    attente: {
        marginTop: tokens.space.xl,
    },
});

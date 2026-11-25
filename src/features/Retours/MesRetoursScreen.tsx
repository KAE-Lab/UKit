/**
 * « Mes retours » (lot 3) : ce qui est parti de cet appareil, son statut quand la reponse a ete
 * demandee, et les reponses de l'equipe, la plus recente en bas de chaque carte. Une reponse arrivee
 * depuis la derniere visite se titre « Nouvelle reponse », a l'accent ; aucun point qui pulse
 * (docs/theme.md).
 */

import moment from 'moment';
import React, { useContext } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import Translator, { type TranslationKey } from '../../shared/i18n/Translator';
import type { RetourConnu } from '../../shared/retours/donnees';
import { AppContext } from '../../shared/services/AppCore';
import style, { tokens, type AppThemeType, type SemanticTone } from '../../shared/theme/Theme';
import { Badge } from '../../shared/ui/Badge';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ScreenState } from '../../shared/ui/ScreenState';
import { GroupeDeReglages } from '../../shared/ui/GroupeDeReglages';
import { useMesRetours } from './useMesRetours';

interface MesRetoursScreenProps {
    headerPadding?: Record<string, unknown>;
    onAnimatedScroll?: (event: unknown) => void;
}

const NATURE: Readonly<Record<RetourConnu['nature'], TranslationKey>> = {
    bug: 'RETOUR_BUG',
    fonctionnalite: 'RETOUR_IDEE',
    campus: 'CAMPUS_REQUEST_ACTION',
};

/** Le statut d'un retour, en un mot et un ton. Sans cle, l'appareil ne sait que l'envoi. */
export function statutDuRetour(r: RetourConnu): { readonly cle: TranslationKey; readonly ton: SemanticTone } {
    if (r.etat === 'a-envoyer') return { cle: 'STATUT_A_ENVOYER', ton: 'warning' };
    if (r.etat === 'refuse') return { cle: 'STATUT_REFUSE_ENVOI', ton: 'danger' };
    if (r.cle === null) return { cle: 'STATUT_SANS_SUIVI', ton: 'neutral' };
    switch (r.statut) {
        case 'en_attente': return { cle: 'STATUT_EN_COURS', ton: 'warning' };
        case 'traite': return { cle: 'STATUT_TRAITE', ton: 'success' };
        case 'refuse': return { cle: 'STATUT_CLOS', ton: 'neutral' };
        default: return { cle: 'STATUT_NOUVEAU', ton: 'neutral' };
    }
}

function CarteDeRetour({ theme, retour, nouvelles }: { theme: AppThemeType; retour: RetourConnu; nouvelles: number }) {
    const statut = statutDuRetour(retour);
    const apercu = retour.nature === 'campus' ? [retour.campus, retour.texte].filter((t) => t !== null && t !== '').join(' — ') : retour.texte;
    return (
        <GroupeDeReglages theme={theme} titre={Translator.get(NATURE[retour.nature])}>
            <View style={styles.corps}>
                <View style={styles.enTete}>
                    <Badge theme={theme} label={Translator.get(statut.cle)} tone={statut.ton} />
                    <Text style={[styles.date, tokens.texte.chiffres, { color: theme.fontTertiary }]}>{Translator.get('ENVOYE_LE', moment(retour.envoyeLe).format('LL'))}</Text>
                </View>
                <Text numberOfLines={4} style={[styles.texte, { color: theme.font }]}>{apercu}</Text>
            </View>
            {retour.reponses.map((reponse, i) => {
                const nouvelle = i >= retour.reponses.length - nouvelles;
                return (
                    <View key={`${reponse.le}-${i}`} style={styles.corps}>
                        <View style={styles.enTete}>
                            <Text style={[tokens.texte.intertitre, { color: nouvelle ? theme.accent : theme.fontSecondary }]}>
                                {Translator.get(nouvelle ? 'REPONSE_NOUVELLE' : 'REPONSE_DE_L_EQUIPE')}
                            </Text>
                            <Text style={[styles.date, tokens.texte.chiffres, { color: theme.fontTertiary }]}>{moment(reponse.le).format('LL')}</Text>
                        </View>
                        <Text style={[styles.texte, { color: theme.font }]}>{reponse.texte}</Text>
                    </View>
                );
            })}
        </GroupeDeReglages>
    );
}

export default function MesRetoursScreen({ headerPadding, onAnimatedScroll }: MesRetoursScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];
    const { retours, lecture, nouvelles } = useMesRetours();

    if (retours.length === 0 && !lecture) {
        return (
            <View style={[styles.page, { backgroundColor: theme.background }]}>
                <ScreenState theme={theme}>
                    <EmptyState variant="plain" icon="message-text-outline" title={Translator.get('MES_RETOURS_VIDE_TITRE')} message={Translator.get('MES_RETOURS_VIDE')} theme={theme} />
                </ScreenState>
            </View>
        );
    }
    return (
        <View style={[styles.page, { backgroundColor: theme.background }]}>
            <Animated.ScrollView contentContainerStyle={[headerPadding, styles.contenu]} onScroll={onAnimatedScroll as never} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
                {retours.map((retour) => <CarteDeRetour key={retour.local} theme={theme} retour={retour} nouvelles={nouvelles(retour)} />)}
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
    corps: {
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.md,
        gap: tokens.space.sm,
    },
    texte: {
        fontSize: tokens.fontSize.md,
        lineHeight: 22,
    },
    enTete: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: tokens.space.sm,
    },
    date: {
        fontSize: tokens.fontSize.xs,
    },
});

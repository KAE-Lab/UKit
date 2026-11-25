/**
 * Partager son emploi du temps (docs/phase-8/8-amis.md) : ce qui part dit en une phrase, le prenom
 * qu'on montre, le code QR, et deux gestes, la feuille de partage du systeme et la copie du lien.
 * L'appareil photo de l'ami lit le code et ouvre le lien ; aucun lecteur dans l'application.
 */

import * as Clipboard from 'expo-clipboard';
import moment from 'moment';
import React, { useContext } from 'react';
import { ActivityIndicator, Animated, Share, StyleSheet, useWindowDimensions, View } from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import { AppContext } from '../../../shared/services/AppCore';
import style, { tokens } from '../../../shared/theme/Theme';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { GroupeDeReglages, IntroDePage } from '../../../shared/ui/GroupeDeReglages';
import { ChampDePrenom } from '../components/ChampDePrenom';
import { CodeQr } from '../components/CodeQr';
import { usePartage } from '../hooks/usePartage';
import { dernierJour } from '../services/instantane';

interface PartageScreenProps {
    headerPadding?: Record<string, unknown>;
    onAnimatedScroll?: (event: unknown) => void;
}

/** Le code tient dans la largeur, sans depasser ce qu'un appareil photo lit a bout de bras. */
const CODE_MAXIMUM = 280;

export default function PartageScreen({ headerPadding, onAnimatedScroll }: PartageScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];
    const { width } = useWindowDimensions();
    const { etat, prenom, changerLePrenom, relire } = usePartage();
    const taille = Math.min(CODE_MAXIMUM, width - tokens.space.xl * 4);

    let corps: React.ReactNode;
    if (etat.etat === 'lecture') {
        corps = <ActivityIndicator style={styles.attente} color={theme.fontSecondary} />;
    } else if (etat.etat === 'echec') {
        const rien = etat.raison === 'rien-a-partager';
        corps = (
            <View style={styles.etat}>
                <EmptyState
                    theme={theme}
                    icon={rien ? 'calendar-blank' : 'cloud-off'}
                    title={Translator.get(rien ? 'PARTAGE_RIEN_TITRE' : 'PARTAGE_ECHEC_TITRE')}
                    message={Translator.get(rien ? 'PARTAGE_RIEN' : 'PARTAGE_ECHEC')}
                    action={rien ? null : { label: Translator.get('RETRY'), onPress: relire }}
                />
            </View>
        );
    } else {
        const contenu = etat.preparation.contenu;
        const intro = contenu.genre === 'groupes'
            ? Translator.get('PARTAGE_GROUPES')
            : Translator.get('PARTAGE_INSTANTANE', moment(dernierJour(contenu.premierJour)).format('D MMMM'));
        corps = (
            <>
                <IntroDePage theme={theme}>{intro}</IntroDePage>
                <GroupeDeReglages theme={theme}>
                    <ChampDePrenom theme={theme} libelle={Translator.get('PARTAGE_PRENOM')} valeur={prenom} onChange={changerLePrenom} indication={Translator.get('PARTAGE_FACULTATIF')} />
                </GroupeDeReglages>
                <View style={[styles.code, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
                    <CodeQr valeur={etat.lien} taille={taille} accessibilityLabel={Translator.get('PARTAGE_CODE_QR')} />
                </View>
                <View style={styles.gestes}>
                    <ActionButton
                        theme={theme}
                        label={Translator.get('PARTAGE_ENVOYER')}
                        icon={{ name: 'export-variant' }}
                        onPress={() => {
                            Share.share({ message: Translator.get('PARTAGE_MESSAGE', etat.lien) }).catch((erreur) => console.warn('[amis] feuille de partage en erreur', erreur));
                        }}
                    />
                    <ActionButton
                        theme={theme}
                        variant="tonal"
                        label={Translator.get('PARTAGE_COPIER')}
                        icon={{ name: 'content-copy' }}
                        onPress={() => {
                            Clipboard.setStringAsync(etat.lien)
                                .then(() => new ErrorAlert(Translator.get('PARTAGE_COPIE'), ErrorAlert.durations.SHORT).show())
                                .catch((erreur) => console.warn('[amis] copie en erreur', erreur));
                        }}
                    />
                </View>
            </>
        );
    }

    return (
        <View style={[styles.page, { backgroundColor: theme.background }]}>
            <Animated.ScrollView
                contentContainerStyle={[headerPadding, styles.contenu]}
                onScroll={onAnimatedScroll as never}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {corps}
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
        marginTop: tokens.space.xxl,
    },
    etat: {
        marginHorizontal: tokens.space.sm,
        marginTop: tokens.space.lg,
    },
    code: {
        alignSelf: 'center',
        marginTop: tokens.space.lg,
        padding: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        ...tokens.shadow.sm,
    },
    gestes: {
        marginHorizontal: tokens.space.md,
        marginTop: tokens.space.lg,
        gap: tokens.space.sm,
    },
});

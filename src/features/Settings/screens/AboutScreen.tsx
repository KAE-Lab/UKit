/**
 * L'ecran A propos.
 *
 * **Au gabarit des Reglages depuis 7-J** : les groupes encadres de `GroupeDeReglages`, l'intertitre
 * dehors et le contenu sur une carte, les liens en rangees a icone teintee. L'ecran avait son propre
 * gabarit — une bande grise d'en-tete et son icone sur chaque carte, des liens soulignes d'un filet —,
 * une troisieme maniere de titrer un groupe dans l'application. Le logo est vectoriel, dans son degrade.
 */

import React from 'react';
import { Text, View, TouchableOpacity, Linking, Animated, DeviceEventEmitter, StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import style, { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { AppContext } from '../../../shared/services/AppCore';
import { URL } from '../../../shared/constants/urls';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { LogoUKit } from '../../../shared/ui/epure/LogoUKit';
import { GroupeDeReglages, RangeeDeReglage } from '../components/GroupeDeReglages';
import { teintes } from '../components/SettingsSections';

function ouvrirLien(url: string) {
    Linking.canOpenURL(url).then((supported) => {
        if (supported) void Linking.openURL(url);
    }).catch(() => undefined);
}

/** Un paragraphe pose sur la carte d'un groupe. */
function Paragraphe({ theme, children }: { theme: AppThemeType; children: React.ReactNode }) {
    return (
        <View style={styles.encart}>
            <Text style={[styles.paragraphe, { color: theme.fontSecondary }]}>{children}</Text>
        </View>
    );
}

/** Un credit de fournisseur : son nom, ce qu'il apporte, et un lien facultatif. */
function CreditTiers({ nom, description, lien, lienTitre, theme }: { nom: string; description: string; lien?: string; lienTitre?: string; theme: AppThemeType }) {
    return (
        <View style={styles.credit}>
            <Text style={[styles.nomDuCredit, { color: theme.font }]}>{nom}</Text>
            <Text style={[styles.paragraphe, { color: theme.fontSecondary }]}>
                {description}
                {lien !== undefined && lienTitre !== undefined ? (
                    <>
                        {' '}
                        <Text style={{ color: theme.primary }} onPress={() => ouvrirLien(lien)}>
                            {lienTitre}
                        </Text>
                    </>
                ) : null}
            </Text>
        </View>
    );
}

export interface AboutScreenProps {
    headerPadding?: Record<string, unknown>;
    onAnimatedScroll?: (event: unknown) => void;
}

class AboutScreen extends React.Component<AboutScreenProps> {
	static contextType = AppContext;
	tapCount = 0;

	handleVersionTap = () => {
		this.tapCount++;
		if (this.tapCount === 7) {
			this.tapCount = 0;
			DeviceEventEmitter.emit('toggleModMenu');
		}
	}

	render() {
        const themeName = (this.context as { themeName: string }).themeName;
        const theme = style.Theme[themeName];
        const t = teintes(theme);
        const appVersion = Constants.expoConfig?.version || (Constants.manifest as unknown as { version?: string })?.version || '?';

        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
                <SafeAreaInsetsContext.Consumer>
                    {(insets) => (
                        <Animated.ScrollView
                            // Le calage de l'en-tete tel que le HOC le donne : l'ecran posait 50 par-dessus
                            // les 70 recus (inventaire-mouvement.md, 6.1).
                            contentContainerStyle={[this.props.headerPadding, { paddingBottom: (insets?.bottom || 0) + tokens.space.xl }]}
                            onScroll={this.props.onAnimatedScroll}
                            scrollEventThrottle={16}
                            showsVerticalScrollIndicator={false}
                        >

                    {/* Le logo et sa version. La version garde ses sept tapes, qui ouvrent le menu de test. */}
                    <View style={styles.tete}>
                        <LogoUKit theme={theme} largeur={156} />
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={this.handleVersionTap}
                            style={[styles.version, { backgroundColor: theme.greyBackground }]}
                        >
                            <Text style={[tokens.texte.chiffres, styles.texteDeVersion, { color: theme.fontSecondary }]}>
                                v{appVersion}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <GroupeDeReglages theme={theme} titre={Translator.get('ABOUT')}>
                        <Paragraphe theme={theme}>{Translator.get('APPLICATION_HISTORY')}</Paragraphe>
                    </GroupeDeReglages>

                    <GroupeDeReglages theme={theme} titre={Translator.get('DATA_SOURCE_TITLE')}>
                        <Paragraphe theme={theme}>{Translator.get('DATA_SOURCE_TEXT')}</Paragraphe>
                    </GroupeDeReglages>

                    <GroupeDeReglages theme={theme} titre={Translator.get('CONTACT_US')}>
                        <RangeeDeReglage theme={theme} icone="email-outline" teinte={t.bleu} libelle="contact@kaelab.dev" onPress={() => ouvrirLien(URL.CONTACT_EMAIL)} />
                        <RangeeDeReglage theme={theme} icone="web" teinte={t.indigo} libelle={Translator.get('WEBSITE')} onPress={() => ouvrirLien(URL.UKIT_WEBSITE)} />
                        <RangeeDeReglage theme={theme} icone="domain" teinte={t.gris} libelle={Translator.get('COMPANY_WEBSITE')} onPress={() => ouvrirLien(URL.KAELAB_WEBSITE)} />
                    </GroupeDeReglages>

                    {/* Une carte d'un seul tenant : trois credits separes par des filets indentes
                        pour des icones absentes se liraient comme des rangees cassees. */}
                    <GroupeDeReglages theme={theme} titre={Translator.get('CREDITS_API')}>
                        <View style={styles.encart}>
                            <Text style={[styles.paragraphe, { color: theme.fontSecondary }]}>{Translator.get('THIRD_PARTY_DESC')}</Text>
                            <CreditTiers nom="API Affluences" description={Translator.get('AFFLUENCES_DESC')} theme={theme} />
                            <CreditTiers nom="API CROUStillant" description={Translator.get('CROUSTILLANT_DESC')} lien={URL.CROUSTILLANT_WEBSITE} lienTitre="CROUStillant.menu" theme={theme} />
                            {/* Le fond de carte : credite comme les deux autres — la regle du depot pour
                                toute source publique (CONTRIBUTING). */}
                            <CreditTiers nom="OpenFreeMap" description={Translator.get('OPENFREEMAP_DESC')} theme={theme} />
                        </View>
                    </GroupeDeReglages>

                    {/* La mention de licence passe en pied, comme l'explication d'un groupe de reglages. */}
                    <GroupeDeReglages theme={theme} titre={Translator.get('LEGAL_NOTICE')} pied={Translator.get('LEGAL_MENTION')}>
                        <RangeeDeReglage theme={theme} icone="shield-check-outline" teinte={t.vert} libelle={Translator.get('CONFIDENTIALITY_POLITIC')} onPress={() => ouvrirLien(URL.LEGAL_NOTICE)} />
                    </GroupeDeReglages>

                </Animated.ScrollView>
                    )}
                </SafeAreaInsetsContext.Consumer>
            </SafeAreaView>
        );
    }
}

const styles = StyleSheet.create({
    tete: {
        alignItems: 'center',
        paddingTop: tokens.space.sm,
        paddingBottom: tokens.space.sm,
    },
    version: {
        borderRadius: tokens.radius.md,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.xs,
        marginTop: tokens.space.md,
    },
    texteDeVersion: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.medium,
    },
    encart: {
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.md,
    },
    paragraphe: {
        fontSize: tokens.fontSize.sm,
        lineHeight: 21,
    },
    credit: {
        marginTop: tokens.space.md,
    },
    nomDuCredit: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.space.xxs,
    },
});

export default withHeaderAnimation(AboutScreen);

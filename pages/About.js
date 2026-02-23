import React from 'react';
import { Text, View, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import style, { tokens } from '../Style';
import URLButton from '../components/buttons/URLButton';
import Translator from '../utils/translator';
import { AppContext } from '../utils/DeviceUtils';
import URL from '../utils/URL';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Section = ({ title, icon, theme, children }) => (
	<View style={{
		backgroundColor: theme.cardBackground,
		borderRadius: tokens.radius.lg,
		marginHorizontal: tokens.space.md,
		marginBottom: tokens.space.md,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: theme.border,
		...tokens.shadow.sm,
	}}>
		<View style={{
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: tokens.space.md,
			paddingVertical: tokens.space.sm,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
			backgroundColor: theme.greyBackground,
		}}>
			<MaterialCommunityIcons
				name={icon}
				size={18}
				color={theme.font}
				style={{ marginRight: tokens.space.sm }}
			/>
			<Text style={{
				fontSize: tokens.fontSize.sm,
				fontWeight: tokens.fontWeight.semibold,
				color: theme.font,
				letterSpacing: 0.5,
			}}>
				{title}
			</Text>
		</View>

		<View style={{ padding: tokens.space.md }}>
			{children}
		</View>
	</View>
);

class About extends React.Component {
	static contextType = AppContext;

	render() {
        const theme = style.Theme[this.context.themeName];
        const appVersion =
            Constants.expoConfig?.version || Constants.manifest?.version || '?';

        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: tokens.space.xl }}
                    showsVerticalScrollIndicator={false}>

                    {/* ── Hero ──────────────────────────────────────────── */}
                    <View style={{
                        alignItems: 'center',
                        paddingVertical: tokens.space.xl,
                    }}>
						<View style={{
							width: 90,
							height: 90,
							borderRadius: tokens.radius.lg,
							overflow: 'hidden',
							marginBottom: tokens.space.md,
							backgroundColor: theme.themeName === 'dark' ? '#2D1A2E' : '#E8F6FD'
						}}>
							<Image
                            source={require('../assets/icons/app.png')}
                            style={{
                                width: 90,
                                height: 90,
								resizeMode: 'contain',
                                tintColor: theme.primary,
                            }}
                        />
						</View>
                        <Text style={{
                            fontSize: tokens.fontSize.xxl,
                            fontWeight: tokens.fontWeight.bold,
                            color: theme.font,
                        }}>
                            UKit
                        </Text>
                        <View style={{
                            backgroundColor: theme.primarySoft,
                            borderRadius: tokens.radius.pill,
                            paddingHorizontal: tokens.space.md,
                            paddingVertical: tokens.space.xs,
                            marginTop: tokens.space.xs,
                        }}>
                            <Text style={{
                                fontSize: tokens.fontSize.sm,
                                color: theme.fontSecondary,
                                fontWeight: tokens.fontWeight.medium,
                            }}>
                                v{appVersion}
                            </Text>
                        </View>
                    </View>

                    {/* ── Histoire ──────────────────────────────────────── */}
                    <Section
                        title={Translator.get('ABOUT')}
                        icon="information-outline"
                        theme={theme}>
                        <Text style={{
                            fontSize: tokens.fontSize.sm,
                            color: theme.fontSecondary,
                            lineHeight: 22,
                        }}>
                            {Translator.get('APPLICATION_HISTORY')}
                        </Text>
                    </Section>

                    {/* ── Source des données ────────────────────────────── */}
                    <Section
                        title={'Source des données'}
                        icon="database-outline"
                        theme={theme}>
                        <Text style={{
                            fontSize: tokens.fontSize.sm,
                            color: theme.fontSecondary,
                            lineHeight: 22,
                        }}>
                            {"Les emplois du temps proviennent de l'ENT de l'Université de Bordeaux. Cette application n'est pas affiliée officiellement à l'établissement."}
                        </Text>
                    </Section>

                    {/* ── Contact ───────────────────────────────────────── */}
                    <Section
                        title={Translator.get('CONTACT_US')}
                        icon="email-outline"
                        theme={theme}>
                        <URLButton url={URL.TWITTER} title="Twitter" theme={theme} />
                        <URLButton
                            url={URL.UKIT_WEBSITE}
                            title={Translator.get('WEBSITE')}
                            theme={theme}
                        />
                        <URLButton
                            url={URL.KBDEV_WEBSITE}
                            title={Translator.get('COMPANY_WEBSITE')}
                            theme={theme}
                        />
                    </Section>

                    {/* ── Mentions légales ──────────────────────────────── */}
                    <Section
                        title={Translator.get('LEGAL_NOTICE')}
                        icon="shield-outline"
                        theme={theme}>
                        <Text style={{
                            fontSize: tokens.fontSize.sm,
                            color: theme.fontSecondary,
                            lineHeight: 22,
                            marginBottom: tokens.space.sm,
                        }}>
                            {'Ce projet est distribué sous licence libre. Les dépendances utilisent les licences MIT et Apache 2.0.'}
                        </Text>
                        <URLButton
                            url={URL.LEGAL_NOTICE}
                            title={Translator.get('CONFIDENTIALITY_POLITIC')}
                            theme={theme}
                        />
                    </Section>

                </ScrollView>
            </SafeAreaView>
        );
    }
}

export default About;

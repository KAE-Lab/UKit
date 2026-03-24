import React from 'react';
import { Text, View, ScrollView, Image, TouchableOpacity, Linking, Animated } from 'react-native';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import style, { tokens } from '../../shared/theme/Theme';
import Translator from '../../shared/i18n/Translator';
import { AppContext } from '../../shared/services/AppCore';
import { URL } from '../../shared/services/DataService';
import { withHeaderAnimation } from '../../shared/navigation/NavHelpers';

const Section = ({ title, icon, theme, children }) => (
	<View style={{
		backgroundColor: theme.cardBackground,
		borderRadius: tokens.radius.lg,
		marginHorizontal: tokens.space.sm,
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
			<MaterialCommunityIcons name={icon} size={18} color={theme.font} style={{ marginRight: tokens.space.sm }} />
			<Text style={{
				fontSize: tokens.fontSize.sm,
				fontWeight: tokens.fontWeight.semibold,
				color: theme.font,
				letterSpacing: 0.5,
			}}>
				{title}
			</Text>
		</View>
		<View style={{ 
            paddingHorizontal: tokens.space.md, 
            paddingBottom: tokens.space.sm + 2, 
            paddingTop: tokens.space.sm + 1
         }}>
			{children}
		</View>
	</View>
);

const URLButton = ({ url, title, theme }) => {
    const openURL = () => {
        Linking.canOpenURL(url).then((supported) => {
            if (supported) Linking.openURL(url);
        });
    };

    return (
        <TouchableOpacity onPress={openURL} style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: tokens.space.sm,
            borderBottomWidth: 1,
            borderBottomColor: theme.border + '44', 
        }}>
            <Text style={{
                flex: 1,
                fontSize: tokens.fontSize.md,
                color: theme.font,
                fontWeight: tokens.fontWeight.medium,
            }}>
                {title}
            </Text>
            <MaterialCommunityIcons name="open-in-new" size={20} color={theme.fontSecondary} />
        </TouchableOpacity>
    );
};

class AboutScreen extends React.Component {
	static contextType = AppContext;

	render() {
        const theme = style.Theme[this.context.themeName];
        const appVersion = Constants.expoConfig?.version || Constants.manifest?.version || '?';

        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
                <SafeAreaInsetsContext.Consumer>
                    {(insets) => (
                        <Animated.ScrollView 
                            contentContainerStyle={[this.props.headerPadding, { paddingTop: (insets?.top || 0) + 50 }]}
                            onScroll={this.props.onAnimatedScroll}
                            scrollEventThrottle={16}
                            showsVerticalScrollIndicator={false}
                        >

                    <View style={{ alignItems: 'center', paddingVertical: tokens.space.lg }}>
						<View style={{
							width: 90, height: 90, borderRadius: tokens.radius.lg, overflow: 'hidden',
							marginBottom: tokens.space.md, backgroundColor: '#ffffff',
                            justifyContent: 'center', alignItems: 'center'
						}}>
                            <Image
                                source={require('../../../assets/icons/logo.png')}
                                style={{ width: 70, height: 70, resizeMode: 'contain' }}
                            />
						</View>
                        <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: theme.font }}>
                            UKit
                        </Text>
                        <View style={{
                            backgroundColor: theme.greyBackground, borderRadius: tokens.radius.md,
                            paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.xs, marginTop: tokens.space.xs,
                        }}>
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, fontWeight: tokens.fontWeight.medium }}>
                                v{appVersion}
                            </Text>
                        </View>
                    </View>

                    {/* Sections */}
                    <Section title={Translator.get('ABOUT')} icon="information-outline" theme={theme}>
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 22 }}>
                            {Translator.get('APPLICATION_HISTORY')}
                        </Text>
                    </Section>

                    <Section title={Translator.get('DATA_SOURCE_TITLE')} icon="database-outline" theme={theme}>
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 22 }}>
                            {Translator.get('DATA_SOURCE_TEXT')}
                        </Text>
                    </Section>

                    <Section title={Translator.get('CONTACT_US')} icon="email-outline" theme={theme}>
                        <URLButton url={URL.TWITTER} title="Twitter" theme={theme} />
                        <URLButton url={URL.UKIT_WEBSITE} title={Translator.get('WEBSITE')} theme={theme} />
                        <URLButton url={URL.KAELAB_WEBSITE} title={Translator.get('COMPANY_WEBSITE')} theme={theme} />
                    </Section>

                    <Section title={Translator.get('CREDITS_API')} icon="api" theme={theme}>
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 22 }}>
                            {Translator.get('THIRD_PARTY_DESC')}
                        </Text>
                        
                        <View style={{ marginTop: tokens.space.sm }}>
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, fontWeight: 'bold' }}>
                                • API Affluences
                            </Text>
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 20, marginLeft: tokens.space.sm }}>
                                {Translator.get('AFFLUENCES_DESC')}
                            </Text>
                        </View>
                        
                        <View style={{ marginTop: tokens.space.sm }}>
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, fontWeight: 'bold' }}>
                                • API CROUStillant
                            </Text>
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 20, marginLeft: tokens.space.sm }}>
                                {Translator.get('CROUSTILLANT_DESC')}
                            </Text>
                        </View>
                    </Section>

                    <Section title={Translator.get('LEGAL_NOTICE')} icon="shield-outline" theme={theme}>
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 22, marginBottom: tokens.space.sm }}>
                            {Translator.get('LEGAL_MENTION')}
                        </Text>
                        <URLButton url={URL.LEGAL_NOTICE} title={Translator.get('CONFIDENTIALITY_POLITIC')} theme={theme} />
                    </Section>

                </Animated.ScrollView>
                    )}
                </SafeAreaInsetsContext.Consumer>
            </SafeAreaView>
        );
    }
}

export default withHeaderAnimation(AboutScreen);
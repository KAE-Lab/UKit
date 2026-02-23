import React from 'react';
import { Text, View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import WelcomePagination from '../../components/ui/WelcomePagination';
import WelcomeButton from '../../components/buttons/WelcomeButton';
import WelcomeBackButton from '../../components/buttons/WelcomeBackButton';
import WelcomeThemeButton from '../../components/WelcomeThemeButton';
import WelcomeLanguageButton from '../../components/WelcomeLanguageButton';
import styles from '../../StyleWelcome';
import Translator from '../../utils/translator';
import SettingsManager from '../../utils/SettingsManager';

const THEME_LIST = [
    { id: 'light', title: 'LIGHT_THEME' },
    { id: 'dark', title: 'DARK_THEME' },
];

const LANGUAGE_LIST = [
    { id: 'fr', title: 'FRENCH' },
    { id: 'en', title: 'ENGLISH' },
    { id: 'es', title: 'SPANISH' },
];

class SecondWelcomePage extends React.Component {
    getLanguage = () => this.props.navigatorState.language;
    getTheme    = () => this.props.navigatorState.theme;

    selectLanguage = (newLang)  => SettingsManager.setLanguage(newLang.id);
    selectTheme    = (newTheme) => SettingsManager.setTheme(newTheme.id);

    navigateToNextPage = () => {
        this.props.navigation.navigate('ThirdWelcomePage');
    };

    render() {
        const { navigation } = this.props;
        const theme = this.props.navigatorState.theme;
        return (
            <LinearGradient
                style={{ flex: 1 }}
                colors={styles[theme].gradientColor}
                start={{ x: 0.05, y: 0.05 }}
                end={{ x: 0.95, y: 0.95 }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <WelcomeBackButton onPress={navigation.goBack} visible={true} />

                    {/* ── Cards scrollables ──────────────────────────── */}
                    <ScrollView
                        style={{ flexGrow: 1 }}
                        contentContainerStyle={{ paddingBottom: 0 }}
                        showsVerticalScrollIndicator={false}>
                        <View style={styles[theme].whiteCard}>
                            <Text style={styles[theme].whiteCardText}>
                                {Translator.get('YOUR_THEME')}
                            </Text>
                            {THEME_LIST.map((themeEntry) => (
                                <WelcomeThemeButton
                                    key={themeEntry.id}
                                    themeEntry={themeEntry}
                                    selectTheme={this.selectTheme}
                                    getCurrentTheme={this.getTheme}
                                    theme={theme}
                                />
                            ))}
                        </View>

                        <View style={styles[theme].whiteCard}>
                            <Text style={styles[theme].whiteCardText}>
                                {Translator.get('YOUR_LANGUAGE')}
                            </Text>
                            {LANGUAGE_LIST.map((languageEntry) => (
                                <WelcomeLanguageButton
                                    key={languageEntry.id}
                                    languageEntry={languageEntry}
                                    selectLanguage={this.selectLanguage}
                                    getCurrentLanguage={this.getLanguage}
                                    theme={theme}
                                />
                            ))}
                        </View>
                    </ScrollView>

                    <WelcomeButton
                        onPress={this.navigateToNextPage}
                        buttonText={Translator.get('NEXT')}
                        theme={theme}
                    />
                    <WelcomePagination pageNumber={2} maxPage={4} theme={theme} />
                </SafeAreaView>
            </LinearGradient>
        );
    }
}

export default SecondWelcomePage;
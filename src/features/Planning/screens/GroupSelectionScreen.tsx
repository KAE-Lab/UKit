import React from 'react';
import { Animated, Text, TextInput, TouchableOpacity, View } from 'react-native';
import moment from 'moment';

import Toast from 'react-native-root-toast';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ChargementPleinePage } from '../../../shared/ui/ChargementPleinePage';
import { ScreenState } from '../../../shared/ui/ScreenState';
import Translator from '../../../shared/i18n/Translator';
import { AppContext, isConnected } from '../../../shared/services/AppCore'
import { PlanningDataManager as DataManager } from '../services/PlanningDataManager';
import { formeAffichee } from '../services/groupListCache';
import { HAUTEUR_DE_BARRE_POUSSEE, NavBarHelper, SaveGroupButton } from '../../../shared/navigation/NavHelpers';
import { FonduDeBord, HAUTEUR_DU_FONDU } from '../../../shared/ui/FonduDeBord';
import { SectionListHeader, GroupRow } from '../components/GroupSelectionComponents';
import { Icon } from '../../../shared/ui/Icon';

export interface HomeScreenProps {
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
}

export interface GroupItem {
    name: string;
}

export interface HomeScreenState {
    completeList: GroupItem[] | null;
    sections: { key: string; data: GroupItem[] }[] | null;
    list: GroupItem[] | null;
    emptySearchResults: boolean;
    refreshing: boolean;
    cacheDate: moment.MomentInput | null;
    searchText: string;
}

class HomeScreen extends React.Component<HomeScreenProps, HomeScreenState> {
    static contextType = AppContext;
    /**
     * Le contexte applicatif, type.
     *
     * `React.Component` declare `context: unknown` et `contextType` en fournit la **valeur**, pas le
     * type. Redeclarer le champ ici l'**ecraserait** (TS2612), et le `declare` que TypeScript
     * recommande est refuse par la couche Flow du preset Babel de React Native : l'application ne
     * bundlerait plus. Un accesseur donne le meme confort sans toucher a la chaine de build.
     */
    private get app(): React.ContextType<typeof AppContext> {
        return this.context as React.ContextType<typeof AppContext>;
    }
    scrollY: Animated.Value;

    constructor(props: HomeScreenProps) {
        super(props);
        this.scrollY = new Animated.Value(0);
        this.state = {
            completeList: null,
            sections: null,
            list: null,
            emptySearchResults: false,
            refreshing: false,
            cacheDate: null,
            searchText: '',
        };
    }

    async componentDidMount() {
        this.props.navigation.setOptions(
            NavBarHelper({
                title: Translator.get('GROUPS'),
                themeName: this.app.themeName,
                scrollY: this.scrollY,
                headerRight: () => (
                    <View style={{ paddingRight: tokens.space.md }}>
                        <SaveGroupButton
                            groupName={[]}
                            themeName={this.app.themeName}
                        />
                    </View>
                ),
            } as never)
        );
        await this.getList();
    }

    generateSections(list: GroupItem[], save = false) {
        const sections: { key: string; data: GroupItem[] }[] = [];
        let sectionContent: { key: string; data: GroupItem[] } | null = null;
        let previousSection: string | null = null;

        list.forEach((e) => {
            const splitName = e.name.substring(0, 3);

            if (splitName !== previousSection) {
                if (sectionContent !== null) {
                    sections.push(sectionContent);
                }
                previousSection = splitName;
                sectionContent = { key: previousSection, data: [] };
            }
            sectionContent.data.push(e);
        });

        if (sectionContent) {
            sections.push(sectionContent);
        }

        if (save) {
            this.setState({ list, sections, completeList: list, refreshing: false });
        } else {
            this.setState({ list, sections });
        }
    }

    refreshList = async () => {
        this.setState({ refreshing: true });
        await this.fetchList();
    };

    getList = async () => {
        await this.fetchList();
    };

    /**
     * Le cache du manager, date pour le bandeau « affichage hors ligne du … ».
     *
     * L'ecran tenait son propre cache (`groups`) jusqu'en 6.1-C, sans expiration et jamais invalide au
     * changement d'etablissement : il lit desormais le seul qui reste (groupListCache.ts).
     */
    depuisLeCache = (): GroupItem[] | null => {
        const cache = { liste: DataManager.getGroupList(), horodatage: DataManager.getGroupListEtat().horodatage };
        const affiche = formeAffichee(cache, null);
        if (affiche === null) return null;
        this.setState({ cacheDate: affiche.dateCache });
        return affiche.liste.map((name) => ({ name }));
    };

    fetchList = async () => {
        let list: GroupItem[] | null = null;

        if (await isConnected()) {
            const resultat = await DataManager.fetchGroupList();

            if (resultat.ok === false) {
                // Le message vient de la famille d'echec, plus d'un reniflage de la forme de l'erreur
                // axios : une source injoignable, une reponse inattendue et un fichier a corriger ne
                // disaient qu'une seule chose avant, et en disent trois maintenant
                // (shared/aetherius/failures.ts).
                if (resultat.failure.silent !== true) {
                    Toast.show(Translator.get(resultat.failure.messageKey), {
                        duration: resultat.failure.retryable ? Toast.durations.SHORT : Toast.durations.LONG,
                        position: Toast.positions.BOTTOM,
                    });
                }
                list = this.depuisLeCache();
            } else {
                this.setState({ cacheDate: null });
                list = resultat.groups.map((e) => ({ name: e }));
            }
        } else {
            Toast.show(Translator.get('NO_CONNECTION'), {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
            });
            list = this.depuisLeCache();
        }

        if (list !== null) {
            this.generateSections(list, true);
        }
    };

    openGroup = (name: string) => {
        const { navigate } = this.props.navigation;
        navigate('Group', { name });
    };

    search(input: string) {
        this.setState({ sections: null, emptySearchResults: false });
        let list = this.state.completeList;
        if (!list) return;

        if (input.length !== 0) {
            let regex = new RegExp(input, 'gi');
            list = list.filter((e: GroupItem) => {
                return e.name.replace(/_/g, ' ').match(regex);
            });
        }
        if (list.length > 0) {
            this.setState({ emptySearchResults: false });
            this.generateSections(list, false);
        } else {
            this.setState({ emptySearchResults: true });
        }
    }

    renderSearchInput(theme: import('../../../shared/theme/Theme').AppThemeType) {
        return (
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                // `greyBackground` reste le bon choix ICI : dans un bandeau fixe opaque, un champ en
                // creux est le motif des en-tetes iOS — la surface posee est celle des flottants.
                backgroundColor: theme.greyBackground,
                borderRadius: tokens.radius.md,
                paddingHorizontal: tokens.space.md,
                marginHorizontal: tokens.space.md,
                marginTop: tokens.space.xs,
                marginBottom: tokens.space.sm,
                // Le gabarit commun des champs de recherche (50, comme la barre des listes Campus) :
                // a 40, celle-ci etait la seule naine de l'application.
                height: 50,
            }}>
                <Icon
                    icon={{ name: 'magnify' }}
                    size={22}
                    color={theme.fontSecondary}
                    style={{ marginRight: tokens.space.sm }}
                />
                <TextInput
                    style={{
                        flex: 1,
                        fontSize: tokens.fontSize.md,
                        color: theme.font,
                    }}
                    placeholder={Translator.get('SEARCH')}
                    placeholderTextColor={theme.fontSecondary}
                    onChangeText={(text) => {
                        this.setState({ searchText: text });
                        this.search(text);
                    }}
                    value={this.state.searchText}
                    autoCorrect={false}
                />
                {this.state.searchText.length > 0 && (
                    <TouchableOpacity
                        onPress={() => {
                            this.setState({ searchText: '' });
                            this.search('');
                        }}
                        style={{ padding: tokens.space.xs }}
                    >
                        <Icon icon={{ name: 'close-circle' }} size={18} color={theme.fontSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    renderCacheDate(theme: import('../../../shared/theme/Theme').AppThemeType) {
        if (!this.state.cacheDate) return null;
        return (
            // Une ligne sous le champ, et non plus une bande grise bordee : le bandeau est sur le fond
            // de la page depuis la deuxieme passe de 7-J.
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: tokens.space.lg,
                paddingBottom: tokens.space.xs,
            }}>
                <Icon
                    icon={{ name: 'clock-outline' }}
                    size={14}
                    color={theme.fontSecondary}
                    style={{ marginRight: tokens.space.xs }}
                />
                <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary }}>
                    {Translator.get('OFFLINE_DISPLAY_FROM_DATE', moment(this.state.cacheDate).format('DD/MM/YYYY HH:mm'))}
                </Text>
            </View>
        );
    }

    renderEmptyState(theme: import('../../../shared/theme/Theme').AppThemeType) {
        return (
            // Le fond est celui de l'ecran, `background`. Il etait `greyBackground` — le gris des
            // pastilles et de la barre d'onglets — que plus aucun autre ecran n'emploie comme fond de
            // page : l'etat vide apparaissait sur une dalle d'une autre couleur que la liste.
            <ScreenState theme={theme}>
                <EmptyState
                    variant="plain"
                    icon="magnify-close"
                    title={Translator.get('NO_GROUP_FOUND_WITH_THIS_SEARCH_TITLE')}
                    message={Translator.get('NO_GROUP_FOUND_WITH_THIS_SEARCH')}
                    theme={theme}
                />
            </ScreenState>
        );
    }

    renderLoading(theme: import('../../../shared/theme/Theme').AppThemeType) {
        return (
            <ChargementPleinePage
                theme={theme}
                message={Translator.get('GROUPS_LOADING')}
                patience={Translator.get('LOADING_PATIENCE_UNIVERSITY')}
            />
        );
    }

    renderList(theme: import('../../../shared/theme/Theme').AppThemeType) {
        return (
            <Animated.SectionList
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: this.scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingTop: HAUTEUR_DU_FONDU, paddingBottom: tokens.space.xxl }}
                scrollIndicatorInsets={{ top: 0 }}
                renderItem={({ item, index, section }: { item: GroupItem; index: number; section: { data: GroupItem[] } }) => (
                    <GroupRow
                        name={item.name}
                        theme={theme}
                        premier={index === 0}
                        dernier={index === section.data.length - 1}
                        openGroup={this.openGroup}
                    />
                )}
                renderSectionHeader={({ section }: { section: { key?: string } }) => (
                    <SectionListHeader title={section.key ?? ''} theme={theme} />
                )}
                sections={this.state.sections}
                keyExtractor={(item, index) => index.toString()}
                initialNumToRender={20}
                onEndReachedThreshold={0.1}
                style={{ flex: 0, backgroundColor: theme.background }}
                onRefresh={this.refreshList}
                refreshing={this.state.refreshing}
                // Pas d'intertitre colle : la liste passe sous le bandeau en fondu, qui delaverait
                // un intertitre arrete en haut (deuxieme passe de 7-J).
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
            />
        );
    }

    renderContent(theme: import('../../../shared/theme/Theme').AppThemeType) {
        if (this.state.emptySearchResults) {
            return this.renderEmptyState(theme);
        } else if (this.state.sections === null) {
            return this.renderLoading(theme);
        } else {
            return this.renderList(theme);
        }
    }

    render() {
        const theme = style.Theme[this.app.themeName];

        return (
            <SafeAreaInsetsContext.Consumer>
                {(insets) => (
                    <View style={[style.list.homeView as never, { backgroundColor: theme.background }]}>
                        {/*
                          * Le bandeau de recherche est sur le fond de la page, et la liste passe
                          * dessous en fondu (7-J, deuxieme passe) : c'etait une dalle blanche bordee
                          * et ombree, posee sur une liste grise, et la liste s'y coupait net.
                          */}
                        <View style={{
                            paddingTop: (insets?.top || 0) + HAUTEUR_DE_BARRE_POUSSEE,
                            backgroundColor: theme.background,
                        }}>
                            {this.renderSearchInput(theme)}
                            {this.renderCacheDate(theme)}
                        </View>
                        <View style={{ flex: 1 }}>
                            {this.renderContent(theme)}
                            <FonduDeBord fond={theme.background} />
                        </View>
                    </View>
                )}
            </SafeAreaInsetsContext.Consumer>
        );
    }
}

export default HomeScreen;
import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import ScheduleScreen from '../../features/Planning/screens/ScheduleScreen';
import CampusDashboard from '../../features/Campus/Dashboard/CampusDashboard';
import ScolariteDashboard from '../../features/Scolarite/screens/ScolariteDashboard';
import SettingsScreen from '../../features/Settings/screens/SettingsScreen';

import style, { tokens, AppThemeType } from '../theme/Theme';
import { TAB_BAR_HEIGHT } from '../ui/ScreenState';
import { FondDePiedFlottant, VOILE_PIED } from '../ui/PiedFlottant';
import { AppContext } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { groupesRequis, portailPublie, serviceEtablissement } from '../etablissements';
import { useCredentials } from '../../features/Scolarite/services/CredentialsContext';
import { Dialogue } from '../ui/Dialogue';
import { ModaleBientot } from '../ui/ModaleBientot';

export type MainTabParamList = {
    PlanningTab: undefined;
    CampusTab: undefined;
    ScolariteTab: undefined;
    SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export interface CustomTabBarProps extends BottomTabBarProps {
    theme: AppThemeType;
}

interface TabBarRouteItemProps {
    route: { key: string; name: string };
    index: number;
    state: import('@react-navigation/native').TabNavigationState<import('@react-navigation/native').ParamListBase>;
    descriptors: import('@react-navigation/bottom-tabs').BottomTabBarProps['descriptors'];
    navigation: import('@react-navigation/native').NavigationHelpers<import('@react-navigation/native').ParamListBase, import('@react-navigation/bottom-tabs').BottomTabNavigationEventMap>;
    theme: AppThemeType;
}

function TabBarRouteItem({ route, index, state, descriptors, navigation, theme }: TabBarRouteItemProps) {
    const { options } = descriptors[route.key];
    const label = (options.tabBarLabel as string) !== undefined
        ? (options.tabBarLabel as string)
        : options.title !== undefined
            ? options.title
            : route.name;

    const isFocused = state.index === index;

    const onPress = () => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
        }
    };

    const onLongPress = () => {
        navigation.emit({
            type: 'tabLongPress',
            target: route.key,
        });
    };

    const color = isFocused ? (theme.accent ?? theme.primary) : theme.fontSecondary;

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={(options as { tabBarTestID?: string }).tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
        >
            <View style={[
                styles.iconContainer,
                isFocused && { backgroundColor: `${theme.primary}15` }
            ]}>
                {options.tabBarIcon && options.tabBarIcon({ color, size: 24, focused: isFocused })}
            </View>
            {/* La graisse ne change pas avec la selection : passer en gras elargissait le libelle
                d'un ou deux points et tout le rang tressaillait a chaque changement d'onglet. La
                couleur porte l'etat a elle seule, comme sur le bouton d'action a cote. */}
            <Text style={[styles.tabLabel, { color, fontWeight: '500' }]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

/**
 * La modale du campus non relie : le meme gabarit que « Bientot », un autre message.
 *
 * Le bouton principal ouvre la demande de campus, et son adresse vient du catalogue
 * (`services.adaptation`) — la meme que l'etat vide de l'onglet : publier ou changer ce lien est
 * une publication, pas une release. Sans lien publie, la modale garde sa seule sortie « Fermer ».
 */
function ModaleCampusNonRelie({ theme, visible, fermer, ouvrirDemande }: {
    theme: AppThemeType;
    visible: boolean;
    fermer: () => void;
    ouvrirDemande: (href: string) => void;
}) {
    const demande = serviceEtablissement('adaptation');
    return (
        <Dialogue
            theme={theme}
            visible={visible}
            fermer={fermer}
            titre={Translator.get('CAMPUS_NOT_SUPPORTED_TITLE')}
            corps={Translator.get('CAMPUS_NOT_SUPPORTED')}
            // La forme courte : dans une rangee a deux boutons, « Demander mon campus » se pliait
            // sur deux lignes. Le titre de la modale porte deja le contexte.
            action={demande === null ? undefined : {
                libelle: Translator.get('CAMPUS_REQUEST_SHORT'),
                onPress: () => ouvrirDemande(demande),
            }}
        />
    );
}

interface TabBarActionItemProps {
    currentRouteName: string;
    theme: AppThemeType;
    navigation: import('@react-navigation/native').NavigationHelpers<import('@react-navigation/native').ParamListBase, import('@react-navigation/bottom-tabs').BottomTabNavigationEventMap>;
    credentials: unknown;
}

/** Le bouton contextuel de droite : la meme carte pour les quatre onglets, seul le contenu change. */
function BoutonDAction({ icone, libelle, onPress, theme, children }: { icone: React.ComponentProps<typeof MaterialCommunityIcons>['name']; libelle: string; onPress: () => void; theme: AppThemeType; children?: React.ReactNode }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={[styles.groupButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        >
            <MaterialCommunityIcons name={icone} size={24} color={theme.accent ?? theme.primary} />
            <Text style={[styles.tabLabel, { color: theme.accent ?? theme.primary, fontWeight: '500', marginTop: tokens.space.xxs }]}>
                {libelle}
            </Text>
            {children}
        </TouchableOpacity>
    );
}

/** Le voile du teaser d'un bouton d'action : flou et cadenas, sans geste propre. */
function VoileDeBouton({ theme, themeName }: { theme: AppThemeType; themeName: 'light' | 'dark' }) {
    return (
        <View style={styles.voileMystere} pointerEvents="none">
            <BlurView
                intensity={20}
                tint={themeName === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
            />
            <MaterialCommunityIcons name="lock" size={18} color={theme.fontSecondary} />
        </View>
    );
}

function TabBarActionItem({ currentRouteName, theme, navigation, credentials }: TabBarActionItemProps) {
    const { themeName } = useContext(AppContext) as { themeName: 'light' | 'dark' };
    /** Le teaser du bouton Campus — et celui des Groupes sur un campus sans inventaire. */
    const [teaser, setTeaser] = useState(false);

    if (currentRouteName === 'PlanningTab') {
        // Sans inventaire de groupes — l'emploi du temps passe par un lien personnel — la recherche
        // n'a rien a chercher : le bouton passe sous le voile. Le seul cas actuel est le campus non
        // relie, d'ou la modale de demande ; un etablissement relie par abonnement demandera un
        // autre contenu le jour ou il existera.
        if (!groupesRequis()) {
            return (
                <>
                    <BoutonDAction icone="account-search-outline" libelle={Translator.get('GROUPS')} onPress={() => setTeaser(true)} theme={theme}>
                        <VoileDeBouton theme={theme} themeName={themeName} />
                    </BoutonDAction>
                    <ModaleCampusNonRelie
                        theme={theme}
                        visible={teaser}
                        fermer={() => setTeaser(false)}
                        ouvrirDemande={(href) => {
                            setTeaser(false);
                            (navigation as { navigate: (name: string, params?: object) => void }).navigate('WebBrowser', { href });
                        }}
                    />
                </>
            );
        }
        return <BoutonDAction icone="account-search-outline" libelle={Translator.get('GROUPS')} onPress={() => navigation.navigate('GroupSearch' as never)} theme={theme} />;
    }

    if (currentRouteName === 'SettingsTab') {
        return <BoutonDAction icone="information-outline" libelle={Translator.get('ABOUT')} onPress={() => navigation.navigate('About' as never)} theme={theme} />;
    }

    // « Compte » et non « Deconnexion », depuis le 2026-08-25 : cet ecran ne sert plus a partir. Il
    // porte l'etat civil, l'INE, les identifiants et trois gestes dont un seul deconnecte — le
    // nommer par le plus destructeur des trois dissuadait d'y aller pour consulter.
    if (currentRouteName === 'ScolariteTab' && credentials) {
        return <BoutonDAction icone="account-circle-outline" libelle={Translator.get('ACCOUNT')} onPress={() => navigation.navigate('CredentialsSettings' as never)} theme={theme} />;
    }

    // Sur un campus dont aucun portail n'est publie, c'est le bouton Compte qui porte le teaser —
    // et non l'onglet, qui s'ouvre desormais sur une page a lui (6.1-A). Le voile dit qu'un compte
    // n'est pas encore possible ici, et le toucher ouvre la demande de campus. Le declencheur reste
    // la donnee du catalogue : relier le campus fait tomber le voile sans release.
    if (currentRouteName === 'ScolariteTab' && !portailPublie()) {
        return (
            <>
                <BoutonDAction icone="account-circle-outline" libelle={Translator.get('ACCOUNT')} onPress={() => setTeaser(true)} theme={theme}>
                    <VoileDeBouton theme={theme} themeName={themeName} />
                </BoutonDAction>
                <ModaleCampusNonRelie
                    theme={theme}
                    visible={teaser}
                    fermer={() => setTeaser(false)}
                    ouvrirDemande={(href) => {
                        setTeaser(false);
                        // La route vit dans le Stack racine, au-dessus des onglets : react-navigation
                        // remonte tout seul, mais le type des helpers d'onglets ne le sait pas.
                        (navigation as { navigate: (name: string, params?: object) => void }).navigate('WebBrowser', { href });
                    }}
                />
            </>
        );
    }

    // Le bouton mysterieux de Campus : la capacite n'existe pas encore, et l'emplacement l'assume —
    // meme teaser que les rangees de la Scolarite (contenu floute, cadenas, modale « Bientot »).
    // Quand elle arrivera, ce sera par ici, sans que la barre change de forme.
    if (currentRouteName === 'CampusTab') {
        return (
            <>
                <BoutonDAction icone="compass-outline" libelle={Translator.get('CAMPUS')} onPress={() => setTeaser(true)} theme={theme}>
                    <VoileDeBouton theme={theme} themeName={themeName} />
                </BoutonDAction>
                <ModaleBientot theme={theme} visible={teaser} fermer={() => setTeaser(false)} />
            </>
        );
    }

    // Placeholder invisible — maintient la largeur de la tab bar sans afficher de contour
    return <View style={{ width: 65, height: TAB_BAR_HEIGHT }} />;
}

// Composant Custom Tab Bar pour reproduire l'effet Apple Music (décalé à gauche, ratio icon/text, bords arrondis)
function CustomTabBar({ state, descriptors, navigation, theme }: CustomTabBarProps) {
    const { credentials } = useCredentials();
    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => {
                const bottomPadding = Math.max(tokens.space.sm, (insets?.bottom || 0) - 15);

                return (
                    <View style={[styles.tabBarWrapper, { paddingBottom: bottomPadding }]}>
                        {/* La fumee des flottants du bas (PiedFlottant) : la barre d'onglets survole
                            le contenu comme les pieds d'action, elle parle donc pareil. Les quatre
                            onglets partagent `theme.background` — `courseBackground` lui est
                            identique dans les deux themes. */}
                        <FondDePiedFlottant fond={theme.background} />
                        <View style={[
                            styles.tabBarContainer,
                            {
                                backgroundColor: theme.cardBackground,
                                borderColor: theme.border,
                            }
                        ]}>
                            {state.routes.map((route, index) => (
                                <TabBarRouteItem 
                                    key={index} 
                                    route={route} 
                                    index={index} 
                                    state={state} 
                                    descriptors={descriptors} 
                                    navigation={navigation} 
                                    theme={theme} 
                                />
                            ))}
                        </View>
                        
                        {/* Bouton accès groupes — visible uniquement sur l'onglet Planning */}
                        <TabBarActionItem 
                            currentRouteName={state.routes[state.index].name} 
                            theme={theme} 
                            navigation={navigation} 
                            credentials={credentials} 
                        />
                    </View>
                );
            }}
        </SafeAreaInsetsContext.Consumer>
    );
}

export default function MainTabNavigator() {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    return (
        <Tab.Navigator
            id="MainTabs"
            tabBar={props => <CustomTabBar {...props} theme={theme} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="PlanningTab"
                component={PlanningStackScreen}
                options={{
                    tabBarLabel: Translator.get('MY_PLANNING'),
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-month-outline" size={24} color={color} />,
                    headerShown: false
                }}
            />
            <Tab.Screen
                name="CampusTab"
                component={CampusDashboard}
                options={{
                    tabBarLabel: Translator.get('CAMPUS'),
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="domain" size={24} color={color} />
                }}
            />
            <Tab.Screen
                name="ScolariteTab"
                component={ScolariteDashboard}
                options={{
                    tabBarLabel: Translator.get('SCOLARITY'),
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="toolbox-outline" size={24} color={color} />
                }}
            />
            <Tab.Screen
                name="SettingsTab"
                component={SettingsScreen}
                options={{
                    tabBarLabel: Translator.get('SETTINGS'),
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cog-outline" size={24} color={color} />
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBarWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingHorizontal: tokens.space.md,
        // La fumee monte au-dessus de la barre : c'est ce rembourrage qui lui donne sa hauteur.
        paddingTop: VOILE_PIED,
        backgroundColor: 'transparent',
    },
    tabBarContainer: {
        flex: 1,
        flexDirection: 'row',
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        height: TAB_BAR_HEIGHT,
        elevation: 8,
        // Les deux ombres de la barre sont ecrites a la main, plus marquees que les tokens (docs/theme.md § limites) ; leur couleur est la leur.
        shadowColor: tokens.shadow.md.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        marginRight: tokens.space.xl, // C'est ici qu'on recrée le décalage sur la gauche
    },
    groupButton: {
        width: 65,
        height: TAB_BAR_HEIGHT,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: tokens.shadow.md.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: tokens.space.xs,
    },
    iconContainer: {
        width: 44,
        height: 34,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: tokens.radius.md,
        marginBottom: tokens.space.xxs,
        overflow: 'hidden',
    },
    tabLabel: {
        // eslint-disable-next-line ukit/no-style-literals -- 10 : le libelle d'onglet, hors echelle assume ; passer a 12 changerait la barre, ce qui est l'affaire de 6.1-E
        fontSize: 10,
    },
    voileMystere: {
        // Le calque du teaser, clippe aux coins du bouton : `overflow: hidden` sur le bouton
        // lui-meme mangerait son ombre sur iOS — meme montage que `GlypheFiligrane`.
        ...StyleSheet.absoluteFillObject,
        borderRadius: tokens.radius.md,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export type PlanningStackParamList = {
    ScheduleInternal: { name: string[] };
};

const PlanningStack = createStackNavigator<PlanningStackParamList>();
function PlanningStackScreen() {
    return (
        <PlanningStack.Navigator id="PlanningStack">
            <PlanningStack.Screen
                name="ScheduleInternal"
                component={ScheduleScreen}
                initialParams={{ name: [] }}
                options={{ headerShown: false }} // DayView gère son propre header sticky avec safe area
            />
        </PlanningStack.Navigator>
    );
}

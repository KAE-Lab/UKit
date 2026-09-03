import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, View, Modal, Text, Animated, ScrollView, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationOptions } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsManager } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { HeaderButton, HEADER_BUTTON_ICON, HEADER_BUTTON_SIZE } from '../ui/HeaderButton';
import style, { propsLibelleBouton, tokens } from '../theme/Theme';


// GESTIONNAIRE DE HEADER
export type ScrollValueWithInterps = Animated.Value & {
    _titleOpacity?: Animated.AnimatedInterpolation<number | string>;
};

export const globalScrollValues: Record<string, ScrollValueWithInterps> = {};

export interface NavBarHelperProps {
    title?: string;
    headerLeft?: () => React.ReactNode;
    headerRight?: () => React.ReactNode;
    themeName: string;
    route?: RouteProp<Record<string, object | undefined>, string>;
    gestureEnabled?: boolean;
}

export const NavBarHelper = ({ title, headerLeft, headerRight, themeName, route, gestureEnabled }: NavBarHelperProps): StackNavigationOptions => {
    const theme = style.Theme[themeName];
    
    // La variable est lue depuis le dictionnaire externe pour survivre aux mises à jour
    const safeScrollY = (route && globalScrollValues[route.key]) ? globalScrollValues[route.key] : new Animated.Value(0);

    if (!(safeScrollY as ScrollValueWithInterps)._titleOpacity) {
        (safeScrollY as ScrollValueWithInterps)._titleOpacity = safeScrollY.interpolate({
            inputRange: [0, 60],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
    }

    const options: StackNavigationOptions = {
        headerTitle: () => (
            <Animated.View style={{ 
                opacity: (safeScrollY as ScrollValueWithInterps)._titleOpacity,  
                paddingHorizontal: tokens.space.lg, 
                height: HEADER_BUTTON_SIZE, // On fige la hauteur pour correspondre aux boutons latéraux
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: tokens.radius.md, 
                maxWidth: 300 
            }}>
                {/* `font` et non `primary` : le violet est la couleur d'action, et un titre en couleur
                    d'action se lit comme un bouton — a cote d'une fleche de retour qui, elle, en est
                    un. Le titre nomme, il ne se touche pas. Et `xl` demi-gras : le gras claquait seul
                    au milieu du vide, mais le 18 essaye ensuite disparaissait entre deux boutons de
                    40 — le 22 demi-gras est l'equilibre, juge sur appareil. On n'y touche plus. */}
                <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: theme.font, fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.semibold }}>
                    {title}
                </Text>
            </Animated.View>
        ),
        headerTransparent: true, 
        headerStyle: {
            backgroundColor: 'transparent',
            elevation: 0, 
            shadowOpacity: 0, 
            borderBottomWidth: 0,
        },
        /* eslint-disable ukit/no-style-literals -- 10 : l'en-tete de reference, mesure a l'inventaire visuel, hors echelle assume ; la passe 6.1-C ne deplace pas un pixel */
        headerTitleContainerStyle: { paddingTop: 10 },
        headerLeftContainerStyle: { paddingTop: 10 },
        headerRightContainerStyle: { paddingTop: 10 },
        /* eslint-enable ukit/no-style-literals */
        headerTitleAlign: 'center',
    };

    if (headerLeft !== undefined) {
        options.headerLeft = headerLeft ? () => (
            <View style={styles.boutonEnTete}>
                {headerLeft()}
            </View>
        ) : undefined;
    }
    if (headerRight !== undefined) {
        options.headerRight = headerRight ? () => (
            <View style={styles.boutonEnTete}>
                {headerRight()}
            </View>
        ) : undefined;
    }

    if (gestureEnabled !== undefined) {
        options.gestureEnabled = gestureEnabled;
    }

    return options;
};

// ── BOUTON SAUVEGARDER GROUPE ───────────────────────────────────────────
export interface SaveGroupButtonProps {
    groupName: string | string[];
    themeName: string;
}

export interface SaveGroupButtonState {
    favoriteGroups: string[];
    modalVisible: boolean;
}

export class SaveGroupButton extends React.Component<SaveGroupButtonProps, SaveGroupButtonState> {
    constructor(props: SaveGroupButtonProps) {
        super(props);
        this.state = {
            favoriteGroups: SettingsManager.getFavoriteGroups(),
            modalVisible: false
        };
    }
    componentDidMount() {
        SettingsManager.on('favoriteGroups', this.handleFavoriteGroupsUpdate);
    }
    componentWillUnmount() {
        SettingsManager.unsubscribe('favoriteGroups', this.handleFavoriteGroupsUpdate);
    }
    handleFavoriteGroupsUpdate = (groups: string[]) => {
        this.setState({ favoriteGroups: [...groups] });
    };
    saveGroup() {
        // If we are viewing multiple groups at once (aggregated), we can't 'save' the aggregate.
        // It's mostly when viewing a single group.
        if (Array.isArray(this.props.groupName)) return; 

        if (this.isSaved()) {
            SettingsManager.removeFavoriteGroup(this.props.groupName);
        } else {
            SettingsManager.addFavoriteGroup(this.props.groupName);
        }
    }
    isSaved() {
        if (Array.isArray(this.props.groupName)) return true;
        return this.state.favoriteGroups.includes(this.props.groupName);
    }
    render() {
        const theme = style.Theme[this.props.themeName] || style.Theme.light;
        
        if (Array.isArray(this.props.groupName)) {
            return (
                <View>
                    <TouchableOpacity onPress={() => this.setState({ modalVisible: true })} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                        <HeaderButton theme={theme}>
                            <MaterialCommunityIcons name="filter-variant-remove" size={HEADER_BUTTON_ICON} color={theme.primary} />
                        </HeaderButton>
                    </TouchableOpacity>
                    <Modal animationType="fade" transparent={true} visible={this.state.modalVisible} onRequestClose={() => this.setState({ modalVisible: false })}>
                        <TouchableWithoutFeedback onPress={() => this.setState({ modalVisible: false })}>
                            <View style={theme.settings.popup.background}>
                                <View style={theme.settings.popup.container}>
                                    <View style={theme.settings.popup.header}>
                                        <Text style={theme.settings.popup.textHeader}>{Translator.get('MY_PLANNING')}</Text>
                                        <TouchableOpacity onPress={() => this.setState({ modalVisible: false })} hitSlop={12}>
                                            <MaterialIcons name="close" size={24} style={theme.settings.popup.closeIcon} />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <Text style={theme.settings.popup.textDescription}>
                                        {Translator.get('FAVORITES_MANAGE')}
                                    </Text>
                                    
                                    <ScrollView style={{ maxHeight: 300 }}>
                                        {this.state.favoriteGroups.length === 0 && (
                                            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.sm, fontStyle: 'italic', paddingBottom: tokens.space.lg }}>
                                                {Translator.get('FAVORITES_EMPTY')}
                                            </Text>
                                        )}
                                        {this.state.favoriteGroups.map((group) => (
                                            <View key={group} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.greyBackground, padding: tokens.space.sm, borderRadius: tokens.radius.md, marginBottom: tokens.space.sm }}>
                                                <Text style={{ color: theme.font, fontSize: tokens.fontSize.md, flex: 1 }}>{group.replace(/_/g, ' ')}</Text>
                                                <TouchableOpacity onPress={() => SettingsManager.removeFavoriteGroup(group)} style={{ padding: tokens.space.xs, paddingHorizontal: tokens.space.sm }} hitSlop={8}>
                                                    <MaterialIcons name="delete" size={24} color={theme.danger} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
                </View>
            );
        }

        return (
            <TouchableOpacity onPress={() => this.saveGroup()} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <HeaderButton theme={theme} fond={theme.primary}>
                    {/* `lightFont` et non `accentFont` : ce dernier est le rouge destructif (docs/theme.md). */}
                    <MaterialIcons name={this.isSaved() ? 'star' : 'star-border'} size={HEADER_BUTTON_ICON} color={theme.lightFont} />
                </HeaderButton>
            </TouchableOpacity>
        );
    }
}

// ── BOUTON RETIRER FILTRES UE ───────────────────────────────────────────
export interface FilterRemoveButtonProps {
    UE?: string;
    themeName: string;
    backAction: () => void;
}

export interface FilterRemoveButtonState {
    popupVisible: boolean;
}

export class FilterRemoveButton extends React.Component<FilterRemoveButtonProps, FilterRemoveButtonState> {
    constructor(props: FilterRemoveButtonProps) {
        super(props);
        this.state = { popupVisible: false };
    }
    popupClose = () => this.setState({ popupVisible: false });
    openPopup = () => this.setState({ popupVisible: true });
    filterOutUE = () => {
        if (this.props.UE) SettingsManager.addFilters(this.props.UE);
        this.popupClose();
        this.props.backAction();
    };
    render() {
        const theme = style.Theme[this.props.themeName] || style.Theme.light;
        const popupTheme = theme.settings.popup;

        return (
            <View>
                <HeaderButton theme={theme} onPress={this.openPopup}>
                    <MaterialCommunityIcons name="filter-variant-remove" size={HEADER_BUTTON_ICON} color={theme.primary} />
                </HeaderButton>
                <Modal animationType="fade" transparent={true} visible={this.state.popupVisible} onRequestClose={this.popupClose}>
                    <View style={popupTheme.background}>
                        <View style={popupTheme.container}>
                            <View style={popupTheme.header}>
                                <Text style={popupTheme.textHeader}>{Translator.get('FILTERS_UE')}</Text>
                            </View>
                            <Text style={popupTheme.textDescription}>{Translator.get('FILTERS_CONFIRMATION')}</Text>
                            <View style={popupTheme.buttonContainer}>
                                <TouchableOpacity style={popupTheme.buttonSecondary} onPress={this.popupClose}>
                                    <Text {...propsLibelleBouton} style={popupTheme.buttonTextSecondary}>{Translator.get('CANCEL')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={popupTheme.buttonMain} onPress={this.filterOutUE}>
                                    <Text {...propsLibelleBouton} style={popupTheme.buttonTextMain}>{Translator.get('CONFIRM')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }
}

// ENGLOBEUR D'ANIMATION (HOC) CENTRALISÉ
export const withHeaderAnimation = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
    return function AnimatedHeaderWrapper(props: P & { target?: unknown }) {
        const scrollY = useRef(new Animated.Value(0)).current;
        const navigation = useNavigation();
        const route = useRoute();
        const insets = useSafeAreaInsets();

        useEffect(() => {
            scrollY.setValue(0);
        }, [props.target]);

        useEffect(() => {
            // On planque la variable hors de React Navigation
            globalScrollValues[route.key] = scrollY;
            
            // On force un rafraîchissement avec un paramètre simple (sérialisable)
            setTimeout(() => {
                if (navigation) navigation.setParams({ animatedReady: true } as never);
            }, 50);

            return () => {
                // Nettoyage pour éviter les fuites de mémoire
                delete globalScrollValues[route.key]; 
            };
        }, [route.key, navigation]);

        const onAnimatedScroll = useRef(
            Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false } 
            )
        ).current;

        const headerPadding = { paddingTop: (insets.top || 0) + 70, paddingBottom: tokens.space.sm };

        return <WrappedComponent {...props} onAnimatedScroll={onAnimatedScroll} headerPadding={headerPadding} />;
    };
};

// ENGLOBEUR STATIQUE CENTRALISÉ (Pour les pages sans scroll)
export const withStaticHeader = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
    return function StaticHeaderWrapper(props: P) {
        const insets = useSafeAreaInsets();
        // On renvoie exactement le même espacement que l'animation, mais sans la logique de défilement
        const headerPadding = { paddingTop: (insets.top || 0) + 70, paddingBottom: tokens.space.sm };
        return <WrappedComponent {...props} headerPadding={headerPadding} />;
    };
};

const styles = StyleSheet.create({
    /**
     * Le cadre des boutons d'en-tete : une hauteur figee, et rien d'autre.
     *
     * Il portait une **mise a l'echelle animee** — 1,14 au repos, 1 une fois defile — retiree le
     * 2026-08-29 : la decision de ne plus faire retrecir les boutons avait ete prise, mais elle
     * n'avait ete appliquee qu'a moitie. `useCampusListHeader` en gardait une copie dont le repli
     * etait la **valeur statique 1,14**, si bien que le bouton de filtre restait agrandi de 14 % en
     * permanence, seul de sa barre. Le cadre reste, parce que c'est lui qui aligne les boutons sur la
     * hauteur du titre.
     */
    boutonEnTete: {
        height: HEADER_BUTTON_SIZE,
        justifyContent: 'center',
    },
});

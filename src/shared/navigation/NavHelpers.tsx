import React, { useRef, useEffect } from 'react';
import { Animated, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationOptions } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsManager } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { HeaderButton, HEADER_BUTTON_ICON, HEADER_BUTTON_SIZE } from '../ui/HeaderButton';
import style, { propsLibelleBouton, tokens } from '../theme/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { fonduDuBord } from '../ui/fondDOnglet';
import { HAUTEUR_DU_FONDU } from '../ui/FonduDeBord';
import { Icon } from '../ui/Icon';

// GESTIONNAIRE DE HEADER
export type ScrollValueWithInterps = Animated.Value & {
    _fondOpacity?: Animated.AnimatedInterpolation<number | string>;
};

/**
 * La course de defilement sur laquelle la barre prend son fond. Courte : sur un ecran pousse, le
 * contenu passe sous la barre des le premier point. La barre compacte des onglets (`EnTeteDOnglet`)
 * attend, elle, que son grand titre soit parti.
 */
const COURSE_DU_FOND = 24;

/**
 * L'air entre les boutons de la barre et l'endroit ou le contenu disparait : le fond plein descend
 * d'autant sous la barre avant le fondu. A zero, le contenu s'effacait au ras de la fleche de retour
 * (review du 2026-11-06, « un peu trop colle »).
 */
const AIR_SOUS_LA_BARRE = tokens.space.md;

export const globalScrollValues: Record<string, ScrollValueWithInterps> = {};

export interface NavBarHelperProps {
    title?: string;
    headerLeft?: () => React.ReactNode;
    headerRight?: () => React.ReactNode;
    themeName: string;
    route?: RouteProp<Record<string, object | undefined>, string>;
    gestureEnabled?: boolean;
    /**
     * Faux pour un ecran qui porte son propre en-tete fixe sous la barre : le Planning d'un groupe.
     * Sa liste transmet son defilement, et le fond de la barre recouvrait alors le haut de cet
     * en-tete, teinte comprise, en rognant la rangee « Aujourd'hui / Semaine » (constate sur le banc,
     * deuxieme passe de 7-J). L'ecran pose lui-meme le fondu de sa liste.
     */
    fondAuDefilement?: boolean;
}

export const NavBarHelper = ({ title, headerLeft, headerRight, themeName, route, gestureEnabled, fondAuDefilement = true }: NavBarHelperProps): StackNavigationOptions => {
    const theme = style.Theme[themeName];
    
    // La variable est lue depuis le dictionnaire externe pour survivre aux mises à jour
    const safeScrollY = (route && globalScrollValues[route.key]) ? globalScrollValues[route.key] : new Animated.Value(0);

    if (!(safeScrollY as ScrollValueWithInterps)._fondOpacity) {
        (safeScrollY as ScrollValueWithInterps)._fondOpacity = safeScrollY.interpolate({
            inputRange: [0, COURSE_DU_FOND],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });
    }

    const options: StackNavigationOptions = {
        /*
         * **La barre se pose sur le fond de l'ecran, et le contenu s'y fond** (7-J), comme sous
         * l'en-tete des onglets : le meme systeme partout (review du 2026-11-05). Des que le contenu
         * passe dessous, la barre prend la couleur de la page et un fondu la prolonge vers le bas ; la
         * premiere passe y posait un filet, une coupe seche de plus. Le titre ne s'efface plus : il
         * s'effacait parce que la barre n'avait pas de fond. Un ecran qui ne transmet pas son
         * defilement garde la barre transparente, comme avant.
         */
        headerBackground: () => (!fondAuDefilement ? null : (
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { opacity: (safeScrollY as ScrollValueWithInterps)._fondOpacity }]}
            >
                <View style={[styles.fondDeLaBarre, { backgroundColor: theme.background }]} />
                <LinearGradient
                    colors={fonduDuBord(theme.background).colors}
                    locations={fonduDuBord(theme.background).locations}
                    style={styles.fonduSousLaBarre}
                />
            </Animated.View>
        )),
        headerTitle: () => (
            <View style={{
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
            </View>
        ),
        headerTransparent: true, 
        /*
         * Le conteneur du fond descend de la hauteur du fondu sous la barre (troisieme passe de 7-J) :
         * le fond plein couvre toute la barre, et le fondu commence **sous** le titre, comme sous un
         * grand titre. Il occupait les 24 derniers points de la barre et coupait le titre et les
         * boutons a mi-hauteur (review du 2026-11-06). Le degrade reste dans les bords de son parent,
         * ce conteneur, la condition que le rendu logiciel de l'emulateur imposait.
         */
        headerBackgroundContainerStyle: fondAuDefilement ? { bottom: -(HAUTEUR_DU_FONDU + AIR_SOUS_LA_BARRE) } : undefined,
        headerStyle: {
            backgroundColor: 'transparent',
            elevation: 0, 
            shadowOpacity: 0, 
            borderBottomWidth: 0,
        },
        // Les trois calages de l'en-tete valaient 10, hors echelle : `space.sm` (8) les rassemble
        // sur un pas. Deux points de moins sur un en-tete de 70 ne deplacent pas le titre a l'oeil,
        // et c'est ce qui a decide l'arbitrage (6.1-E) — la valeur unique vaut mieux que la valeur
        // exacte quand l'ecart n'est pas perceptible.
        headerTitleContainerStyle: { paddingTop: tokens.space.sm },
        headerLeftContainerStyle: { paddingTop: tokens.space.sm },
        headerRightContainerStyle: { paddingTop: tokens.space.sm },
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
        /*
         * **iOS seulement.** Le glissement de retour est un geste du systeme la-bas ; sur Android,
         * le retour se fait par le bouton ou par le geste de bord de l'ecran, et l'activer dans la
         * pile pose un capteur horizontal sur **toute la largeur** qui avale les listes qui glissent.
         * Mesure sur appareil le 2026-09-08 : dans le planning d'un groupe cherche, ni le ruban des
         * jours ni le carrousel des cours simultanes ne repondaient plus. C'est la meme famille que
         * le glissement entre onglets retire au jalon 6.1.x-B, et pour la meme raison.
         */
        options.gestureEnabled = Platform.OS === 'ios' && gestureEnabled;
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
                            <Icon icon={{ name: 'filter-variant-remove' }} size={HEADER_BUTTON_ICON} color={theme.primary} />
                        </HeaderButton>
                    </TouchableOpacity>
                    <Modal animationType="fade" transparent={true} visible={this.state.modalVisible} onRequestClose={() => this.setState({ modalVisible: false })}>
                        <TouchableWithoutFeedback onPress={() => this.setState({ modalVisible: false })}>
                            <View style={theme.settings.popup.background}>
                                <View style={theme.settings.popup.container}>
                                    <View style={theme.settings.popup.header}>
                                        <Text style={theme.settings.popup.textHeader}>{Translator.get('MY_PLANNING')}</Text>
                                        <TouchableOpacity onPress={() => this.setState({ modalVisible: false })} hitSlop={12}>
                                            <Icon icon={{ family: 'material', name: 'close' }} size={24} color={theme.settings.popup.closeIcon.color as string} />
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
                                                    <Icon icon={{ family: 'material', name: 'delete' }} size={24} color={theme.danger} />
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
                    <Icon icon={{ family: 'material', name: this.isSaved() ? 'star' : 'star-border' }} size={HEADER_BUTTON_ICON} color={theme.lightFont} />
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
                    <Icon icon={{ name: 'filter-variant-remove' }} size={HEADER_BUTTON_ICON} color={theme.primary} />
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

/**
 * La hauteur de la barre d'un ecran pousse, sous la zone sure : ce que son contenu degage en haut.
 * Les bandeaux fixes des fiches (`BandeauDeCases`) s'y alignent aussi ; ils posaient 65 en dur.
 */
export const HAUTEUR_DE_BARRE_POUSSEE = 70;

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

        const headerPadding = { paddingTop: (insets.top || 0) + HAUTEUR_DE_BARRE_POUSSEE, paddingBottom: tokens.space.sm };

        return <WrappedComponent {...props} onAnimatedScroll={onAnimatedScroll} headerPadding={headerPadding} />;
    };
};

// ENGLOBEUR STATIQUE CENTRALISÉ (Pour les pages sans scroll)
export const withStaticHeader = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
    return function StaticHeaderWrapper(props: P) {
        const insets = useSafeAreaInsets();
        // On renvoie exactement le même espacement que l'animation, mais sans la logique de défilement
        const headerPadding = { paddingTop: (insets.top || 0) + HAUTEUR_DE_BARRE_POUSSEE, paddingBottom: tokens.space.sm };
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
    // Le fond plein couvre la barre, le fondu vit dans le prolongement du conteneur, sous elle. Dans
    // les bords de ce conteneur : un degrade dessine hors des bords de son parent faisait planter le
    // rendu logiciel de l'emulateur (SwiftShader), trois fois sur le banc.
    fondDeLaBarre: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: HAUTEUR_DU_FONDU,
    },
    fonduSousLaBarre: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: HAUTEUR_DU_FONDU,
    },
});

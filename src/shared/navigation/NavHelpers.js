import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, View, Modal, Text, Animated, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsManager } from '../services/AppCore';
import Translator from '../i18n/Translator';
import style, { tokens } from '../theme/Theme';
import Button from '../ui/Button';


// GESTIONNAIRE DE HEADER
export const globalScrollValues = {};
export const NavBarHelper = ({ title, headerLeft, headerRight, themeName, route, gestureEnabled }) => {
    const theme = style.Theme[themeName];
    
    // La variable est lue depuis le dictionnaire externe pour survivre aux mises à jour
    const safeScrollY = (route && globalScrollValues[route.key]) ? globalScrollValues[route.key] : new Animated.Value(0);

    if (!safeScrollY._titleOpacity) {
        safeScrollY._titleOpacity = safeScrollY.interpolate({
            inputRange: [0, 60],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        safeScrollY._buttonScale = safeScrollY.interpolate({
            inputRange: [0, 60],
            outputRange: [1.14, 1],
            extrapolate: 'clamp',
        });
    }

    const options = {
        headerTitle: () => (
            <Animated.View style={{ 
                opacity: safeScrollY._titleOpacity,  
                paddingHorizontal: tokens.space.lg, 
                height: 45, // On fige la hauteur pour correspondre aux boutons latéraux
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: tokens.radius.md, 
                maxWidth: 300 
            }}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: theme.primary, fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold }}>
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
        headerTitleContainerStyle: { paddingTop: 10 },
        headerLeftContainerStyle: { paddingTop: 10 },
        headerRightContainerStyle: { paddingTop: 10 },
        headerTitleAlign: 'center',
    };

    if (headerLeft !== undefined) {
        options.headerLeft = headerLeft ? () => (
            <Animated.View style={{ transform: [{ scale: safeScrollY._buttonScale }], height: 45, justifyContent: 'center' }}>
                {headerLeft()}
            </Animated.View>
        ) : undefined;
    }
    if (headerRight !== undefined) {
        options.headerRight = headerRight ? () => (
            <Animated.View style={{ transform: [{ scale: safeScrollY._buttonScale }], height: 45, justifyContent: 'center' }}>
                {headerRight()}
            </Animated.View>
        ) : undefined;
    }

    if (gestureEnabled !== undefined) {
        options.gestureEnabled = gestureEnabled;
    }

    return options;
};

// ── BOUTON SAUVEGARDER GROUPE ───────────────────────────────────────────
export class SaveGroupButton extends React.Component {
    constructor(props) {
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
    handleFavoriteGroupsUpdate = (groups) => {
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
                        <View style={{ backgroundColor: theme.greyBackground, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.md, flexShrink: 0 }}>
                            <MaterialCommunityIcons name="format-list-bulleted" size={26} color={theme.primary} />
                        </View>
                    </TouchableOpacity>
                    <Modal animationType="fade" transparent={true} visible={this.state.modalVisible} onRequestClose={() => this.setState({ modalVisible: false })}>
                        <TouchableWithoutFeedback onPress={() => this.setState({ modalVisible: false })}>
                            <View style={theme.settings.popup.background}>
                                <View style={theme.settings.popup.container}>
                                    <View style={theme.settings.popup.header}>
                                        <Text style={theme.settings.popup.textHeader}>{Translator.get('MY_PLANNING') || 'Mon Planning'}</Text>
                                        <TouchableOpacity onPress={() => this.setState({ modalVisible: false })}>
                                            <MaterialIcons name="close" size={32} style={theme.settings.popup.closeIcon} />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <Text style={[theme.settings.popup.textDescription, { marginBottom: 15 }]}>
                                        {Translator.get('FAVORITES_MANAGE') || "Gérez vos groupes favoris :"}
                                    </Text>
                                    
                                    <ScrollView style={{ maxHeight: 300 }}>
                                        {this.state.favoriteGroups.length === 0 && (
                                            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.sm, fontStyle: 'italic', paddingBottom: tokens.space.lg }}>
                                                {Translator.get('FAVORITES_EMPTY') || "Votre liste de favoris est vide. Recherchez un groupe de l'Université pour l'ajouter à un de vos favoris !"}
                                            </Text>
                                        )}
                                        {this.state.favoriteGroups.map((group) => (
                                            <View key={group} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.greyBackground, padding: tokens.space.sm, borderRadius: tokens.radius.md, marginBottom: tokens.space.sm }}>
                                                <Text style={{ color: theme.font, fontSize: tokens.fontSize.md, flex: 1 }}>{group.replace(/_/g, ' ')}</Text>
                                                <TouchableOpacity onPress={() => SettingsManager.removeFavoriteGroup(group)} style={{ padding: tokens.space.xs, paddingHorizontal: 10 }}>
                                                    <MaterialIcons name="delete" size={24} color={'#E53935'} />
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
                <View style={{ backgroundColor: theme.greyBackground, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.md, flexShrink: 0 }}>
                    <MaterialIcons name={this.isSaved() ? 'star' : 'star-border'} size={26} color={theme.primary} />
                </View>
            </TouchableOpacity>
        );
    }
}

// ── BOUTON RETIRER FILTRES UE ───────────────────────────────────────────
export class FilterRemoveButton extends React.Component {
    constructor(props) {
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
                <TouchableOpacity onPress={this.openPopup} style={{ backgroundColor: theme.greyBackground, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.md }}>
                    <MaterialCommunityIcons name="filter-variant-remove" size={24} color={theme.primary} />
                </TouchableOpacity>
                <Modal animationType="fade" transparent={true} visible={this.state.popupVisible} onRequestClose={this.popupClose}>
                    <View style={popupTheme.background}>
                        <View style={popupTheme.container}>
                            <View style={popupTheme.header}>
                                <Text style={popupTheme.textHeader}>{Translator.get('FILTERS_UE').toUpperCase()}</Text>
                            </View>
                            <Text style={popupTheme.textDescription}>{Translator.get('FILTERS_CONFIRMATION')}</Text>
                            <View style={popupTheme.buttonContainer}>
                                <TouchableOpacity style={popupTheme.buttonSecondary} onPress={this.popupClose}>
                                    <Text style={popupTheme.buttonTextSecondary}>{Translator.get('CANCEL')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={popupTheme.buttonMain} onPress={this.filterOutUE}>
                                    <Text style={popupTheme.buttonTextMain}>{Translator.get('CONFIRM')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }
}

// ── BOUTON MON GROUPE ──────────────────────────────────
export class MyGroupButton extends React.PureComponent {
    componentDidMount() {
        if (this.props.favoriteGroups && this.props.favoriteGroups.length > 0 && SettingsManager.getOpenAppOnFavoriteGroup()) {
            this.props.navigate('Stack', { screen: 'Group', params: { name: this.props.favoriteGroups } });
        }
    }
    _onPress = () => this.props.navigate('Stack', { screen: 'Group', params: { name: this.props.favoriteGroups } });
    render() {
        const theme = style.Theme[this.props.themeName];
        let title = Translator.get('MY_PLANNING') || "Mon Planning";
        return (
            <Button
                title={title}
                size={22}
                textSize={14}
                icon="calendar-today"
                color={theme.primary}
                fontColor={theme.font}
                onPress={this._onPress}
                isActive={this.props.isActive}
            />
        );
    }
}

// ENGLOBEUR D'ANIMATION (HOC) CENTRALISÉ
export const withHeaderAnimation = (WrappedComponent) => {
    return function AnimatedHeaderWrapper(props) {
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
                if (navigation) navigation.setParams({ animatedReady: true });
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
export const withStaticHeader = (WrappedComponent) => {
    return function StaticHeaderWrapper(props) {
        const insets = useSafeAreaInsets();
        // On renvoie exactement le même espacement que l'animation, mais sans la logique de défilement
        const headerPadding = { paddingTop: (insets.top || 0) + 70, paddingBottom: tokens.space.sm };
        return <WrappedComponent {...props} headerPadding={headerPadding} />;
    };
};
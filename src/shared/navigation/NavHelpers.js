import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, View, Modal, Text, Animated } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { SettingsManager } from '../services/AppCore';
import Translator from '../i18n/Translator';
import style, { tokens } from '../theme/Theme';
import Button from '../ui/Button';


// GESTIONNAIRE DE HEADER
export const globalScrollValues = {};
export const NavBarHelper = ({ title, headerLeft, headerRight, themeName, route }) => {
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
            outputRange: [1.15, 0.9],
            extrapolate: 'clamp',
        });
    }

    const options = {
        headerTitle: () => (
            <Animated.View style={{ opacity: safeScrollY._titleOpacity, backgroundColor: theme.primary, paddingHorizontal: tokens.space.md, paddingVertical: 6, borderRadius: tokens.radius.pill, maxWidth: 220 }}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: '#FFFFFF', fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold }}>{title}</Text>
            </Animated.View>
        ),
        headerTransparent: true, 
        headerStyle: {
            backgroundColor: 'transparent',
            elevation: 0, 
            shadowOpacity: 0, 
            borderBottomWidth: 0,
        },
        headerTitleAlign: 'center',
    };

    if (headerLeft !== undefined) {
        options.headerLeft = headerLeft ? () => (
            <Animated.View style={{ transform: [{ scale: safeScrollY._buttonScale }] }}>{headerLeft()}</Animated.View>
        ) : undefined;
    }
    if (headerRight !== undefined) {
        options.headerRight = headerRight ? () => (
            <Animated.View style={{ transform: [{ scale: safeScrollY._buttonScale }] }}>{headerRight()}</Animated.View>
        ) : undefined;
    }

    return options;
};

// ── BOUTON SAUVEGARDER GROUPE ───────────────────────────────────────────
export class SaveGroupButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            displayedGroup: this.props.groupName,
            savedGroup: SettingsManager.getGroup(),
        };
    }
    saveGroup() {
        if (this.isSaved()) {
            this.setState({ savedGroup: null }, () => SettingsManager.setGroup(null));
        } else {
            this.setState({ savedGroup: this.state.displayedGroup }, () => SettingsManager.setGroup(this.state.displayedGroup));
        }
    }
    isSaved() {
        return !(this.state.savedGroup === null || this.state.savedGroup !== this.state.displayedGroup);
    }
    render() {
        // On récupère le thème passé en props depuis le StackNavigator
        const theme = style.Theme[this.props.themeName] || style.Theme.light;
        return (
            <TouchableOpacity onPress={() => this.saveGroup()} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginRight: tokens.space.md }}>
                <View style={{ backgroundColor: theme.primary, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.pill, flexShrink: 0 }}>
                    <MaterialIcons name={this.isSaved() ? 'star' : 'star-border'} size={22} color="#FFFFFF" />
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
        const theme = style.Theme[this.props.themeName].settings;
        return (
            <View>
                <TouchableOpacity onPress={this.openPopup} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="filter-variant-remove" size={30} style={{ color: theme.icon, height: 32, width: 32 }} />
                </TouchableOpacity>
                <Modal animationType="fade" transparent={true} visible={this.state.popupVisible} onRequestClose={this.popupClose}>
                    <View style={theme.popup.background}>
                        <View style={theme.popup.container}>
                            <View style={theme.popup.header}>
                                <Text style={theme.popup.textHeader}>{Translator.get('FILTERS_UE').toUpperCase()}</Text>
                                <TouchableOpacity onPress={this.popupClose}>
                                    <MaterialIcons name="close" size={32} style={theme.popup.closeIcon} />
                                </TouchableOpacity>
                            </View>
                            <Text style={theme.popup.textDescription}>{Translator.get('FILTERS_CONFIRMATION')}</Text>
                            <View style={theme.popup.buttonContainer}>
                                <TouchableOpacity style={theme.popup.buttonSecondary} onPress={this.popupClose}>
                                    <Text style={theme.popup.buttonTextSecondary}>{Translator.get('CANCEL')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={theme.popup.buttonMain} onPress={this.filterOutUE}>
                                    <Text style={theme.popup.buttonTextMain}>{Translator.get('CONFIRM')}</Text>
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
        if (this.props.groupName !== null && SettingsManager.getOpenAppOnFavoriteGroup()) {
            this.props.navigate('Stack', { screen: 'Group', params: { name: this.props.groupName } });
        }
    }
    _onPress = () => this.props.navigate('Stack', { screen: 'Group', params: { name: this.props.groupName } });
    render() {
        const theme = style.Theme[this.props.themeName];
        return (
            <Button
                title={this.props.groupName.replace('_', ' ')}
                size={28}
                textSize={14}
                icon="star"
                color={theme.icon}
                fontColor={theme.font}
                onPress={this._onPress}
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

        const headerPadding = { paddingTop: 110, paddingBottom: tokens.space.xxl };

        return <WrappedComponent {...props} onAnimatedScroll={onAnimatedScroll} headerPadding={headerPadding} />;
    };
};
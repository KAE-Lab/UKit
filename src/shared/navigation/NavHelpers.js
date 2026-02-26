import React from 'react';
import { TouchableOpacity, View, Modal, Text } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { SettingsManager } from '../services/AppCore';
import Translator from '../i18n/Translator';
import style, { tokens } from '../theme/Theme';
import Button from '../ui/Button';

// ── GESTIONNAIRE DE HEADER ──────────────────────────────────────────────
export const NavBarHelper = ({ title, headerLeft, headerRight, themeName }) => ({
    title,
    headerLeft,
    headerRight,
    headerStyle: {
        backgroundColor: style.Theme[themeName].primary,
        borderBottomColor: 'transparent',
    },
    headerTintColor: style.Theme[themeName].lightFont,
});

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
        return (
            <TouchableOpacity onPress={() => this.saveGroup()} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                <MaterialIcons name={this.isSaved() ? 'star' : 'star-border'} size={30} style={{ color: '#FFFFFF', height: 32, width: 32 }} />
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
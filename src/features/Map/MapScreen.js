import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import WebView from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppContext } from '../../shared/services/AppCore';
import style, { tokens } from '../../shared/theme/Theme';
import { URL } from '../../shared/services/DataService';
import Translator from '../../shared/i18n/Translator';

const locations = require('../../../assets/locations.json');

export default class MapScreen extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            location: this.props.location,
            lat: null,
            lng: null,
        };
    }

    componentDidMount() {
        this.getLatLng();
    }

    getLatLng() {
        let data = this.state.location.split('/');
        let house = data[0];
        if (locations.hasOwnProperty(house)) {
            this.setState({
                lat: locations[house].lat,
                lng: locations[house].lng,
            });
        }
    }

    render() {
        const theme = style.Theme[this.context.themeName];

        if (this.state.lat === null || this.state.lng === null) {
            return (
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: theme.background,
                    padding: tokens.space.xl,
                }}>
                    <MaterialCommunityIcons
                        name="map-marker-off-outline"
                        size={48}
                        color={theme.fontSecondary}
                        style={{ opacity: 0.4, marginBottom: tokens.space.md }}
                    />
                    <Text style={{
                        fontSize: tokens.fontSize.md,
                        fontWeight: tokens.fontWeight.medium,
                        color: theme.fontSecondary,
                        textAlign: 'center',
                    }}>
                        {Translator.get('LOCATION_NOT_FOUND')}
                    </Text>
                </View>
            );
        }

        return (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center', alignItems: 'center',
                    backgroundColor: theme.background, zIndex: 0,
                }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
                <WebView
                    style={{ flex: 1, zIndex: 1 }}
                    source={{ uri: `${URL.MAP}?q=${this.state.lat},${this.state.lng}` }}
                    startInLoadingState={true}
                    renderLoading={() => <View />}
                />
            </View>
        );
    }
}
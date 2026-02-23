import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import WebView from 'react-native-webview'; // ← import correct
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppContext } from '../utils/DeviceUtils';
import style, { tokens } from '../Style';
import URL from '../utils/URL';
import Translator from '../utils/translator';

const locations = require('../assets/locations.json');

export default class Geolocation extends React.Component {
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
                lat: locations[house].lat, // ← était location[house] (bug)
                lng: locations[house].lng, // ← était location[house] (bug)
            });
        }
    }

    render() {
        const theme = style.Theme[this.context.themeName];

        // ── Localisation introuvable ───────────────────────────────────
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
                {/* ── Indicateur de chargement ────────────────────────── */}
                <View style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: theme.background,
                    zIndex: 0,
                }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>

                {/* ── WebView carte ────────────────────────────────────── */}
                <WebView
                    style={{ flex: 1, zIndex: 1 }}
                    source={{
                        uri: `${URL.MAP}?q=${this.state.lat},${this.state.lng}`,
                    }}
                    startInLoadingState={true}
                    renderLoading={() => <View />}
                />
            </View>
        );
    }
}

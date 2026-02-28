import React from 'react';
import { View, Text, TouchableOpacity, Linking, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Polygon, Svg } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppContext } from '../../shared/services/AppCore';
import style, { tokens } from '../../shared/theme/Theme';
import { URL } from '../../shared/services/DataService';
import Translator from '../../shared/i18n/Translator';

const locations = require('../../../assets/locations.json');

const mapStyle = [
	{ featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#ff0000' }] },
	{ featureType: 'landscape.man_made', elementType: 'labels', stylers: [{ color: '#ff0000' }] },
	{ featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#000000' }] },
	{ featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
];

export default class MapScreen extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        const { location, title } = this.props.route.params;
        
        this.state = {
            location: location,
            title: title || 'Destination',
            lat: null,
            lng: null,
        };
    }

    componentDidMount() {
        this.getLatLng();
    }

    getLatLng() {
        const loc = this.state.location;
        if (!loc) return;

        // Restaurant CROUS 
        if (typeof loc === 'object' && loc.lat) {
            this.setState({ lat: loc.lat, lng: loc.lon || loc.lng });
        } 
        // Bâtiment de cours
        else if (typeof loc === 'string') {
            let house = loc.split('/')[0];
            if (locations.hasOwnProperty(house)) {
                this.setState({
                    lat: locations[house].lat,
                    lng: locations[house].lng,
                });
            }
        }
    }

    onPressGoogleMaps = () => {
        const { lat, lng } = this.state;
        const link = URL.MAP + `search/?api=1&query=${lat},${lng}`;

        Linking.canOpenURL(link)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(link);
                }
            })
            .catch((err) => console.error('An error occurred', err));
    };

    render() {
        const themeName = this.context.themeName ?? 'light';
        const theme = style.Theme[themeName];
        const { lat, lng, title } = this.state;

        if (lat === null || lng === null) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            );
        }

        return (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                <MapView
                    style={{ flex: 1 }}
                    provider={Platform.OS === 'android' ? MapView.PROVIDER_GOOGLE : undefined}
                    initialRegion={{
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }}
                    customMapStyle={mapStyle}
                    showsMyLocationButton={true}
                    loadingEnabled={true}
                    showsCompass={true}>
                    
                    {/* Marqueur */}
                    <Marker coordinate={{ latitude: lat, longitude: lng }}>
                        <View style={{ flexDirection: 'column', alignItems: 'center', paddingBottom: tokens.space.sm }}>
                            <View style={{
                                backgroundColor: theme.primary,
                                paddingHorizontal: tokens.space.sm,
                                paddingVertical: tokens.space.xs,
                                borderRadius: tokens.radius.sm,
                                ...tokens.shadow.md,
                            }}>
                                <Text style={{ color: '#FFFFFF', fontWeight: tokens.fontWeight.bold, fontSize: tokens.fontSize.sm }}>
                                    {title}
                                </Text>
                            </View>
                            <Svg height={10} width={12}>
                                <Polygon points="0,0 6,10 12,0" fill={theme.primary} />
                            </Svg>
                        </View>
                    </Marker>
                </MapView>

                {/* Bouton Google Maps */}
                <View style={{ position: 'absolute', top: tokens.space.sm, right: tokens.space.sm }}>
                    <TouchableOpacity
                        onPress={this.onPressGoogleMaps}
                        style={{
                            backgroundColor: theme.cardBackground,
                            borderRadius: tokens.radius.md,
                            padding: tokens.space.sm,
                            ...tokens.shadow.md,
                        }}>
                        <MaterialCommunityIcons name="google-maps" size={32} color="#4285F4" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
}
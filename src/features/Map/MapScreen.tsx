import React, { useEffect, useState, useContext } from 'react';
import { View, TouchableOpacity, Linking, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Translator from '../../shared/i18n/Translator';

import { AppContext } from '../../shared/services/AppCore';
import style, { tokens } from '../../shared/theme/Theme';
import { URL } from '../../shared/services/DataService';

// Import du JSON 
const locations: Record<string, { lat: number; lng: number }> = require('../../../assets/locations.json');

interface MapScreenRouteParams {
    location: string | { lat: number; lon?: number; lng?: number };
    title?: string;
}

interface MapScreenProps {
    route: {
        params: MapScreenRouteParams;
    };
    navigation: any;
}

export default function MapScreen({ route, navigation }: MapScreenProps) {
    const AppContextValues = useContext(AppContext) as any;
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    const [title, setTitle] = useState<string>(route.params.title || Translator.get('DESTINATION'));
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);

    useEffect(() => {
        const loc = route.params.location;
        if (!loc) return;

        if (typeof loc === 'object' && loc.lat) {
            setLat(loc.lat);
            setLng(loc.lon || loc.lng || null);
        } 
        else if (typeof loc === 'string') {
            let house = loc.split('/')[0];
            if (locations.hasOwnProperty(house)) {
                setLat(locations[house].lat);
                setLng(locations[house].lng);
            }
        }
    }, [route.params.location]);

    const onPressExternalMap = () => {
        if (lat === null || lng === null) return;
        const link = URL.MAP + `search/?api=1&query=${lat},${lng}`;

        Linking.canOpenURL(link)
            .then((supported) => {
                if (supported) Linking.openURL(link);
            })
            .catch((err) => console.error('An error occurred', err));
    };

    useEffect(() => {
        if (lat !== null && lng !== null) {
            navigation.setOptions({
                headerTransparent: true, 
                title: title || Translator.get('MAP'), 
                headerRight: () => (
                    <TouchableOpacity
                        onPress={onPressExternalMap}
                        style={{
                            backgroundColor: theme.greyBackground,
                            width: 51,
                            height: 51,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: tokens.radius.md,
                            marginRight: 13
                        }}>
                        <MaterialCommunityIcons name="map-search-outline" size={28} color={theme.accent ?? theme.primary} />
                    </TouchableOpacity>
                ),
            });
        }
    }, [navigation, lat, lng, theme, title]);

    if (lat === null || lng === null) {
        return (
            <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    const mapHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body { padding: 0; margin: 0; background-color: ${theme.background}; }
                html, body, #map { height: 100%; width: 100%; }
                .leaflet-control-attribution { display: none; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                var map = L.map('map', {zoomControl: false}).setView([${lat}, ${lng}], 16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(map);

                // Code HTML reproduisant le design du composant SVG
                var iconHTML = \`
                    <div style="display: flex; flex-direction: column; align-items: center; padding-bottom: 8px;">
                        <div style="background-color: ${theme.primary}; padding: 4px 8px; border-radius: 4px; box-shadow: 0px 4px 6px rgba(0,0,0,0.3);">
                            <span style="color: #FFFFFF; font-weight: bold; font-size: 12px; font-family: sans-serif;">
                                ${title}
                            </span>
                        </div>
                        <svg height="10" width="12" style="margin-top: -1px;">
                            <polygon points="0,0 6,10 12,0" fill="${theme.primary}" />
                        </svg>
                    </div>
                \`;

                var customIcon = L.divIcon({
                    className: 'custom-marker',
                    html: iconHTML,
                    iconSize: [100, 50],
                    iconAnchor: [50, 45] // Centre parfaitement la pointe de la flèche
                });
                
                L.marker([${lat}, ${lng}], {icon: customIcon}).addTo(map);
            </script>
        </body>
        </html>
    `;

    return (
        <View style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            
            <View style={{ 
                height: 110, 
                backgroundColor: theme.cardBackground, 
                borderBottomWidth: 1, 
                borderBottomColor: theme.border,
                zIndex: 10 
            }} />

            <WebView
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={{ flex: 1, backgroundColor: theme.courseBackground }}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingButtonContainer: {
        position: 'absolute',
        top: tokens.space.sm,
        right: tokens.space.sm,
    },
    floatingButton: {
        borderRadius: tokens.radius.md,
        padding: tokens.space.sm,
    },
});
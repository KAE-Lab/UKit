/**
 * La carte embarquee dans une fiche : MapLibre GL et OpenFreeMap dans une WebView, sans navigation.
 *
 * Le HTML de carte etait ecrit deux fois — la fiche de cours et l'ecran plein-page — et les fiches
 * de restaurant et de bibliotheque en demandaient une troisieme copie. C'est desormais l'unique
 * generateur ; l'ecran plein-page, qui n'avait plus que ces deux fiches pour l'ouvrir, disparait
 * avec la mutualisation : une carte se lit dans la fiche, elle ne se visite pas.
 *
 * **Le fond est le style Positron servi par OpenFreeMap** — sans cle, sans inscription, autorise en
 * production, sur donnees OpenStreetMap. L'historique compte : les tuiles CartoDB Voyager sans cle
 * sont passees sous un filigrane « API key required » le 2026-08-30 (elles n'etaient gratuites que
 * par tolerance), et les tuiles standard d'OSM, reellement publiques, ont un style trop charge pour
 * une banniere de fiche. Positron est le style epure dessine par CARTO, passe en open source — le
 * rendu qu'on voulait, sur un service qui promet de rester libre. C'est du vectoriel, d'ou MapLibre
 * GL a la place de Leaflet ; l'attribution reste visible, la politique d'OSM l'exige.
 *
 * Le composant remplit son parent : c'est l'appelant qui decide la hauteur — pleine page sous la
 * fiche de cours, banniere dans une fiche de campus — et qui porte la surface (rayon, filet, ombre).
 */

import React from 'react';
import { Linking, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../theme/Theme';
import { URL } from '../constants/urls';

export interface MapMarker {
    lat: number;
    lng: number;
    title: string;
}

export interface EmbeddedMapProps {
    /** Le premier marqueur centre la carte et sert de destination au plan externe. */
    markers: MapMarker[];
    theme: AppThemeType;
    zoom?: number;
}

/** L'etiquette d'un marqueur : le design SVG d'origine, porte tel quel sur `maplibregl.Marker`. */
function markerJs(marker: MapMarker, theme: AppThemeType): string {
    return `
        var markerEl = document.createElement('div');
        markerEl.innerHTML = \`
            <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="background-color: ${theme.primary}; padding: 4px 8px; border-radius: 4px; box-shadow: 0px 4px 6px rgba(0,0,0,0.3);">
                    <span style="color: #FFFFFF; font-weight: bold; font-size: 12px; font-family: sans-serif; white-space: nowrap;">
                        ${marker.title}
                    </span>
                </div>
                <svg height="10" width="12" style="margin-top: -1px;">
                    <polygon points="0,0 6,10 12,0" fill="${theme.primary}" />
                </svg>
            </div>
        \`;
        new maplibregl.Marker({ element: markerEl, anchor: 'bottom' })
            .setLngLat([${marker.lng}, ${marker.lat}])
            .addTo(map);
    `;
}

export function generateMapHtml(markers: MapMarker[], theme: AppThemeType, zoom: number): string {
    const center = markers[0];

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
            <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
            <style>
                body { padding: 0; margin: 0; background-color: ${theme.greyBackground}; }
                html, body, #map { height: 100%; width: 100%; }
                /* L'attribution reste visible — la politique d'usage des donnees OSM l'exige — mais
                   discrete : c'est une mention, pas un element d'interface. */
                .maplibregl-ctrl-attrib { font-size: 9px; }
                .maplibregl-ctrl-attrib a { text-decoration: none; color: inherit; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                var map = new maplibregl.Map({
                    container: 'map',
                    style: 'https://tiles.openfreemap.org/styles/positron',
                    // MapLibre compte ses niveaux de zoom avec un cran d'ecart sur Leaflet : le -1
                    // conserve le cadrage que les fiches avaient — les appelants ne changent pas.
                    center: [${center.lng}, ${center.lat}],
                    zoom: ${zoom - 1},
                    attributionControl: { compact: true },
                    // Une banniere de fiche se deplace et se zoome ; elle ne se penche pas.
                    dragRotate: false,
                    pitchWithRotate: false
                });
                map.touchZoomRotate.disableRotation();
                // Les libelles du style, agrandis d'un cinquieme : Positron est calibre pour un
                // grand ecran, et ses noms de rues devenaient illisibles dans une banniere de fiche.
                // Couche par couche et sous garde : une taille en format historique ne se compose
                // pas, elle reste alors telle quelle.
                map.on('load', function () {
                    map.getStyle().layers.forEach(function (layer) {
                        if (layer.type !== 'symbol') return;
                        try {
                            var taille = map.getLayoutProperty(layer.id, 'text-size');
                            if (taille !== undefined && taille !== null) {
                                map.setLayoutProperty(layer.id, 'text-size', ['*', 1.2, taille]);
                            }
                        } catch (erreur) {}
                    });
                    // L'attribution demarre repliee derriere son bouton d'information : elle reste
                    // accessible — c'est ce que demande la politique OSM — sans occuper la banniere.
                    document.querySelectorAll('.maplibregl-ctrl-attrib').forEach(function (attribution) {
                        attribution.classList.remove('maplibregl-compact-show');
                        attribution.removeAttribute('open');
                    });
                });
                ${markers.map((marker) => markerJs(marker, theme)).join('\n')}
            </script>
        </body>
        </html>
    `;
}

export function EmbeddedMap({ markers, theme, zoom = 16 }: EmbeddedMapProps) {
    if (markers.length === 0) return null;

    const onPressExternalMap = () => {
        const link = URL.MAP + `search/?api=1&query=${markers[0].lat},${markers[0].lng}`;
        Linking.openURL(link).catch((err) => console.error('An error occurred', err));
    };

    return (
        <View style={{ flex: 1 }}>
            <WebView
                originWhitelist={['*']}
                source={{ html: generateMapHtml(markers, theme, zoom) }}
                style={{ flex: 1, backgroundColor: theme.greyBackground }}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
            />

            {/* Le plan externe reste un geste secondaire : un bouton pose sur la carte, pas un ecran. */}
            <View style={{ position: 'absolute', top: tokens.space.sm, right: tokens.space.sm }}>
                <TouchableOpacity
                    onPress={onPressExternalMap}
                    style={{
                        backgroundColor: theme.cardBackground,
                        borderRadius: tokens.radius.md,
                        padding: tokens.space.sm,
                        ...tokens.shadow.md,
                    }}>
                    <MaterialCommunityIcons name="map-search-outline" size={28} color={theme.accent ?? theme.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

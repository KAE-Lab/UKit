/**
 * Le bloc Images de l'onglet Temps du menu de developpement : vider le cache d'`expo-image`.
 *
 * Il existe pour le protocole du jalon 7-C. Le cache disque des images ne se vide ni par la
 * reinitialisation complete — il n'est pas dans AsyncStorage — ni par l'interrupteur HORS LIGNE, qui
 * ne coupe que le `fetch` de l'application : les images passent par les chargeurs natifs. Pour voir
 * le repli d'une carte, il faut donc vider ce cache puis couper le reseau de l'appareil ; pour voir le
 * cache, relancer et lire `[visuels] disk` dans Metro (useSourceRendue.ts).
 *
 * Un bloc et non un onglet : la barre du menu n'a pas la place (MENU_WIDTH). Libelles en dur, comme
 * le reste du menu (docs/qualite.md).
 */

import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import moment from 'moment';

import { tokens, type AppThemeType } from '../theme/Theme';

export interface ModMenuImagesProps {
    readonly theme: AppThemeType;
}

export default function ModMenuImages({ theme }: ModMenuImagesProps) {
    const [etat, setEtat] = useState<string | null>(null);
    const [occupe, setOccupe] = useState(false);

    const vider = useCallback(async () => {
        setOccupe(true);
        try {
            await Image.clearMemoryCache();
            const vide = await Image.clearDiskCache();
            setEtat(vide ? `vidé à ${moment().format('HH:mm:ss')}` : 'le cache disque n’a pas pu être vidé');
        } finally {
            setOccupe(false);
        }
    }, []);

    return (
        <View style={{ marginTop: tokens.space.md, paddingTop: tokens.space.sm, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xxs }}>Images (expo-image)</Text>
            <TouchableOpacity
                onPress={() => { void vider(); }}
                disabled={occupe}
                style={{ backgroundColor: theme.greyBackground, borderRadius: tokens.radius.md, paddingVertical: tokens.space.sm, alignItems: 'center', marginTop: tokens.space.xs, opacity: occupe ? 0.5 : 1 }}
            >
                <Text style={{ color: theme.accent ?? theme.primary, fontSize: tokens.fontSize.xs, fontWeight: 'bold' }}>Vider le cache des images</Text>
            </TouchableOpacity>
            {etat !== null && (
                <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: tokens.space.xxs }}>{etat}</Text>
            )}
        </View>
    );
}

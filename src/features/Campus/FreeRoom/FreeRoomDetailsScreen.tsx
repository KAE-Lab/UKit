import React, { useEffect, useContext, useRef } from 'react';
import { View, Text, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { BuildingInfo } from '../services/FreeRoomService';
import { useFreeRoomsData } from './hooks/useFreeRoomsData';
import { FreeRoomHoursHeader, FreeRoomsList } from './components/FreeRoomDetailsComponents';

export default function FreeRoomDetailsScreen({ route, navigation }: { route: { params: { building: BuildingInfo } }; navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> }) {
    const { building } = route.params;
    const AppContextValues = useContext(AppContext);
    const theme = style.Theme[AppContextValues.themeName];
    const insets = useSafeAreaInsets();

    const { loading, isClosed, hoursList, selectedIndex, setSelectedIndex, freeRooms } = useFreeRoomsData(building);

    const flatListRef = useRef<FlatList>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: () => (
                <Text style={{ color: theme.primary, fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold }}>
                    {Translator.get('DETAILS') || 'Détails'}
                </Text>
            ),
            headerTitleAlign: 'center'
        });
    }, [navigation, theme]);

    useEffect(() => {
        if (hoursList.length > 0 && flatListRef.current && !loading) {
            const timerId = setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: selectedIndex,
                    animated: true,
                    viewPosition: 0.5
                });
            }, 100);
            return () => clearTimeout(timerId);
        }
    }, [selectedIndex, loading, hoursList.length]);

    if (loading) {
        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            {isClosed ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: tokens.space.xl }}>
                    <MaterialCommunityIcons name="door-closed-lock" size={64} color={theme.fontSecondary} />
                    <Text style={{ marginTop: tokens.space.md, fontSize: tokens.fontSize.lg, color: theme.fontSecondary, textAlign: 'center' }}>
                        {Translator.get('BU_CLOSED') || 'Bâtiment fermé aujourd\'hui'}
                    </Text>
                </View>
            ) : (
                <>
                    <FreeRoomHoursHeader 
                        building={building} 
                        hoursList={hoursList} 
                        selectedIndex={selectedIndex} 
                        setSelectedIndex={setSelectedIndex} 
                        flatListRef={flatListRef} 
                        scrollTimeoutRef={scrollTimeoutRef} 
                        theme={theme} 
                        insets={insets} 
                    />
                    <FreeRoomsList freeRooms={freeRooms} theme={theme} />
                </>
            )}
        </SafeAreaView>
    );
}

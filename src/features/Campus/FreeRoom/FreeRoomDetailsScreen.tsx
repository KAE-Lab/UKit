import React, { useEffect, useContext, useRef } from 'react';
import { View, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ScreenState } from '../../../shared/ui/ScreenState';
import { BuildingInfo } from '../services/FreeRoomService';
import { useFreeRoomsData } from './hooks/useFreeRoomsData';
import { CampusMapSection } from '../components/CampusMapSection';
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

    // Le titre vient du navigateur (« Details », neutre) : l'ecran surchargeait le sien en violet,
    // comme les fiches de restaurant et de BU avant lui.
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
                /* Le meme vocabulaire d'etat que la journee sans cours du Planning : un batiment
                   ferme et un jour libre sont la meme nature d'information, ils portaient deux
                   rendus. L'hote et le bloc viennent du socle, plus d'un centrage local. */
                <ScreenState theme={theme} background={theme.courseBackground}>
                    <EmptyState
                        variant="plain"
                        icon="door-closed-lock"
                        title={Translator.get('BUILDING_CLOSED_TITLE')}
                        message={Translator.get('BUILDING_CLOSED')}
                        theme={theme}
                    />
                </ScreenState>
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
                    <FreeRoomsList
                        freeRooms={freeRooms}
                        theme={theme}
                        // En pied, comme les fiches de restaurant et de BU : le lieu ne depend pas
                        // du creneau selectionne.
                        pied={(
                            <CampusMapSection
                                location={{ lat: building.lat, lng: building.lng }}
                                markerTitle={building.name}
                                theme={theme}
                                style={{ marginTop: tokens.space.lg, marginBottom: tokens.space.sm }}
                            />
                        )}
                    />
                </>
            )}
        </SafeAreaView>
    );
}

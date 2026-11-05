import React, { useEffect, useContext } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ScreenState } from '../../../shared/ui/ScreenState';
import { ChargementPleinePage } from '../../../shared/ui/ChargementPleinePage';
import { BuildingInfo } from '../services/FreeRoomService';
import { compter } from '../../../shared/mesure';
import { useFreeRoomsData } from './hooks/useFreeRoomsData';
import { CampusMapSection } from '../components/CampusMapSection';
import { FreeRoomsList } from './components/FreeRoomDetailsComponents';
import { BandeauDeCases, caseDHeure } from '../../../shared/ui/BandeauDeCases';
import { maintenant } from '../../../shared/services/Temps';
import { FonduDeBord } from '../../../shared/ui/FonduDeBord';

export default function FreeRoomDetailsScreen({ route, navigation }: { route: { params: { building: BuildingInfo } }; navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> }) {
    const { building } = route.params;
    const AppContextValues = useContext(AppContext);
    const theme = style.Theme[AppContextValues.themeName];

    const { loading, isClosed, hoursList, selectedIndex, setSelectedIndex, freeRooms } = useFreeRoomsData(building);

    // La fiche ouverte compte (7-D), par le code du batiment.
    useEffect(() => {
        compter('salles.ouverture', building.id);
    }, []);

    // Le titre de la barre est le nom du batiment (StackNavigator) ; le bandeau ne porte que les
    // heures, et recentre lui-meme la case choisie (`BandeauDeCases`).

    if (loading) {
        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                {/* Par l'hote commun, et non plus centre a la main : l'etat « batiment ferme » juste
                    en dessous passe par `ScreenState`, et le contenu sautait entre les deux. */}
                <ChargementPleinePage
                    theme={theme}
                    message={Translator.get('LOADING_FREE_ROOMS')}
                    background={theme.courseBackground}
                />
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
                    <BandeauDeCases
                        theme={theme}
                        fond={theme.courseBackground}
                        cases={hoursList.map((creneau) => caseDHeure(creneau, maintenant()))}
                        choisie={selectedIndex}
                        onChoisir={setSelectedIndex}
                    />
                    <View style={{ flex: 1 }}>
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
                        <FonduDeBord fond={theme.courseBackground} />
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

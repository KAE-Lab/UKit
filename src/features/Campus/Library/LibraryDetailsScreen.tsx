import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import style, { tokens } from '../../../shared/theme/Theme';
import type { RootStackParamList } from '../../../shared/navigation/StackNavigator';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { useLibraryTimetableData } from './hooks/useLibraryTimetableData';
import { PIED_FLOTTANT_DEGAGEMENT } from '../../../shared/ui/PiedFlottant';
import { PiedDAction } from '../../../shared/ui/PiedDAction';
import { CampusFailureNotice } from '../components/CampusLayoutComponents';
import { CampusMapSection } from '../components/CampusMapSection';
import { LibraryLiveAttendance, LibraryDatesHeader, LibraryOpeningHoursList } from './components/LibraryDetailsComponents';

export default function LibraryDetailsScreen({ route }: { route: { params: { library: import('../services/LibraryService').LibraryInfo; affluence: import('../services/LibraryService').AffluencesData | null } } }) {
    const { library, affluence } = route.params;
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const {
        timetable,
        failure,
        loading,
        selectedIndex,
        setSelectedIndex,
        flatListRef,
        scrollTimeoutRef,
        retry
    } = useLibraryTimetableData(library);

    // Le titre vient du navigateur (« Details », neutre) : l'ecran surchargeait le sien en violet,
    // et le nom de la bibliotheque vit deja dans le bandeau.
    const currentDay = timetable[selectedIndex];

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            
            <LibraryDatesHeader 
                library={library} 
                timetable={timetable} 
                selectedIndex={selectedIndex} 
                setSelectedIndex={setSelectedIndex} 
                flatListRef={flatListRef} 
                scrollTimeoutRef={scrollTimeoutRef} 
                theme={theme} 
                insets={insets} 
            />

            <ScrollView style={{ flex: 1, padding: tokens.space.md }}>
                
                <LibraryLiveAttendance affluence={affluence} theme={theme} />

                {/* L'affluence vient de la liste et reste affichee : seuls les horaires ont echoue.
                    Remplacer toute la fiche par un message effacerait une donnee qu'on a. */}
                {failure !== undefined && failure.silent !== true ? (
                    <CampusFailureNotice failure={failure} theme={theme} onRetry={retry} />
                ) : (
                    <LibraryOpeningHoursList loading={loading} currentDay={currentDay} theme={theme} />
                )}

                {/* En pied : le lieu ne depend pas du jour selectionne dans le bandeau. */}
                <CampusMapSection
                    location={{ lat: library.lat, lng: library.lng }}
                    markerTitle={library.name}
                    theme={theme}
                    style={{ marginTop: tokens.space.lg }}
                />

                {/* La barre de reservation est flottante : le defilement degage sa hauteur. */}
                <View style={{ height: PIED_FLOTTANT_DEGAGEMENT }} />
            </ScrollView>

            {/* L'action principale de la fiche, remplie : un retour du formulaire demandait une reservation
                qui existait — discrete, elle ne se voyait pas (6.2.x). Et dans la vue integree : c'etait
                le dernier lien de l'application a partir dans le navigateur du systeme. */}
            <PiedDAction
                theme={theme}
                label={Translator.get('BOOK_SEAT')}
                icon={{ name: 'calendar-check' }}
                fond={theme.courseBackground}
                onPress={() => navigation.navigate('WebBrowser', { href: `https://affluences.com/sites/${library.slug}/reservation` })}
            />

        </SafeAreaView>
    );
}
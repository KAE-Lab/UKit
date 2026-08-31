import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { useLibraryTimetableData } from './hooks/useLibraryTimetableData';
import { PiedFlottant, PIED_FLOTTANT_DEGAGEMENT } from '../../../shared/ui/PiedFlottant';
import { CampusFailureNotice } from '../components/CampusLayoutComponents';
import { CampusMapSection } from '../components/CampusMapSection';
import { LibraryLiveAttendance, LibraryDatesHeader, LibraryOpeningHoursList } from './components/LibraryDetailsComponents';

export default function LibraryDetailsScreen({ route }: { route: { params: { library: import('../services/LibraryService').LibraryInfo; affluence: import('../services/LibraryService').AffluencesData | null } } }) {
    const { library, affluence } = route.params;
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();

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

            <PiedFlottant fond={theme.courseBackground}>
                <TouchableOpacity
                    onPress={async () => {
                        try {
                            await WebBrowser.openBrowserAsync(`https://affluences.com/sites/${library.slug}/reservation`);
                        } catch (error) {
                            console.error("Erreur d'ouverture du navigateur:", error);
                        }
                    }}
                    style={{
                        // La surface de la barre de recherche, a l'identique : un objet pose sur la
                        // page — `greyBackground` etait un fond, et un bouton de la couleur d'un
                        // fond ne flotte pas. Hauteur 50 : le gabarit commun des flottants — un
                        // rembourrage vertical le laissait deux points sous les autres.
                        backgroundColor: theme.cardBackground,
                        borderWidth: 1,
                        borderColor: theme.border,
                        ...tokens.shadow.md,
                        height: 50,
                        borderRadius: tokens.radius.md,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <MaterialCommunityIcons name="calendar-check" size={22} color={theme.accent ?? theme.primary} />
                    <Text style={{
                        color: theme.accent ?? theme.primary,
                        fontSize: tokens.fontSize.md,
                        fontWeight: tokens.fontWeight.bold as never,
                        marginLeft: tokens.space.sm
                    }}>
                        {Translator.get('BOOK_SEAT')}
                    </Text>
                </TouchableOpacity>
            </PiedFlottant>

        </SafeAreaView>
    );
}
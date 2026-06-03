import React, { useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { useLibraryTimetableData } from './hooks/useLibraryTimetableData';
import { LibraryLiveAttendance, LibraryDatesHeader, LibraryOpeningHoursList } from './components/LibraryDetailsComponents';

export default function LibraryDetailsScreen({ route, navigation }: { route: { params: { library: import('../services/LibraryService').LibraryInfo; affluence: number | null } }; navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setOptions: (options: unknown) => void } }) {
    const { library, affluence } = route.params;
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();

    const {
        timetable,
        loading,
        selectedIndex,
        setSelectedIndex,
        flatListRef,
        scrollTimeoutRef
    } = useLibraryTimetableData(library);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: () => (
                <Text style={{ color: theme.primary, fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold as never }}>
                    {Translator.get('DETAILS')}
                </Text>
            ),
            headerTitleAlign: 'center'
        });
    }, [navigation, theme]);

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

                <LibraryOpeningHoursList loading={loading} currentDay={currentDay} theme={theme} />
                
                <View style={{ height: tokens.space.xxl }} />
            </ScrollView>

            <SafeAreaView 
                edges={['bottom']}
                style={{ 
                    paddingTop: tokens.space.md,
                    paddingHorizontal: tokens.space.md,
                    backgroundColor: theme.cardBackground,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                }}
            >
                <TouchableOpacity 
                    onPress={async () => {
                        try {
                            await WebBrowser.openBrowserAsync(`https://affluences.com/sites/${library.slug}/reservation`);
                        } catch (error) {
                            console.error("Erreur d'ouverture du navigateur:", error);
                        }
                    }}
                    style={{
                        backgroundColor: theme.greyBackground,
                        paddingVertical: 14,
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
            </SafeAreaView>

        </SafeAreaView>
    );
}
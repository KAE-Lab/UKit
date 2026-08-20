import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CrousService, CrousDayMenu } from '../services/CrousService';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import type { UkitFailure } from '../../../shared/aetherius';
import { CampusFailureNotice } from '../components/CampusLayoutComponents';
import { CrousMealCard } from './components/CrousMealCard';
import { CrousDateHeader } from './components/CrousDateHeader';

/** Un ecran de menu qui n'a rien a lister : un etat, centre, sur le fond de l'ecran. */
function MenuPleinePage({ theme, children }: { theme: import('../../../shared/theme/Theme').AppThemeType; children: React.ReactNode }) {
    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: tokens.space.md }}>
                {children}
            </View>
        </SafeAreaView>
    );
}

// "2024-03-25" -> "Lun 25"
const formatDate = (dateString: string | null) => {
    if (!dateString) return Translator.get('UNKNOWN');

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const dayKeys = ['DAY_SUN', 'DAY_MON', 'DAY_TUE', 'DAY_WED', 'DAY_THU', 'DAY_FRI', 'DAY_SAT'];
    const translatedDay = Translator.get(dayKeys[d.getDay()] as Parameters<typeof Translator.get>[0]);
    return `${translatedDay} ${d.getDate()}`;
};

export default function CrousMenuScreen({ route, navigation }: { route: { params: { restaurantId: string; restaurantName: string } }; navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setOptions: (options: unknown) => void } }) {
    const { restaurantId, restaurantName } = route.params;
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const theme = style.Theme[AppContextValues.themeName];
    const insets = useSafeAreaInsets();

    const [menus, setMenus] = useState<CrousDayMenu[]>([]);
    const [failure, setFailure] = useState<UkitFailure | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: () => (
                <Text style={{ color: theme.primary, fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold }}>
                    {Translator.get('MENU')}
                </Text>
            ),
            headerTitleAlign: 'center'
        });
        loadMenu();
    }, [navigation, theme]);

    useEffect(() => {
        loadMenu();
    }, []);

    const loadMenu = async () => {
        setLoading(true);
        const resultat = await CrousService.fetchRestaurantMenu(restaurantId);
        if (!mountedRef.current) return;

        // `=== false` et non `!resultat.ok` : sans `strictNullChecks`, la seconde forme ne restreint
        // pas l'union. Voir shared/aetherius/runBlueprint.ts.
        if (resultat.ok === false) {
            setMenus([]);
            setFailure(resultat.failure);
        } else {
            setMenus(resultat.menus);
            setFailure(undefined);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <MenuPleinePage theme={theme}>
                <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
            </MenuPleinePage>
        );
    }

    // Une source en panne et un restaurant qui ne publie rien produisent deux ecrans differents. Le
    // second est frequent — plus de la moitie des restaurants de la region sont dans ce cas — et
    // n'est pas une erreur : le Blueprint accepte explicitement ce statut.
    if (failure !== undefined && failure.silent !== true) {
        return (
            <MenuPleinePage theme={theme}>
                <CampusFailureNotice failure={failure} theme={theme} onRetry={loadMenu} />
            </MenuPleinePage>
        );
    }

    if (menus.length === 0) {
        return (
            <MenuPleinePage theme={theme}>
                <MaterialCommunityIcons name="food-off" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.md }} />
                <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.md, textAlign: 'center' }}>
                    {Translator.get('NO_MENU_PUBLISHED')}
                </Text>
            </MenuPleinePage>
        );
    }

    const currentMenu = menus[selectedIndex];

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            
            {/* ── Bandeau des dates défilant horizontalement ── */}
            <CrousDateHeader
                menus={menus}
                selectedIndex={selectedIndex}
                setSelectedIndex={setSelectedIndex}
                theme={theme}
                restaurantName={restaurantName}
                insets={insets}
                formatDate={formatDate}
            />

            {/* ── Affichage des plats ── */}
            <ScrollView style={{ flex: 1, paddingTop: tokens.space.md }}>
                {currentMenu.midi?.length === 0 && currentMenu.soir?.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: theme.fontSecondary, marginTop: tokens.space.xl }}>
                        {Translator.get('NO_DISH_INFO')}
                    </Text>
                ) : (
                    <>
                        <CrousMealCard mealTitle={Translator.get('LUNCH')} categories={currentMenu.midi} mealType="midi" theme={theme} />
                        <CrousMealCard mealTitle={Translator.get('DINNER')} categories={currentMenu.soir} mealType="soir" theme={theme} />
                    </>
                )}
                <View style={{ height: tokens.space.xxl }} />
            </ScrollView>

        </SafeAreaView>
    );
}
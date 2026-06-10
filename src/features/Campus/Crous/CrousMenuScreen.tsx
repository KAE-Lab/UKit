import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CrousService, CrousDayMenu } from '../services/CrousService';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { CrousMealCard } from './components/CrousMealCard';
import { CrousDateHeader } from './components/CrousDateHeader';
import { UnifiedTouchable } from '../../../shared/ui/UnifiedTouchable';

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
        const data = await CrousService.fetchRestaurantMenu(restaurantId);
        if (!mountedRef.current) return;
        setMenus(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (menus.length === 0) {
        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: tokens.space.xl }}>
                    <MaterialCommunityIcons name="food-off" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.md }} />
                    <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.md, textAlign: 'center' }}>
                        {Translator.get('NO_MENU_PUBLISHED')}
                    </Text>
                </View>
            </SafeAreaView>
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
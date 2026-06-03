import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CrousService, CrousDayMenu } from '../services/CrousService';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';

export default function CrousMenuScreen({ route, navigation }: { route: { params: { restaurantId: string; restaurantName: string } }; navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setOptions: (options: unknown) => void } }) {
    const { restaurantId, restaurantName } = route.params;
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const theme = style.Theme[AppContextValues.themeName];
    const insets = useSafeAreaInsets();

    const [menus, setMenus] = useState<CrousDayMenu[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const mountedRef = useRef(true);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
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

    useEffect(() => {
        if (menus.length > 0 && flatListRef.current) {
            const timerId = setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: selectedIndex,
                    animated: true,
                    viewPosition: 0.5
                });
            }, 100);
            return () => clearTimeout(timerId);
        }
    }, [selectedIndex, menus])

    const loadMenu = async () => {
        setLoading(true);
        const data = await CrousService.fetchRestaurantMenu(restaurantId);
        if (!mountedRef.current) return;
        setMenus(data);
        setLoading(false);
    };

    // "2024-03-25" -> "Lun 25"
    const formatDate = (dateString: string | null) => {
        if (!dateString) return Translator.get('UNKNOWN');

        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;

        const dayKeys = ['DAY_SUN', 'DAY_MON', 'DAY_TUE', 'DAY_WED', 'DAY_THU', 'DAY_FRI', 'DAY_SAT'];
        const translatedDay = Translator.get(dayKeys[d.getDay()] as Parameters<typeof Translator.get>[0]);
        return `${translatedDay} ${d.getDate()}`;
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

    const getDishIcon = (dishName: string) => {
        const str = dishName.toLowerCase();

        const has = (words: string) => {
            return new RegExp(`(^|[\\s'’\\-])(${words})(s|x)?([\\s'’.,;!?:\\-]|$)`, 'i').test(str);
        };

        if (has('fermé|ferme|fermée|non communiqué|modification|ou|structure|réserve|exceptionnel|formule|le menu')) return 'information-outline';

        if (has('bretonne|sans viande|sans porc|végé|veggie|vegan|steak végétal|tofu|soja|falafel')) return 'leaf';

        if (has('boisson|soda|coca|fanta|sprite|eau|jus|thé|the|café|cafe')) return 'bottle-soda';

        if (has('pizza|pasta box')) return 'pizza';
        if (has('frite|chips|snack')) return 'french-fries';
        if (has('burger|hamburger')) return 'hamburger';
        if (has('tacos|fajita')) return 'taco';
        if (has('sandwich|baguette|panini|wrap|croque|hot-dog')) return 'baguette';

        if (has('poulet|boeuf|bœuf|porc|veau|agneau|saucisse|viande|steak|lardon|chorizo|dinde|canard|merguez|filet|rôti|haché|kebab|jambon|bacon|cordon bleu|boulette|escalope|pâté|charcuterie')) return 'food-drumstick';
        if (has('poisson|saumon|cabillaud|colin|merlu|crevette|calamar|thon|truite|lieu|moule|fruit de mer|hoki|encornet|surimi')) return 'fish';
        if (has('oeuf|œuf|omelette')) return 'egg';

        if (has('entrée|soupe|potage|velouté|bouillon|gaspacho|crudité|hors d')) return 'bowl-mix';

        if (has('fromage|brie|camembert|chèvre|chevre|mozza|emmental|cantal|gruyère|parmesan|kiri|roquefort')) return 'cheese';

        if (has('viennoiserie|croissant|chocolatine|brioche')) return 'food-croissant';
        if (has('fruit|pomme|banane|orange|kiwi|ananas|poire|fraise|framboise|pêche|abricot|raisin|mangue|melon|pastèque|citron|clémentine|compote') && !has('pomme de terre')) return 'food-apple';
        if (has('yaourt|lacté|petit suisse|fromage blanc|skyr|faisselle|glace|crème')) return 'silverware-spoon';
        if (has('dessert|tarte|pâtisserie|gâteau|cookie|muffin|brownie|entremet|flan|caramel|vanille|chocolat|bonbon|barre|confiserie|macaron|gaufre|crêpe')) return 'cupcake';

        if (has('salade|légume|haricot|lentille|pois|carotte|brocoli|chou|courgette|aubergine|épinard|poireau|champignon|céleri|ratatouille|tomate|concombre|maïs')) return 'leaf';

        if (has('coquillette|riz|pâte|spaghetti|macaroni|penne|ravioli|semoule|boulgour|blé|quinoa|pomme de terre|purée|gnocchi|nouille')) return 'pasta';

        return 'circle-medium';
    };

    const renderMeal = (mealTitle: string, categories: { name: string, dishes: string[] }[], mealType: 'midi' | 'soir') => {
        if (!categories || categories.length === 0) return null;

        // Le soleil pour le midi, la lune pour le soir
        const iconHeader = mealType === 'midi' ? 'white-balance-sunny' : 'moon-waning-crescent';

        return (
            <View style={{ marginBottom: tokens.space.xl }}>
                {/* Titre du repas */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: tokens.space.sm, marginBottom: tokens.space.md, paddingHorizontal: tokens.space.md }}>
                    <MaterialCommunityIcons 
                        name={iconHeader} 
                        size={20} 
                        color={theme.accent ?? theme.primary} 
                    />
                    <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: theme.font, marginLeft: tokens.space.sm }}>
                        {mealTitle}
                    </Text>
                </View>

                {/* Liste des catégories */}
                {categories.map((cat, index) => (
                    <View key={index} style={[style.course.card, { 
                        backgroundColor: theme.cardBackground, 
                        borderColor: theme.border, 
                        borderWidth: 1 
                    }]}>
                        <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: theme.accent ?? theme.primary, marginBottom: tokens.space.sm }}>
                            {cat.name}
                        </Text>
                        
                        {cat.dishes.length > 0 ? cat.dishes.map((dish: string, dIdx: number) => (
                            <View key={dIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                                {/* Utilisation de l'icône intelligente au lieu du point classique */}
                                <MaterialCommunityIcons 
                                    name={getDishIcon(dish)} 
                                    size={16} 
                                    color={getDishIcon(dish) === 'leaf' ? '#4caf50' : theme.fontSecondary} 
                                    style={{ marginRight: 6, marginTop: 2 }} 
                                />
                                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, flex: 1, lineHeight: 20 }}>{dish}</Text>
                            </View>
                        )) : (
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, fontStyle: 'italic' }}>{Translator.get('NOT_SPECIFIED')}</Text>
                        )}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            
            {/* ── Bandeau des dates défilant horizontalement ── */}
            <View style={{ backgroundColor: theme.cardBackground, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: tokens.space.sm, paddingTop: (insets.top || 0) + 65 }}>
                
                <Text 
                    style={{
                        fontSize: tokens.fontSize.xl,
                        fontWeight: tokens.fontWeight.bold,
                        color: theme.fontSecondary,
                        textAlign: 'left',
                        paddingHorizontal: tokens.space.md,
                        marginBottom: tokens.space.md,
                    }} 
                    numberOfLines={1}
                >
                    {restaurantName || Translator.get('RESTAURANT_U')}
                </Text>

                <FlatList
                    ref={flatListRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={menus}
                    keyExtractor={(item) => item.date}
                    contentContainerStyle={{ paddingHorizontal: tokens.space.sm }}
                    onScrollToIndexFailed={(info) => {
                        scrollTimeoutRef.current = setTimeout(() => {
                            flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                        }, 500);
                    }}
                    renderItem={({ item, index }) => {
                        const isSelected = index === selectedIndex;
                        const primaryColor = theme.accent ?? theme.primary;

                        return (
                            <TouchableOpacity 
                                onPress={() => setSelectedIndex(index)}
                                style={{
                                    paddingHorizontal: tokens.space.md,
                                    paddingVertical: tokens.space.sm,
                                    marginHorizontal: tokens.space.xs,
                                    borderRadius: tokens.radius.md,
                                    backgroundColor: theme.greyBackground,
                                    // On fixe la bordure à 2 de manière permanente pour éviter que le texte saute
                                    borderWidth: 2,
                                    borderColor: isSelected ? primaryColor : 'transparent',
                                }}
                            >
                                <Text style={{ 
                                    color: isSelected ? primaryColor : theme.fontSecondary,
                                    fontWeight: isSelected ? tokens.fontWeight.bold : tokens.fontWeight.medium,
                                    fontSize: tokens.fontSize.sm
                                }}>
                                    {formatDate(item.date)}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* ── Affichage des plats ── */}
            <ScrollView style={{ flex: 1, paddingTop: tokens.space.md }}>
                {currentMenu.midi?.length === 0 && currentMenu.soir?.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: theme.fontSecondary, marginTop: tokens.space.xl }}>
                        {Translator.get('NO_DISH_INFO')}
                    </Text>
                ) : (
                    <>
                        {renderMeal(Translator.get('LUNCH'), currentMenu.midi, 'midi')}
                        {renderMeal(Translator.get('DINNER'), currentMenu.soir, 'soir')}
                    </>
                )}
                <View style={{ height: tokens.space.xxl }} />
            </ScrollView>

        </SafeAreaView>
    );
}
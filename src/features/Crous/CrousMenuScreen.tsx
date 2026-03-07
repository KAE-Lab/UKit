import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CrousService, CrousDayMenu } from './CrousService';
import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';

export default function CrousMenuScreen({ route }: any) {
    const { restaurantId } = route.params;
    const AppContextValues = useContext(AppContext) as any;
    const theme = style.Theme[AppContextValues.themeName];

    const [menus, setMenus] = useState<CrousDayMenu[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        loadMenu();
    }, []);

    const loadMenu = async () => {
        setLoading(true);
        const data = await CrousService.fetchRestaurantMenu(restaurantId);
        setMenus(data);
        setLoading(false);
    };

    // "2024-03-25" -> "Lun 25"
    const formatDate = (dateString: string) => {
        if (!dateString || dateString === 'Inconnue') return '?';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const dayKeys = ['DAY_SUN', 'DAY_MON', 'DAY_TUE', 'DAY_WED', 'DAY_THU', 'DAY_FRI', 'DAY_SAT'];
        const translatedDay = Translator.get(dayKeys[d.getDay()]);
        return `${translatedDay} ${d.getDate()}`;
    };

    if (loading) {
        return (
            <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (menus.length === 0) {
        return (
            <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: tokens.space.xl }}>
                    <MaterialCommunityIcons name="food-off" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.md }} />
                    <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.md, textAlign: 'center' }}>
                        Aucun menu publié pour ce restaurant actuellement.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const currentMenu = menus[selectedIndex];

    const getDishIcon = (dishName: string) => {
        const str = dishName.toLowerCase();

        // 1. Infos, menus et signalétiques
        if (/(fermé|ferme\b|fermée|non communiqué|modification|^ou$|structure|réserve|exceptionnel|formule|le menu)/.test(str)) return 'information-outline';

        // 2. Végétarien strict (intercepte avant les viandes pour les "tartes veggie", "sans porc", etc.)
        if (/(bretonne|sans viande|sans porc|végé|veggie|vegan|steak végétal|tofu|soja|falafel)/.test(str)) return 'leaf';

        // 3. Boissons
        if (/(boisson|soda|coca|fanta|sprite)/.test(str) || /(^|\s|')(eau|jus|thé|the|café|cafe)(s)?(\s|$|[.,])/i.test(str)) return 'bottle-soda';

        // 4. Fast-Food, Sandwicherie & Snack
        if (/(pizza|pasta box)/.test(str)) return 'pizza';
        if (/(frite|chips|snack)/.test(str)) return 'french-fries';
        if (/(burger|hamburger)/.test(str)) return 'hamburger';
        if (/(tacos|fajita)/.test(str)) return 'taco';
        if (/(sandwich|baguette|panini|wrap|croque|hot-dog)/.test(str)) return 'baguette';

        // 5. Protéines (Viandes, Poissons, Oeufs)
        if (/(poulet|boeuf|bœuf|porc|veau|agneau|saucisse|viande|steak|lardon|chorizo|dinde|canard|merguez|filet|rôti|haché|kebab|jambon|bacon|cordon bleu|boulette|escalope|pâté|charcuterie)/.test(str)) return 'food-drumstick';
        if (/(poisson|saumon|cabillaud|colin|merlu|crevette|calamar|thon|truite|lieu|moule|fruit de mer|hoki|encornet|surimi)/.test(str)) return 'fish';
        if (/(oeuf|œuf|omelette)/.test(str)) return 'egg';

        // 6. Entrées & Soupes
        if (/(entrée|soupe|potage|velouté|bouillon|gaspacho|crudité|hors d)/.test(str)) return 'bowl-mix';

        // 7. Fromages
        if (/(fromage|brie|camembert|chèvre|chevre|mozza|emmental|cantal|gruyère|parmesan|kiri|roquefort)/.test(str)) return 'cheese';

        // 8. Desserts, Fruits, Yaourts et Viennoiseries
        if (/(viennoiserie|croissant|chocolatine|brioche)/.test(str)) return 'food-croissant';
        
        // Fruits (intercepte avant les desserts pour les "compotes de fruits", "tarte aux pommes", etc.)
        if (/(pomme(?!s?\s+de\s+terre)|banane|orange|kiwi|ananas|poire|fraise|framboise|pêche|abricot|raisin|mangue|melon|pastèque|citron|clémentine|compote)/.test(str)) return 'food-apple';
        
        // Yaourts et desserts lactés
        if (/(yaourt|lacté|petit suisse|fromage blanc|skyr|faisselle|glace|crème)/.test(str)) return 'silverware-spoon';
        
        // Vrais gâteaux et confiseries
        if (/(dessert|tarte|pâtisserie|gâteau|cookie|muffin|brownie|entremet|flan|caramel|vanille|chocolat|bonbon|barre|confiserie|macaron|gaufre|crêpe)/.test(str)) return 'cupcake';
        
        // 9. Accompagnements : Légumes & Salades
        if (/(salade|légume|haricot|lentille|pois|carotte|brocoli|chou|courgette|aubergine|épinard|poireau|champignon|céleri|ratatouille|tomate|concombre|maïs)/.test(str)) return 'leaf';

        // 10. Accompagnements : Féculents
        if (/(coquillettes|riz|pâte|spaghetti|macaroni|penne|ravioli|semoule|boulgour|blé|quinoa|pomme de terre|purée|gnocchi|nouille)/.test(str)) return 'pasta';

        // Fallback propre et discret
        return 'circle-medium';
    };

    const renderMeal = (mealTitle: string, categories: any[], mealType: 'midi' | 'soir') => {
        if (!categories || categories.length === 0) return null;

        // Le soleil pour le midi, la lune pour le soir
        const iconHeader = mealType === 'midi' ? 'white-balance-sunny' : 'moon-waning-crescent';

        return (
            <View style={{ marginBottom: tokens.space.xl }}>
                {/* Titre du repas */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.md, paddingHorizontal: tokens.space.md }}>
                    <MaterialCommunityIcons 
                        name={iconHeader} 
                        size={20} 
                        color={theme.accent ?? theme.primary} 
                    />
                    <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold as any, color: theme.font, marginLeft: tokens.space.sm }}>
                        {mealTitle}
                    </Text>
                </View>

                {/* Liste des catégories */}
                {categories.map((cat, index) => (
                    <View key={index} style={[style.course.card as any, { 
                        backgroundColor: theme.cardBackground, 
                        borderColor: theme.border, 
                        borderWidth: 1 
                    }]}>
                        <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold as any, color: theme.accent ?? theme.primary, marginBottom: tokens.space.sm }}>
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
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, fontStyle: 'italic' }}>Non précisé</Text>
                        )}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            
            {/* ── Bandeau des dates défilant horizontalement ── */}
            <View style={{ backgroundColor: theme.cardBackground, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: tokens.space.sm }}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={menus}
                    keyExtractor={(item) => item.date}
                    contentContainerStyle={{ paddingHorizontal: tokens.space.sm }}
                    renderItem={({ item, index }) => {
                        const isSelected = index === selectedIndex;
                        return (
                            <TouchableOpacity 
                                onPress={() => setSelectedIndex(index)}
                                style={{
                                    paddingHorizontal: tokens.space.md,
                                    paddingVertical: tokens.space.sm,
                                    marginHorizontal: tokens.space.xs,
                                    borderRadius: tokens.radius.pill,
                                    backgroundColor: isSelected ? (theme.accent ?? theme.primary) : theme.greyBackground,
                                }}
                            >
                                <Text style={{ 
                                    color: isSelected ? '#FFFFFF' : theme.fontSecondary,
                                    fontWeight: isSelected ? (tokens.fontWeight.bold as any) : (tokens.fontWeight.medium as any),
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
                        Aucun plat renseigné pour cette journée.
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
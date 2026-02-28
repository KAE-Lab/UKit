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

    const renderMeal = (mealName: string, categories: any[]) => {
        if (!categories || categories.length === 0) return null;

        return (
            <View style={{ marginBottom: tokens.space.xl }}>
                {/* Titre du repas (Midi / Soir) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.md, paddingHorizontal: tokens.space.md }}>
                    <MaterialCommunityIcons 
                        name={mealName === 'Midi' ? 'white-balance-sunny' : 'moon-waning-crescent'} 
                        size={20} 
                        color={theme.accent ?? theme.primary} 
                    />
                    <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold as any, color: theme.font, marginLeft: tokens.space.sm }}>
                        {mealName}
                    </Text>
                </View>

                {/* Liste des catégories (Entrées, Plats, Desserts...) */}
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
                            <View key={dIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                                <Text style={{ color: theme.fontSecondary, marginRight: 6 }}>•</Text>
                                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, flex: 1 }}>{dish}</Text>
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
                        {renderMeal(Translator.get('LUNCH'), currentMenu.midi)}
                        {renderMeal(Translator.get('DINNER'), currentMenu.soir)}
                    </>
                )}
                <View style={{ height: tokens.space.xxl }} />
            </ScrollView>

        </SafeAreaView>
    );
}
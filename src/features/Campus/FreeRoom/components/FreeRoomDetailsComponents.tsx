import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import Translator from '../../../../shared/i18n/Translator';
import style, { tokens, AppThemeType } from '../../../../shared/theme/Theme';
import { Badge } from '../../../../shared/ui/Badge';
import { CampusSectionHeader } from '../../components/CampusSectionHeader';
import { BuildingInfo, FreeRoomSlot, grouperParEtage } from '../../services/FreeRoomService';

interface FreeRoomHoursHeaderProps {
    building: BuildingInfo;
    hoursList: string[];
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    flatListRef: React.RefObject<FlatList>;
    scrollTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
    theme: AppThemeType;
    insets: EdgeInsets;
}

export function FreeRoomHoursHeader({ building, hoursList, selectedIndex, setSelectedIndex, flatListRef, scrollTimeoutRef, theme, insets }: FreeRoomHoursHeaderProps) {
    return (
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
                {building.name}
            </Text>

            <FlatList
                ref={flatListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={hoursList}
                keyExtractor={(item) => item}
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
                                borderWidth: 2,
                                borderColor: isSelected ? primaryColor : 'transparent',
                            }}
                        >
                            <Text style={{ 
                                color: isSelected ? primaryColor : theme.fontSecondary,
                                fontWeight: isSelected ? tokens.fontWeight.bold : tokens.fontWeight.medium,
                                fontSize: tokens.fontSize.sm
                            }}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

/** L'intertitre d'un etage : traduit, le rez-de-chaussee et les salles sans numero a part. */
function libelleDEtage(etage: number | null): string {
    if (etage === null) return Translator.get('FLOOR_UNNUMBERED');
    if (etage === 0) return Translator.get('FLOOR_GROUND');
    return Translator.get('FLOOR_N', etage);
}

function CaseDeSalle({ slot, theme }: { slot: FreeRoomSlot; theme: AppThemeType }) {
    return (
        <View style={[style.course.card, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            borderWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
            // `course.card` porte des marges cachees (md de chaque cote, sm dessus-dessous) qui
            // s'ajoutaient a la gouttiere du ScrollView : les cases etaient rentrees de 32 points
            // la ou toute l'application se tient a 16. La gouttiere reste au conteneur, seule.
            marginHorizontal: 0,
            marginVertical: 0,
            marginBottom: tokens.space.sm,
        }]}>
            <View style={{ flex: 1 }}>
                {/* `font` et non l'accent : un nom de salle nomme, il n'agit pas. */}
                <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: theme.font, marginBottom: tokens.space.xxs }}>
                    {slot.room.name}
                </Text>
                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary }}>
                    {Translator.get('AVAILABLE_UNTIL')} {slot.availableUntil}
                </Text>
            </View>
            <Badge
                theme={theme}
                label={`${Math.floor(slot.durationMinutes / 60)}h${slot.durationMinutes % 60 > 0 ? (slot.durationMinutes % 60).toString().padStart(2, '0') : ''}`}
            />
        </View>
    );
}

interface FreeRoomsListProps {
    freeRooms: FreeRoomSlot[];
    theme: AppThemeType;
    /** Ce qui suit les creneaux — la carte du batiment, montee par l'ecran. */
    pied?: React.ReactNode;
}

export function FreeRoomsList({ freeRooms, theme, pied }: FreeRoomsListProps) {
    return (
        <ScrollView style={{ flex: 1, paddingTop: tokens.space.md, paddingHorizontal: tokens.space.md }}>
            {/* Le vert (1) : la couleur de la disponibilite, et celle de « S'y rendre » plus bas. */}
            <CampusSectionHeader
                icone="door-open"
                titre={`${Translator.get('FREE_ROOMS')} (${freeRooms.length})`}
                couleur={1}
                theme={theme}
                style={{ marginTop: tokens.space.sm, marginBottom: tokens.space.md }}
            />

            {freeRooms.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.fontSecondary, marginTop: tokens.space.xl }}>
                    {Translator.get('NO_FREE_ROOMS')}
                </Text>
            ) : (
                /* Par etage, du plus bas au plus haut : la question qu'on se pose devant la liste
                   n'est pas « quelle salle » mais « combien de marches ». L'intertitre est celui
                   des categories de menu et des Reglages — un etage nomme, il n'agit pas. */
                grouperParEtage(freeRooms).map((groupe, indexGroupe) => (
                    <View key={groupe.etage ?? 'autres'}>
                        <Text style={{
                            fontSize: tokens.fontSize.xs,
                            fontWeight: tokens.fontWeight.semibold,
                            color: theme.fontSecondary,
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                            marginTop: indexGroupe === 0 ? 0 : tokens.space.sm,
                            marginBottom: tokens.space.sm,
                        }}>
                            {libelleDEtage(groupe.etage)}
                        </Text>
                        {groupe.slots.map((slot) => (
                            <CaseDeSalle key={slot.room.id} slot={slot} theme={theme} />
                        ))}
                    </View>
                ))
            )}

            {pied}

            <View style={{ height: tokens.space.xxl }} />
        </ScrollView>
    );
}

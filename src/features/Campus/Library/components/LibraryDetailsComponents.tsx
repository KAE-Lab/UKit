import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Translator from '../../../../shared/i18n/Translator';
import style, { tokens, toneColor, AppThemeType } from '../../../../shared/theme/Theme';
import { ProgressBar } from '../../../../shared/ui/ProgressBar';
import { LibraryInfo, TimetableEntry, AffluencesData, getLibraryStatus } from '../../services/LibraryService';

interface LibraryLiveAttendanceProps {
    affluence: AffluencesData | null;
    theme: AppThemeType;
}

export function LibraryLiveAttendance({ affluence, theme }: LibraryLiveAttendanceProps) {
    if (!affluence) return null;

    const { isOpen, rate, statusTone, statusText, statusNote } = getLibraryStatus(affluence);
    const statusColor = toneColor(theme, statusTone);

    return (
        <View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.md, marginBottom: tokens.space.lg, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold as never, color: theme.fontSecondary, marginBottom: tokens.space.sm, textTransform: 'uppercase' }}>
                {Translator.get('ATTENDANCE')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: rate !== null ? tokens.space.md : 0 }}>
                <MaterialCommunityIcons name={isOpen ? 'door-open' : 'door-closed'} size={24} color={statusColor} />
                <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold as never, color: statusColor, marginLeft: tokens.space.sm }}>
                    {statusText}
                </Text>
                {/* Meme ligne, meme couleur : deux `Text`, jamais une concatenation dans le service. */}
                {statusNote ? (
                    <Text numberOfLines={1} style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold as never, color: statusColor, marginLeft: tokens.space.xs, flexShrink: 1 }}>
                        {`- ${statusNote}`}
                    </Text>
                ) : null}
            </View>

            {rate !== null && (
                <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: tokens.space.xs }}>
                        <Text style={{ color: theme.font, fontSize: tokens.fontSize.sm }}>{Translator.get('OCCUPANCY_RATE')}</Text>
                        <Text style={{ color: theme.font, fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold as never }}>{rate}%</Text>
                    </View>
                    {/* La fiche a sa propre hauteur de jauge — 8 px contre 6 dans les listes. Le rayon,
                        lui, n'est plus ecrit : il vaut la moitie de la hauteur, et c'est le composant
                        qui le calcule (inventaire visuel, divergence 3.4). */}
                    <ProgressBar percent={rate} color={statusColor} trackColor={theme.border} height={8} />
                </View>
            )}
        </View>
    );
}

interface LibraryDatesHeaderProps {
    library: LibraryInfo;
    timetable: TimetableEntry[];
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    flatListRef: React.RefObject<FlatList>;
    scrollTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
    theme: AppThemeType;
    insets: EdgeInsets;
}

export function LibraryDatesHeader({ library, timetable, selectedIndex, setSelectedIndex, flatListRef, scrollTimeoutRef, theme, insets }: LibraryDatesHeaderProps) {
    const formatDate = (dateString: string) => {
        if (!dateString) return Translator.get('UNKNOWN');
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const dayKeys = ['DAY_SUN', 'DAY_MON', 'DAY_TUE', 'DAY_WED', 'DAY_THU', 'DAY_FRI', 'DAY_SAT'];
        const translatedDay = Translator.get(dayKeys[d.getDay()] as Parameters<typeof Translator.get>[0]);
        return `${translatedDay} ${d.getDate()}`;
    };

    return (
        <View style={{ backgroundColor: theme.cardBackground, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: tokens.space.sm, paddingTop: (insets.top || 0) + 65 }}>
            <Text 
                style={{
                    fontSize: tokens.fontSize.xl,
                    fontWeight: tokens.fontWeight.bold as never,
                    color: theme.fontSecondary,
                    textAlign: 'left',
                    paddingHorizontal: tokens.space.md,
                    marginBottom: tokens.space.md,
                }} 
                numberOfLines={2}
            >
                {library.name || Translator.get('LIBRARY')}
            </Text>
            
            <FlatList
                ref={flatListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={timetable}
                keyExtractor={(item) => item.day}
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
                                fontWeight: isSelected ? (tokens.fontWeight.bold as never) : (tokens.fontWeight.medium as never),
                                fontSize: tokens.fontSize.sm
                            }}>
                                {formatDate(item.day)}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

interface LibraryOpeningHoursListProps {
    loading: boolean;
    currentDay: TimetableEntry | undefined;
    theme: AppThemeType;
}

export function LibraryOpeningHoursList({ loading, currentDay, theme }: LibraryOpeningHoursListProps) {
    const formatTime = (dateTimeString: string) => {
        if (!dateTimeString) return '';
        return dateTimeString.substring(11, 16).replace(':', Translator.get('TIME_SEPARATOR'));
    };

    return (
        <>
            <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold as never, color: theme.font, marginBottom: tokens.space.md }}>
                {Translator.get('OPENING_HOURS')}
            </Text>

            {loading ? (
                <ActivityIndicator size="large" color={theme.accent ?? theme.primary} style={{ marginTop: tokens.space.xl }} />
            ) : (
                currentDay && currentDay.openingHours.length > 0 ? (
                    currentDay.openingHours.map((slot, index) => (
                        <View key={index} style={[style.course.card, {
                            backgroundColor: theme.cardBackground,
                            borderColor: theme.border,
                            borderWidth: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            // `course.card` porte des marges cachees (md de chaque cote) qui
                            // s'ajoutaient au padding de l'ecran : la case d'horaire etait rentree
                            // de 32 points la ou toute l'application se tient a 16. Meme correction
                            // que les cases de salles libres.
                            marginHorizontal: 0,
                            marginVertical: 0,
                            marginBottom: tokens.space.sm
                        }]}>
                            <MaterialIcons name="schedule" size={24} color={theme.accent ?? theme.primary} style={{ marginRight: tokens.space.md }} />
                            <Text style={{ fontSize: tokens.fontSize.md, color: theme.font, fontWeight: tokens.fontWeight.medium as never }}>
                                {formatTime(slot.openingHour)} - {formatTime(slot.closingHour)}
                            </Text>
                        </View>
                    ))
                ) : (
                    <View style={{ 
                        alignItems: 'center', 
                        paddingVertical: tokens.space.xl, 
                        paddingHorizontal: tokens.space.lg,
                        backgroundColor: theme.cardBackground, 
                        borderRadius: tokens.radius.lg, 
                        borderWidth: 1, 
                        borderColor: theme.border 
                    }}>
                        <MaterialCommunityIcons name="door-closed-lock" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.sm }} />
                        <Text style={{ 
                            color: theme.fontSecondary, 
                            fontSize: tokens.fontSize.md,
                            textAlign: 'center',
                            flexWrap: 'wrap',
                            width: '100%'
                        }}>
                            {Translator.get('CLOSED_ALL_DAY')}
                        </Text>
                    </View>
                )
            )}
        </>
    );
}

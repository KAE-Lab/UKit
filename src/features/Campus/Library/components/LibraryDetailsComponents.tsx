import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Translator from '../../../../shared/i18n/Translator';
import { tokens, toneColor, AppThemeType } from '../../../../shared/theme/Theme';
import { ProgressBar } from '../../../../shared/ui/ProgressBar';
import { LoadingState } from '../../../../shared/ui/LoadingState';
import { TimetableEntry, AffluencesData, getLibraryStatus } from '../../services/LibraryService';
import { Icon } from '../../../../shared/ui/Icon';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';

interface LibraryLiveAttendanceProps {
    affluence: AffluencesData | null;
    theme: AppThemeType;
}

export function LibraryLiveAttendance({ affluence, theme }: LibraryLiveAttendanceProps) {
    if (!affluence) return null;

    const { isOpen, rate, statusTone, statusText, statusNote } = getLibraryStatus(affluence);
    const statusColor = toneColor(theme, statusTone);

    return (
        <View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.md, marginBottom: tokens.space.xl, borderRadius: tokens.radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.contourDeCarte }}>
            {/* En casse de phrase : les petites capitales espacees sont un tic (deuxieme passe de 7-J). */}
            <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold as never, color: theme.fontSecondary, marginBottom: tokens.space.sm }}>
                {Translator.get('ATTENDANCE')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: rate !== null ? tokens.space.md : 0 }}>
                <Icon icon={{ name: isOpen ? 'door-open' : 'door-closed' }} size={24} color={statusColor} />
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
            {/* L'intertitre commun des fiches, celui de « S'y rendre » juste dessous. */}
            <SectionHeader title={Translator.get('OPENING_HOURS')} theme={theme} style={{ paddingHorizontal: 0 }} />

            {loading ? (
                <LoadingState theme={theme} message={Translator.get('LOADING_OPENING_HOURS')} />
            ) : (
                currentDay && currentDay.openingHours.length > 0 ? (
                    // Une carte pour les creneaux du jour, un filet entre deux (7-J, deuxieme passe) :
                    // chaque creneau etait une carte, avec une horloge a l'accent qui ne menait nulle part.
                    <View style={[styles.carte, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
                        {currentDay.openingHours.map((slot, index) => (
                            <View key={index}>
                                {index > 0 ? <View style={[styles.filet, { backgroundColor: theme.border }]} /> : null}
                                <Text style={[styles.creneau, tokens.texte.chiffres, { color: theme.font }]}>
                                    {formatTime(slot.openingHour)} – {formatTime(slot.closingHour)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={{ 
                        alignItems: 'center', 
                        paddingVertical: tokens.space.xl, 
                        paddingHorizontal: tokens.space.lg,
                        backgroundColor: theme.cardBackground,
                        borderRadius: tokens.radius.lg,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.contourDeCarte,
                    }}>
                        <Icon icon={{ name: 'door-closed-lock' }} size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.sm }} />
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

const styles = StyleSheet.create({
    carte: {
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    creneau: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm + tokens.space.xs,
    },
    filet: {
        height: StyleSheet.hairlineWidth,
        marginLeft: tokens.space.md,
    },
});

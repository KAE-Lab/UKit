import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ViewabilityConfig, ViewToken, ListRenderItemInfo } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { PastilleService } from '../../../shared/messages/PastilleService';
import { HEADER_OFFSET } from '../../../shared/ui/ScreenState';
import { HeaderButton, HEADER_BUTTON_ICON } from '../../../shared/ui/HeaderButton';
import { FondDOnglet } from '../../../shared/ui/FondDOnglet';

export interface DayViewHeaderProps {
    insets: { top: number } | null;
    theme: import('../../../shared/theme/Theme').AppThemeType;
    mode: 'day' | 'week';
    groupName: string | string[];
    
    // Labels
    centerLabel: string;
    leftLabel: string;
    rightLabel: string;
    rightIcon: keyof typeof MaterialCommunityIcons.glyphMap;

    // Callbacks
    onTodayPress: () => void;
    onRightPress: () => void;
    /** Le « + » vers l'editeur du systeme ; absent tant qu'aucun calendrier du telephone n'est affiche (6.1.x-D). */
    onAjouterEvenement?: () => void;

    // Day slider
    days: moment.Moment[];
    extractCalendarDayKey: (item: moment.Moment) => string;
    viewability: ViewabilityConfig;
    checkViewableItems: (info: { viewableItems: ViewToken[] }) => void;
    selectedDayIndex: number;
    getCalendarListItemLayout: (data: unknown[] | null | undefined, index: number) => { length: number; offset: number; index: number };
    renderCalendarDayItem: (info: ListRenderItemInfo<moment.Moment>) => React.ReactElement;
    onDayScrollToIndexFailed: (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => void;
    setDayListRef: (ref: FlatList<moment.Moment> | null) => void;

    // Week slider
    weeks: { week: number; year: number }[];
    extractCalendarWeekKey: (item: { week: number; year: number }) => string;
    selectedWeekIndex: number;
    renderCalendarWeekItem: (info: ListRenderItemInfo<{ week: number; year: number }>) => React.ReactElement;
    onWeekScrollToIndexFailed: (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => void;
    setWeekListRef: (ref: FlatList<{ week: number; year: number }> | null) => void;
    /** Le ruban vient d'etre mesure : le moment de le recentrer sur la selection. */
    onRubanMesure?: () => void;

    extraData: unknown;
}

const renderTitle = (groupName: string | string[], theme: import('../../../shared/theme/Theme').AppThemeType, onAjouterEvenement?: () => void) => {
    // Vue d'un groupe cherche : pas de grand titre, mais tout son ESPACE — le degagement standard
    // des sous-pages (HEADER_OFFSET), la ou le titre en opacite nulle ne reservait que sa propre
    // hauteur : les boutons flottants retour et favori frolaient la ligne Aujourd'hui/Semaine
    // (constate sur les deux plateformes le 2026-08-31).
    if (!Array.isArray(groupName)) {
        return <View style={{ height: HEADER_OFFSET }} />;
    }
    return (
        // Ligne 1 : Titre "Planning", et a droite le « + » quand il a lieu d'etre, puis la pastille
        // d'etat de service (shared/messages/PastilleService), alignes sur la ligne du titre par la
        // meme marge basse.
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md }}>
            <Text style={[tokens.texte.grandTitre, { color: theme.font, marginBottom: tokens.space.md }]}>
                {Translator.get('MY_PLANNING')}
            </Text>
            <View style={{ marginLeft: 'auto', marginBottom: tokens.space.md, flexDirection: 'row', alignItems: 'center' }}>
                {onAjouterEvenement !== undefined && (
                    <HeaderButton theme={theme} onPress={onAjouterEvenement} accessibilityLabel={Translator.get('ADD_EVENT')} style={{ marginRight: tokens.space.sm }}>
                        <MaterialCommunityIcons name="plus" size={HEADER_BUTTON_ICON} color={theme.primary} />
                    </HeaderButton>
                )}
                <PastilleService theme={theme} onglet="Planning" />
            </View>
        </View>
    );
};

const renderNavigation = (
    theme: import('../../../shared/theme/Theme').AppThemeType,
    mode: 'day' | 'week',
    leftLabel: string,
    centerLabel: string,
    rightLabel: string,
    rightIcon: keyof typeof MaterialCommunityIcons.glyphMap,
    onTodayPress: () => void,
    onRightPress: () => void,
) => {
    const primaryColor = theme.accent ?? theme.primary;
    return (
        // Ligne 2 : Today/ThisWeek | Label | Week/Day
        <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: tokens.space.md,
            marginBottom: tokens.space.sm,
        }}>
            {/* Bouton gauche */}
            <TouchableOpacity
                onPress={onTodayPress}
                style={[styles.bouton, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
                <MaterialIcons name="event-note" size={16} color={primaryColor} />
                <Text style={{
                    fontSize: tokens.fontSize.sm,
                    marginLeft: tokens.space.xs,
                    color: primaryColor,
                    fontWeight: tokens.fontWeight.medium as never,
                }}>
                    {leftLabel}
                </Text>
            </TouchableOpacity>

            {/* Label central */}
            <Text style={{
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.semibold as never,
                color: theme.fontSecondary,
                flex: 1,
                textAlign: 'center',
            }}>
                {centerLabel}
            </Text>

            {/* Bouton droit : switch mode */}
            <TouchableOpacity
                onPress={onRightPress}
                style={[styles.bouton, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
                {mode === 'week' && (
                    <MaterialCommunityIcons
                        name={rightIcon}
                        size={16}
                        color={primaryColor}
                        style={{ marginRight: tokens.space.xs }}
                    />
                )}
                <Text style={{
                    fontSize: tokens.fontSize.sm,
                    color: primaryColor,
                    fontWeight: tokens.fontWeight.medium as never,
                    marginRight: mode === 'day' ? tokens.space.xs : 0,
                }}>
                    {rightLabel}
                </Text>
                {mode === 'day' && (
                    <MaterialCommunityIcons name={rightIcon} size={16} color={primaryColor} />
                )}
            </TouchableOpacity>
        </View>
    );
};

const renderSliders = (props: DayViewHeaderProps) => {
    // Ligne 3 : Slider (jours ou semaines selon mode)
    if (props.mode === 'day') {
        return (
            <FlatList
                key="slider-day"
                ref={props.setDayListRef}
                showsHorizontalScrollIndicator={false}
                data={props.days}
                horizontal
                keyExtractor={props.extractCalendarDayKey}
                viewabilityConfig={props.viewability}
                onViewableItemsChanged={props.checkViewableItems}
                initialScrollIndex={props.selectedDayIndex}
                getItemLayout={props.getCalendarListItemLayout}
                extraData={props.extraData}
                renderItem={props.renderCalendarDayItem}
                contentContainerStyle={{ paddingHorizontal: tokens.space.md }}
                onScrollToIndexFailed={props.onDayScrollToIndexFailed}
                onLayout={props.onRubanMesure}
            />
        );
    }
    return (
        <FlatList
            key="slider-week"
            ref={props.setWeekListRef}
            showsHorizontalScrollIndicator={false}
            data={props.weeks}
            horizontal
            keyExtractor={props.extractCalendarWeekKey}
            viewabilityConfig={props.viewability}
            initialScrollIndex={props.selectedWeekIndex}
            getItemLayout={props.getCalendarListItemLayout}
            extraData={props.extraData}
            renderItem={props.renderCalendarWeekItem}
            contentContainerStyle={{ paddingHorizontal: tokens.space.md }}
            onScrollToIndexFailed={props.onWeekScrollToIndexFailed}
            onLayout={props.onRubanMesure}
        />
    );
};

/**
 * L'en-tete collant du Planning : le titre, la navigation, le ruban.
 *
 * **Il porte le fond de l'onglet** (7-J), comme Campus, la Scolarite et les Reglages : le bleu du
 * Planning, ramene a la hauteur de l'en-tete pour se fondre dans la page juste au-dessus du filet.
 * Il etait un aplat de carte avec une ombre ; la liste qui defile dessous s'en separe desormais par
 * le seul filet. La hauteur se mesure au premier rendu, le fond attend d'en connaitre la valeur.
 */
export const DayViewHeader: React.FC<DayViewHeaderProps> = (props) => {
    const [hauteur, setHauteur] = useState<number | null>(null);
    return (
        <View
            onLayout={(evenement) => setHauteur(Math.round(evenement.nativeEvent.layout.height))}
            style={[styles.enTete, {
                backgroundColor: props.theme.background,
                borderBottomColor: props.theme.border,
                paddingTop: (props.insets?.top || 0),
            }]}
        >
            {hauteur !== null ? <FondDOnglet theme={props.theme} onglet="planning" hauteur={hauteur} /> : null}
            {renderTitle(props.groupName, props.theme, props.onAjouterEvenement)}
            {renderNavigation(
                props.theme, props.mode, props.leftLabel, props.centerLabel, 
                props.rightLabel, props.rightIcon, props.onTodayPress, props.onRightPress
            )}
            {renderSliders(props)}
        </View>
    );
};

const styles = StyleSheet.create({
    enTete: {
        paddingBottom: tokens.space.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    // Les deux boutons de la navigation : une surface de carte posee sur le fond de l'onglet, au
    // filet des cartes ; le gris de bouton s'y lisait comme une tache.
    bouton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        borderRadius: tokens.radius.md,
        borderWidth: StyleSheet.hairlineWidth,
    },
});

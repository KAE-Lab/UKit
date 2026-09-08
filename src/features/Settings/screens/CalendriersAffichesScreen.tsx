/**
 * Les calendriers du telephone affiches dans le Planning (jalon 6.1.x-D).
 *
 * Un ecran pousse, sur le modele des filtres d'UE : `SettingsChoicePopup` est mono-selection, et un
 * choix multiple dans une modale serait une sous-page qui ne dit pas son nom. Chaque rangee porte le
 * nom du calendrier, sa source et **sa couleur** — celle que le Planning rendra, et a laquelle
 * l'utilisateur le reconnaitra.
 *
 * Deux regles, decidees : rien ne s'affiche tant que rien n'est coche — opt-in, calendrier par
 * calendrier — et la cible de la synchronisation n'est pas proposee (`calendriersLisibles`) : la
 * relire afficherait chaque cours deux fois.
 *
 * La liste est relue au focus par `getCalendarsAsync`, pas par le cache de `SettingsManager`, qui
 * n'est rempli qu'au chargement : un calendrier cree entre-temps doit apparaitre. La permission est
 * seulement lue, jamais demandee ici — c'est l'interrupteur de synchronisation qui la demande, et
 * l'ecran des reglages qui la propose au montage (docs/plateforme.md).
 */

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Animated, Linking, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Calendar from 'expo-calendar/legacy';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext, SettingsManager } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import Button from '../../../shared/ui/Button';
import { HEADER_OFFSET } from '../../../shared/ui/ScreenState';
import { Interrupteur } from '../../../shared/ui/Interrupteur';
import { PointDeCouleur } from '../../../shared/ui/PointDeCouleur';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { SettingsTextHeader } from '../components/SettingsSections';
import { couleurDeCours } from '../../Planning/services/couleurDeCours';
import { calendriersLisibles } from '../../Planning/services/TelephoneMapping';

type Theme = import('../../../shared/theme/Theme').AppThemeType;
type ThemeSettings = Theme['settings'];
type Etat = 'chargement' | 'permission' | 'pret';

/** Les calendriers, groupes par leur source : c'est ainsi que l'agenda du systeme les presente. */
function parSource(calendriers: readonly Calendar.Calendar[]): { source: string; calendriers: Calendar.Calendar[] }[] {
    const groupes = new Map<string, Calendar.Calendar[]>();
    for (const calendrier of calendriers) {
        const source = calendrier.source?.name?.trim() || Translator.get('CALENDAR');
        groupes.set(source, [...(groupes.get(source) ?? []), calendrier]);
    }
    return [...groupes.entries()].map(([source, liste]) => ({ source, calendriers: [...liste].sort((a, b) => a.title.localeCompare(b.title)) }));
}

function RangeeDeCalendrier({ calendrier, theme, themeSettings, affiche, onChange }: {
    calendrier: Calendar.Calendar; theme: Theme; themeSettings: ThemeSettings; affiche: boolean; onChange: (valeur: boolean) => void;
}) {
    return (
        <View style={[themeSettings.button, { alignItems: 'center' }] as never}>
            {/* La couleur telle que le Planning la rendra : la meme resolution que CourseRow. */}
            <PointDeCouleur couleur={couleurDeCours(theme.courses, calendrier.color ?? undefined)} taille={12} style={{ marginLeft: tokens.space.md }} />
            <View style={{ flex: 1 }}>
                <Text style={themeSettings.buttonMainText as never} numberOfLines={2}>{calendrier.title}</Text>
            </View>
            <Interrupteur valeur={affiche} onChange={onChange} theme={themeSettings} accessibilityLabel={calendrier.title} style={{ marginRight: tokens.space.md }} />
        </View>
    );
}

function CalendriersAffichesScreen({ onAnimatedScroll }: { onAnimatedScroll?: (event: unknown) => void }) {
    const { themeName } = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const theme = style.Theme[themeName ?? 'light'];
    const themeSettings = theme.settings;
    const navigation = useNavigation();

    const [etat, setEtat] = useState<Etat>('chargement');
    const [calendriers, setCalendriers] = useState<Calendar.Calendar[]>([]);
    const [affiches, setAffiches] = useState<string[]>(SettingsManager.getCalendriersAffiches());

    const relire = useCallback(async () => {
        if ((await Calendar.getCalendarPermissionsAsync()).status !== 'granted') {
            setEtat('permission');
            return;
        }
        const liste = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        setCalendriers(calendriersLisibles(liste, SettingsManager.getSyncCalendar()));
        setEtat('pret');
    }, []);

    useEffect(() => {
        void relire();
        const desabonnerFocus = navigation.addListener('focus', () => { void relire(); });
        const relireAffiches = (identifiants: string[]) => setAffiches([...identifiants]);
        SettingsManager.on('calendriersAffiches', relireAffiches);
        return () => {
            desabonnerFocus();
            SettingsManager.unsubscribe('calendriersAffiches', relireAffiches);
        };
    }, [navigation, relire]);

    const basculer = (id: string, valeur: boolean) => {
        const sans = SettingsManager.getCalendriersAffiches().filter((autre) => autre !== id);
        SettingsManager.setCalendriersAffiches(valeur ? [...sans, id] : sans);
    };

    const renderContenu = () => {
        if (etat === 'chargement') return null;
        if (etat === 'permission') {
            return (
                <>
                    <View style={{ backgroundColor: theme.warningSoft, borderRadius: tokens.radius.lg, marginHorizontal: tokens.space.md, marginTop: tokens.space.sm, padding: tokens.space.md, borderWidth: 1, borderColor: theme.warning }}>
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, lineHeight: 20 }}>{Translator.get('ENABLE_CALENDAR_PERMISSION_DESCRIPTION')}</Text>
                    </View>
                    <Button theme={themeSettings} onPress={() => Linking.openSettings()} leftIcon="settings" leftText={Translator.get('OPEN_SYSTEM_SETTINGS')} />
                </>
            );
        }
        if (calendriers.length === 0) {
            return (
                <View style={[themeSettings.button, { alignItems: 'center' }] as never}>
                    <Text style={[themeSettings.buttonSecondaryText, { marginLeft: tokens.space.md, flex: 1 }] as never}>{Translator.get('PHONE_CALENDARS_EMPTY')}</Text>
                </View>
            );
        }
        return parSource(calendriers).map((groupe) => (
            <React.Fragment key={groupe.source}>
                <SettingsTextHeader theme={themeSettings} text={groupe.source} />
                {groupe.calendriers.map((calendrier) => (
                    <RangeeDeCalendrier
                        key={calendrier.id}
                        calendrier={calendrier}
                        theme={theme}
                        themeSettings={themeSettings}
                        affiche={affiches.includes(calendrier.id)}
                        onChange={(valeur) => basculer(calendrier.id, valeur)}
                    />
                ))}
            </React.Fragment>
        ));
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <Animated.ScrollView
                    style={{ flex: 1, backgroundColor: theme.background }}
                    showsVerticalScrollIndicator={false}
                    onScroll={onAnimatedScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingTop: (insets?.top ?? 0) + HEADER_OFFSET, paddingBottom: tokens.space.xxl }}
                >
                    <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 20, marginHorizontal: tokens.space.md }}>
                        {Translator.get('PHONE_CALENDARS_DESCRIPTION')}
                    </Text>
                    {renderContenu()}
                </Animated.ScrollView>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
}

export default withHeaderAnimation(CalendriersAffichesScreen);

import React from 'react';
import { View, Text, Linking } from 'react-native';
import Slider from '@react-native-community/slider';
import Button from '../../../shared/ui/Button';
import Translator from '../../../shared/i18n/Translator';
import { tokens } from '../../../shared/theme/Theme';
import { SettingsManager } from '../../../shared/services/AppCore';
import { AppThemeType } from '../../../shared/theme/Theme';

const LANGUAGE_LIST = {
    fr: 'FRENCH',
    en: 'ENGLISH',
    es: 'SPANISH',
};

export const SettingsTextHeader = ({ theme, text }: { theme: AppThemeType['settings']; text: string }) => {
    if (!theme?.separationText) return null;
    return <Text style={theme.separationText as never}>{text.toUpperCase()}</Text>;
};

interface DisplaySectionProps {
    themeSettings: AppThemeType['settings'];
    language: string;
    openLanguageDialog: () => void;
    openFiltersDialog: () => void;
}

interface InstitutionSectionProps {
    themeSettings: AppThemeType['settings'];
    theme: AppThemeType;
    /** Le nom de l'etablissement selectionne, tel que le catalogue le porte. Jamais traduit. */
    institutionName: string;
    /** L'etablissement selectionne a disparu du catalogue publie : l'utilisateur doit le savoir. */
    institutionRetiree: boolean;
    openInstitutionDialog: () => void;
    /** L'etablissement publie-t-il un portail ? Sans lui, il n'y a pas de compte a proposer. */
    comptePossible: boolean;
    /** Le compte universitaire est-il connecte ? C'est le **rappel** de l'etape sautee a l'accueil. */
    compteConnecte: boolean;
    openCompte: () => void;
    /** L'etablissement attend-il un lien d'abonnement ? Absent partout ailleurs. */
    lienEdtPossible: boolean;
    lienEdtPose: boolean;
    openLienEdt: () => void;
}

/**
 * L'etablissement, en premiere position de l'ecran (jalon 6-G).
 *
 * En premier parce que c'est le reglage dont tous les autres dependent : les groupes, le planning, la
 * session universitaire. Le nom affiche a droite vient du **catalogue** et n'est pas traduit — c'est
 * une donnee, comme le nom d'un calendrier du systeme juste en dessous.
 *
 * L'avertissement de retrait est **une phrase, pas une bascule** : l'application continue sur ce
 * qu'elle sait de l'etablissement plutot que de renvoyer quelqu'un ailleurs au milieu de son annee.
 */
export const InstitutionSection = ({
    themeSettings, theme, institutionName, institutionRetiree, openInstitutionDialog,
    comptePossible, compteConnecte, openCompte, lienEdtPossible, lienEdtPose, openLienEdt,
}: InstitutionSectionProps) => (
    <>
        <SettingsTextHeader theme={themeSettings} text={Translator.get('INSTITUTION')} />
        <Button
            theme={themeSettings}
            onPress={openInstitutionDialog}
            leftIcon="school"
            leftText={Translator.get('INSTITUTION')}
            rightText={institutionName}
        />
        {/*
          * Le rappel du compte (jalon 6-J). L'etape de l'accueil se saute, et la specification
          * demandait « une etape sautable **et rappelee** » : c'est ici que le rappel vit, avec le
          * reglage dont il depend. Il disparait chez un etablissement sans portail — un compte qu'on
          * ne peut pas connecter n'est pas un reglage, c'est une promesse en l'air.
          */}
        {comptePossible && (
            <Button
                theme={themeSettings}
                onPress={openCompte}
                leftIcon="account-circle"
                leftText={Translator.get('UNIVERSITY_ACCOUNT')}
                rightText={Translator.get(compteConnecte ? 'ACCOUNT_CONNECTED' : 'ACCOUNT_NOT_CONNECTED')}
            />
        )}
        {/* Le lien d'abonnement, la ou il y en a un a poser — et nulle part ailleurs. */}
        {lienEdtPossible && (
            <Button
                theme={themeSettings}
                onPress={openLienEdt}
                leftIcon="event-note"
                leftText={Translator.get('TIMETABLE_LINK')}
                rightText={Translator.get(lienEdtPose ? 'ACCOUNT_CONNECTED' : 'ACCOUNT_NOT_CONNECTED')}
            />
        )}
        {institutionRetiree && (
            <Text style={{
                color: theme.fontSecondary,
                fontSize: tokens.fontSize.xs,
                paddingHorizontal: tokens.space.md,
                marginTop: tokens.space.xs,
            }}>
                {Translator.get('INSTITUTION_UNAVAILABLE')}
            </Text>
        )}
    </>
);

export const DisplaySection = ({ themeSettings, language, openLanguageDialog, openFiltersDialog }: DisplaySectionProps) => (
    <>
        <SettingsTextHeader theme={themeSettings} text={Translator.get('DISPLAY')} />
        <Button
            theme={themeSettings}
            onPress={openLanguageDialog}
            leftIcon="language"
            leftText={Translator.get('LANGUAGE')}
            rightText={Translator.get(LANGUAGE_LIST[language as keyof typeof LANGUAGE_LIST] as Parameters<typeof Translator.get>[0])}
        />
        <Button
            theme={themeSettings}
            onPress={openFiltersDialog}
            leftIcon="filter-list"
            leftText={Translator.get('FILTERS')}
            rightText="..."
        />
    </>
);

interface ThemeSectionProps {
    themeSettings: AppThemeType['settings'];
    isDarkMode: boolean;
    toggleTheme: () => void;
}

export const ThemeSection = ({ themeSettings, isDarkMode, toggleTheme }: ThemeSectionProps) => (
    <>
        <SettingsTextHeader theme={themeSettings} text={Translator.get('THEME') || 'Thème'} />
        <Button
            theme={themeSettings}
            leftIcon="theme-light-dark"
            leftText={Translator.get('DARK_MODE') || 'Mode Sombre'}
            onSwitchToggle={toggleTheme}
            switchValue={isDarkMode}
        />
    </>
);

interface NotificationsSectionProps {
    themeSettings: AppThemeType['settings'];
    theme: AppThemeType;
    courseNotificationsEnabled: boolean;
    toggleCourseNotifications: () => void;
    courseNotificationDelay: number;
    onNotificationDelayChange: (value: number) => void;
    onNotificationDelaySlidingComplete: (value: number) => void;
}

export const NotificationsSection = ({ themeSettings, theme, courseNotificationsEnabled, toggleCourseNotifications, courseNotificationDelay, onNotificationDelayChange, onNotificationDelaySlidingComplete }: NotificationsSectionProps) => (
    <>
        <SettingsTextHeader theme={themeSettings} text={Translator.get('NOTIFICATIONS') || 'Notifications'} />
        <Button
            theme={themeSettings}
            leftIcon="bell-outline"
            leftText={Translator.get('COURSE_NOTIFICATIONS') || 'Notifications de cours'}
            onSwitchToggle={toggleCourseNotifications}
            switchValue={courseNotificationsEnabled}
        />
        {courseNotificationsEnabled && (
            <View style={{ backgroundColor: theme.cardBackground, borderRadius: tokens.radius.lg, marginHorizontal: tokens.space.md, marginTop: tokens.space.sm, padding: tokens.space.md, borderWidth: 1, borderColor: theme.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space.sm }}>
                    <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, fontWeight: tokens.fontWeight.semibold }}>
                        {Translator.get('NOTIFICATION_DELAY') || 'Délai avant le cours'}
                    </Text>
                    <Text style={{ fontSize: tokens.fontSize.sm, color: theme.primary, fontWeight: tokens.fontWeight.bold }}>
                        {courseNotificationDelay} min
                    </Text>
                </View>
                <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={5}
                    maximumValue={60}
                    step={5}
                    value={courseNotificationDelay}
                    onValueChange={onNotificationDelayChange}
                    onSlidingComplete={onNotificationDelaySlidingComplete}
                    minimumTrackTintColor={theme.primary}
                    maximumTrackTintColor={theme.border}
                    thumbTintColor={theme.primary}
                />
                <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, marginTop: tokens.space.xs }}>
                    {Translator.get('NOTIFICATION_DELAY_DESC') || 'Ajustez combien de minutes avant le début du cours vous souhaitez être notifié.'}
                </Text>
            </View>
        )}
    </>
);

interface AppLaunchingSectionProps {
    themeSettings: AppThemeType['settings'];
    openFavSwitchValue: boolean;
    toggleOpenFavSwitchValue: () => void;
    openResetDialog: () => void;
}

export const AppLaunchingSection = ({ themeSettings, openFavSwitchValue, toggleOpenFavSwitchValue, openResetDialog }: AppLaunchingSectionProps) => (
    <>
        <SettingsTextHeader theme={themeSettings} text={Translator.get('APP_LAUNCHING')} />
        <Button
            theme={themeSettings}
            leftIcon="star"
            leftText={Translator.get('OPEN_ON_FAVOURITE_GROUP')}
            onSwitchToggle={toggleOpenFavSwitchValue}
            switchValue={openFavSwitchValue}
        />
        <Button
            theme={themeSettings}
            onPress={openResetDialog}
            leftIcon="autorenew"
            leftText={Translator.get('RESET_APP')}
        />
    </>
);

interface CalendarSectionProps {
    themeSettings: AppThemeType['settings'];
    theme: AppThemeType;
    hasCalendarPermission: boolean;
    lastSyncDate: import('moment').Moment | null;
    calendarSyncEnabled: boolean;
    toggleCalendarSync: () => void;
    calendarName: string;
    openCalendarDialog: () => void;
    isSynchronizingCalendar: boolean;
    selectedCalendar: string | number;
}

export const CalendarSection = ({ themeSettings, theme, hasCalendarPermission, lastSyncDate, calendarSyncEnabled, toggleCalendarSync, calendarName, openCalendarDialog, isSynchronizingCalendar, selectedCalendar }: CalendarSectionProps) => (
    <>
        <SettingsTextHeader theme={themeSettings} text={Translator.get('CALENDAR_SYNCHRONIZATION')} />
        {hasCalendarPermission ? (
            <>
                <View style={{ backgroundColor: theme.cardBackground, borderRadius: tokens.radius.lg, marginHorizontal: tokens.space.md, marginTop: tokens.space.sm, padding: tokens.space.md, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 20, marginBottom: tokens.space.xs }}>
                        {Translator.get('AUTO_SYNC_DESCRIPTION')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: tokens.space.xs }}>
                        <View style={{ width: 8, height: 8, borderRadius: tokens.radius.md, backgroundColor: lastSyncDate ? '#43A047' : theme.fontSecondary, marginRight: tokens.space.sm }} />
                        <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary }}>
                            {lastSyncDate ? `${Translator.get('LAST_SYNCHRONIZATION')} : ${lastSyncDate.format('LLL')}` : Translator.get('NO_SYNCHRONIZATION_DONE')}
                        </Text>
                    </View>
                </View>
                <Button
                    theme={themeSettings}
                    leftIcon="sync-disabled"
                    leftText={Translator.get('SYNC_ENABLED')}
                    onSwitchToggle={toggleCalendarSync}
                    switchValue={calendarSyncEnabled}
                />
                <Button
                    theme={themeSettings}
                    onPress={openCalendarDialog}
                    leftIcon="calendar-today"
                    leftText={Translator.get('CALENDAR')}
                    rightText={calendarName}
                />
                <Button
                    theme={themeSettings}
                    onPress={SettingsManager.syncCalendar}
                    disabled={selectedCalendar !== -1 && isSynchronizingCalendar}
                    leftIconAnimation={isSynchronizingCalendar ? 'rotate' : ''}
                    leftIcon="sync"
                    leftText={isSynchronizingCalendar ? Translator.get('SYNCHRONIZING') : Translator.get('FORCE_SYNC')}
                />
            </>
        ) : (
            <>
                <View style={{ backgroundColor: `#E6510018`, borderRadius: tokens.radius.lg, marginHorizontal: tokens.space.md, marginTop: tokens.space.sm, padding: tokens.space.md, borderWidth: 1, borderColor: `#E6510040`, flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, lineHeight: 20, flex: 1 }}>
                        {Translator.get('ENABLE_CALENDAR_PERMISSION_DESCRIPTION')}
                    </Text>
                </View>
                <Button
                    theme={themeSettings}
                    onPress={() => Linking.openSettings()}
                    leftIcon="settings"
                    leftText={Translator.get('OPEN_SYSTEM_SETTINGS')}
                />
            </>
        )}
    </>
);

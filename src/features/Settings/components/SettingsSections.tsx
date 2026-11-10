/**
 * Les sections de l'ecran Reglages, chacune un groupe encadre (jalon 7-J, `GroupeDeReglages`). Les
 * icones sont neutres depuis la deuxieme passe : les six couleurs du systeme qui disaient la famille
 * d'une rangee sont parties avec la review du 2026-11-05.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import moment from 'moment';

import Translator from '../../../shared/i18n/Translator';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { PointDeCouleur } from '../../../shared/ui/PointDeCouleur';
import { useMesureActive } from '../../../shared/mesure';
import { GroupeDeReglages, IntroDePage, RangeeDeReglage } from './GroupeDeReglages';
import { Icon } from '../../../shared/ui/Icon';
import { DELAI, delaiVoisin, type PageDeReglage } from '../pagesDeReglages';

const LANGUAGE_LIST = {
    fr: 'FRENCH',
    en: 'ENGLISH',
    es: 'SPANISH',
};

/**
 * L'intertitre d'un groupe de reglages, pour les ecrans pousses qui composent encore leurs rangees a
 * la main (les filtres, les calendriers du telephone).
 */
export const SettingsTextHeader = ({ theme, text }: { theme: AppThemeType['settings']; text: string }) => {
    if (!theme?.separationText) return null;
    return <Text style={theme.separationText as never}>{text}</Text>;
};

interface InstitutionSectionProps {
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
    /** Le don, quand le catalogue en publie l'adresse : il s'ouvre dans le navigateur du systeme. */
    soutien?: () => void;
}

/**
 * L'etablissement, en premiere position de l'ecran (jalon 6-G) : c'est le reglage dont tous les autres
 * dependent. Le nom a droite vient du **catalogue** et n'est pas traduit. Le rappel du compte (6-J) vit
 * ici, avec le reglage dont il depend, et disparait chez un etablissement sans portail. L'avertissement
 * de retrait est une phrase, pas une bascule.
 */
export const InstitutionSection = ({
    theme, institutionName, institutionRetiree, openInstitutionDialog,
    comptePossible, compteConnecte, openCompte, lienEdtPossible, lienEdtPose, openLienEdt, soutien,
}: InstitutionSectionProps) => {
    return (
        <GroupeDeReglages
            theme={theme}
            titre={Translator.get('INSTITUTION')}
            pied={institutionRetiree ? Translator.get('INSTITUTION_UNAVAILABLE') : undefined}
        >
            <RangeeDeReglage theme={theme} icone="school" libelle={Translator.get('INSTITUTION')} valeur={institutionName} onPress={openInstitutionDialog} />
            {comptePossible && (
                <RangeeDeReglage
                    theme={theme}
                    icone="account-circle"
                    // « Compte » et non « Compte universitaire » : le groupe « Etablissement » le situe deja,
                    // et a 360 points la valeur ne gardait que « Non … » (7-J).
                    libelle={Translator.get('ACCOUNT')}
                    valeur={Translator.get(compteConnecte ? 'ACCOUNT_CONNECTED' : 'ACCOUNT_NOT_CONNECTED')}
                    onPress={openCompte}
                />
            )}
            {lienEdtPossible && (
                <RangeeDeReglage
                    theme={theme}
                    icone="calendar-import"
                    libelle={Translator.get('TIMETABLE_LINK')}
                    valeur={Translator.get(lienEdtPose ? 'ACCOUNT_CONNECTED' : 'ACCOUNT_NOT_CONNECTED')}
                    onPress={openLienEdt}
                />
            )}
            {soutien !== undefined && (
                <RangeeDeReglage theme={theme} icone="hand-heart-outline" libelle={Translator.get('SUPPORT_UKIT')} onPress={soutien} />
            )}
        </GroupeDeReglages>
    );
};

interface DisplaySectionProps {
    theme: AppThemeType;
    language: string;
    openLanguageDialog: () => void;
    openFilters: () => void;
    /** Le nombre de filtres actifs : ce qui est masque du planning se retrouve d'ici (lot 1, 2026-11-10). */
    nombreDeFiltres: number;
    isDarkMode: boolean;
    openApparence: () => void;
}

/** L'affichage, a l'accueil : trois rangees qui menent, plus d'interrupteur (7-J, troisieme passe). */
export const DisplaySection = ({ theme, language, openLanguageDialog, openFilters, nombreDeFiltres, isDarkMode, openApparence }: DisplaySectionProps) => (
    <GroupeDeReglages theme={theme} titre={Translator.get('DISPLAY')}>
        <RangeeDeReglage
            theme={theme}
            icone={{ mi: 'language' }}
            libelle={Translator.get('LANGUAGE')}
            valeur={Translator.get(LANGUAGE_LIST[language as keyof typeof LANGUAGE_LIST] as Parameters<typeof Translator.get>[0])}
            onPress={openLanguageDialog}
        />
        <RangeeDeReglage
            theme={theme}
            icone="theme-light-dark"
            libelle={Translator.get('APPEARANCE')}
            valeur={Translator.get(isDarkMode ? 'DARK_THEME' : 'LIGHT_THEME')}
            onPress={openApparence}
        />
        <RangeeDeReglage
            theme={theme}
            icone={{ mi: 'filter-list' }}
            libelle={Translator.get('FILTERS')}
            valeur={nombreDeFiltres > 0 ? String(nombreDeFiltres) : undefined}
            onPress={openFilters}
        />
    </GroupeDeReglages>
);

/**
 * Les preferences, a l'accueil : une rangee par page, sa valeur a droite quand elle se dit en un mot.
 * Les interrupteurs et les textes d'aide vivent dans les pages.
 */
export const PreferencesSection = ({ theme, valeurNotifications, valeurAgenda, ouvrir }: {
    theme: AppThemeType;
    valeurNotifications: string;
    valeurAgenda: string;
    ouvrir: (page: PageDeReglage) => void;
}) => (
    <GroupeDeReglages theme={theme} titre={Translator.get('PREFERENCES')}>
        <RangeeDeReglage theme={theme} icone="bell-outline" libelle={Translator.get('NOTIFICATIONS')} valeur={valeurNotifications} onPress={() => ouvrir('notifications')} />
        <RangeeDeReglage theme={theme} icone="calendar-sync-outline" libelle={Translator.get('AGENDA_SETTINGS')} valeur={valeurAgenda} onPress={() => ouvrir('agenda')} />
        <RangeeDeReglage theme={theme} icone="shield-check-outline" libelle={Translator.get('PRIVACY_SECTION')} onPress={() => ouvrir('confidentialite')} />
    </GroupeDeReglages>
);

/** Une action qui retire tout : seule en bas, son libelle en rouge, et la confirmation suit (SettingsModals). */
export const ReinitialisationSection = ({ theme, openResetDialog }: { theme: AppThemeType; openResetDialog: () => void }) => (
    <GroupeDeReglages theme={theme}>
        <RangeeDeReglage theme={theme} icone="autorenew" libelle={Translator.get('RESET_APP')} onPress={openResetDialog} destructive />
    </GroupeDeReglages>
);

/** La page Apparence : deux choix coches, comme les reglages d'affichage du systeme. */
export const ApparenceSection = ({ theme, isDarkMode, choisirSombre }: { theme: AppThemeType; isDarkMode: boolean; choisirSombre: (sombre: boolean) => void }) => (
    <GroupeDeReglages theme={theme} filetCourt>
        <RangeeDeReglage theme={theme} libelle={Translator.get('LIGHT_THEME')} coche={!isDarkMode} onPress={() => choisirSombre(false)} />
        <RangeeDeReglage theme={theme} libelle={Translator.get('DARK_THEME')} coche={isDarkMode} onPress={() => choisirSombre(true)} />
    </GroupeDeReglages>
);

/** L'attente avant d'enregistrer un delai : le geste fini, pas chaque pas (la replanification coute). */
const ENREGISTREMENT_MS = 600;
/** La cible d'un bouton de pas : les 44 points des Human Interface Guidelines. */
const BOUTON_DE_PAS = 44;
/** Le rythme d'un appui long sur un bouton de pas. */
const REPETITION_MS = 120;

/** Un bouton de pas, rond, qui repete sous un appui long. */
function BoutonDePas({ theme, icone, desactive, onPas, libelle }: {
    theme: AppThemeType; icone: 'minus' | 'plus'; desactive: boolean; onPas: () => void; libelle: string;
}) {
    const repetition = useRef<ReturnType<typeof setInterval> | null>(null);
    const arreter = () => { if (repetition.current) clearInterval(repetition.current); repetition.current = null; };
    useEffect(() => arreter, []);
    return (
        <Pressable
            onPress={onPas}
            onLongPress={() => { arreter(); repetition.current = setInterval(onPas, REPETITION_MS); }}
            onPressOut={arreter}
            disabled={desactive}
            accessibilityRole="button"
            accessibilityLabel={libelle}
            hitSlop={tokens.space.xs}
            style={({ pressed }) => [styles.boutonDePas, { backgroundColor: pressed ? theme.selection : theme.greyBackground }, desactive && styles.boutonEteint]}
        >
            <Icon icon={{ name: icone }} size={22} color={desactive ? theme.fontTertiary : theme.accent} />
        </Pressable>
    );
}

/**
 * Le delai des rappels en une rangee, « − 15 min + » : la valeur en grand au milieu, un pas de cinq
 * minutes de chaque cote. La valeur suit le doigt ; l'enregistrement attend la fin du geste.
 */
function ReglageDuDelai({ theme, valeur, onChoisir }: { theme: AppThemeType; valeur: number; onChoisir: (minutes: number) => void }) {
    const [affiche, setAffiche] = useState(valeur);
    const enregistrement = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => { setAffiche(valeur); }, [valeur]);
    useEffect(() => () => { if (enregistrement.current) clearTimeout(enregistrement.current); }, []);
    const pas = (sens: -1 | 1) => {
        setAffiche((avant) => {
            const apres = delaiVoisin(avant, sens);
            if (apres !== avant) void Haptics.selectionAsync().catch(() => undefined);
            if (enregistrement.current) clearTimeout(enregistrement.current);
            enregistrement.current = setTimeout(() => onChoisir(apres), ENREGISTREMENT_MS);
            return apres;
        });
    };
    return (
        <View style={styles.delai} accessible={false}>
            <BoutonDePas theme={theme} icone="minus" desactive={affiche <= DELAI.minimum} onPas={() => pas(-1)} libelle={Translator.get('NOTIFICATION_DELAY_LESS')} />
            <Text style={[styles.valeurDuDelai, tokens.texte.chiffres, { color: theme.font }]} accessibilityLiveRegion="polite">
                {Translator.get('NOTIFICATION_DELAY_VALUE', affiche)}
            </Text>
            <BoutonDePas theme={theme} icone="plus" desactive={affiche >= DELAI.maximum} onPas={() => pas(1)} libelle={Translator.get('NOTIFICATION_DELAY_MORE')} />
        </View>
    );
}

interface NotificationsSectionProps {
    theme: AppThemeType;
    courseNotificationsEnabled: boolean;
    toggleCourseNotifications: () => void;
    courseNotificationDelay: number;
    choisirDelai: (minutes: number) => void;
    messagesEnNotification: boolean;
    toggleMessagesEnNotification: () => void;
}

/**
 * La page Notifications : ce qu'il faut savoir en tete (`IntroDePage`), puis chaque interrupteur
 * dans son groupe, et le delai des rappels au pas. Les pieds qui expliquaient chaque interrupteur se
 * lisaient comme une interface generee (review du 2026-11-06) ; l'information reste, en un paragraphe.
 */
export const NotificationsSection = ({ theme, courseNotificationsEnabled, toggleCourseNotifications, courseNotificationDelay, choisirDelai, messagesEnNotification, toggleMessagesEnNotification }: NotificationsSectionProps) => (
    <>
        <IntroDePage theme={theme}>{Translator.get('INTRO_NOTIFICATIONS')}</IntroDePage>
        <GroupeDeReglages theme={theme}>
            <RangeeDeReglage
                theme={theme}
                icone="bullhorn-outline"
                libelle={Translator.get('PUSH_MESSAGES')}
                interrupteur={{ valeur: messagesEnNotification, onChange: toggleMessagesEnNotification }}
            />
        </GroupeDeReglages>
        <GroupeDeReglages theme={theme} titre={Translator.get('COURSE_REMINDERS')}>
            <RangeeDeReglage
                theme={theme}
                icone="bell-outline"
                libelle={Translator.get('COURSE_NOTIFICATIONS')}
                interrupteur={{ valeur: courseNotificationsEnabled, onChange: toggleCourseNotifications }}
            />
        </GroupeDeReglages>
        {courseNotificationsEnabled ? (
            <GroupeDeReglages theme={theme} titre={Translator.get('NOTIFICATION_DELAY')}>
                <ReglageDuDelai theme={theme} valeur={courseNotificationDelay} onChoisir={choisirDelai} />
            </GroupeDeReglages>
        ) : null}
    </>
);

/**
 * La section Confidentialite (7-D) porte son propre etat : le reglage vit dans le module de mesure, et
 * la rangee le lit par son hook. Couper l'interrupteur vide la file locale.
 */
export const ConfidentialiteSection = ({ theme }: { theme: AppThemeType }) => {
    const [active, activer] = useMesureActive();
    return (
        <>
            <IntroDePage theme={theme}>{Translator.get('INTRO_CONFIDENTIALITE')}</IntroDePage>
            <GroupeDeReglages theme={theme}>
                <RangeeDeReglage
                    theme={theme}
                    icone="shield-check-outline"
                    libelle={Translator.get('ANONYMOUS_STATS')}
                    interrupteur={{ valeur: active, onChange: activer }}
                />
            </GroupeDeReglages>
        </>
    );
};

interface CalendarSectionProps {
    theme: AppThemeType;
    hasCalendarPermission: boolean;
    /** Demander l'acces a l'agenda ; refuse pour de bon, le systeme ne redemande plus : ses reglages s'ouvrent. */
    demanderPermission: () => void;
    lastSyncDate: import('moment').Moment | null;
    /** La derniere tentative, reussie ou non ; `null` quand rien n'a jamais ete tente, ou apres effacement. */
    derniereTentative: import('../../../shared/services/calendrier/tentative').TentativeSynchro | null;
    calendarSyncEnabled: boolean;
    toggleCalendarSync: () => void;
    /** Le geste « forcer » vient de l'ecran, qui seul sait dire son issue (toast d'echec). */
    onForceSync: () => void;
    calendarName: string;
    openCalendarDialog: () => void;
    isSynchronizingCalendar: boolean;
    selectedCalendar: string | number;
    /** Combien de calendriers du telephone le Planning affiche ; la rangee pousse l'ecran de choix (6.1.x-D). */
    calendriersAffiches: number;
    openCalendriersAffiches: () => void;
}

/**
 * L'etat de la synchronisation, en tete du groupe. Le point passe en `warning` sur un echec, pas en
 * rouge : la synchronisation reessaie d'elle-meme. Les deux informations ensemble, ce qui a reussi et
 * quand, ce qui a echoue et depuis : l'echec seul se lisait comme « rien ne marche » (6.1.x-B).
 */
function EtatDeLaSynchro({ theme, lastSyncDate, derniereTentative }: Pick<CalendarSectionProps, 'theme' | 'lastSyncDate' | 'derniereTentative'>) {
    const echec = derniereTentative !== null && !derniereTentative.ok;
    return (
        <View style={{ paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <PointDeCouleur couleur={echec ? theme.warning : lastSyncDate ? theme.success : theme.neutral} style={{ marginRight: tokens.space.sm }} />
                {/* `flex: 1` : sans lui, Android coupe net le texte au bord de la rangee (2026-08-31). */}
                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, flex: 1 }}>
                    {lastSyncDate ? `${Translator.get('LAST_SYNCHRONIZATION')} : ${lastSyncDate.format('LLL')}` : Translator.get('NO_SYNCHRONIZATION_DONE')}
                </Text>
            </View>
            {echec && derniereTentative !== null ? (
                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.warning, marginTop: tokens.space.xxs, marginLeft: tokens.space.md }}>
                    {Translator.get('LAST_ATTEMPT_FAILED_AT', moment(derniereTentative.at).fromNow())}
                </Text>
            ) : null}
        </View>
    );
}

export const CalendarSection = (props: CalendarSectionProps) => {
    const { theme, hasCalendarPermission, demanderPermission, calendarSyncEnabled, toggleCalendarSync, onForceSync, calendarName, openCalendarDialog, isSynchronizingCalendar, selectedCalendar, calendriersAffiches, openCalendriersAffiches } = props;
    if (!hasCalendarPermission) {
        return (
            <>
                <IntroDePage theme={theme}>{Translator.get('ENABLE_CALENDAR_PERMISSION_DESCRIPTION')}</IntroDePage>
                <GroupeDeReglages theme={theme} titre={Translator.get('CALENDAR_SYNCHRONIZATION')}>
                    <RangeeDeReglage theme={theme} icone="calendar-lock-open-outline" libelle={Translator.get('CALENDAR_ALLOW')} onPress={demanderPermission} />
                </GroupeDeReglages>
            </>
        );
    }
    return (
        <>
            <IntroDePage theme={theme}>{Translator.get('INTRO_AGENDA')}</IntroDePage>
            <GroupeDeReglages theme={theme} titre={Translator.get('CALENDAR_SYNCHRONIZATION')}>
                <EtatDeLaSynchro theme={theme} lastSyncDate={props.lastSyncDate} derniereTentative={props.derniereTentative} />
                <RangeeDeReglage
                    theme={theme}
                    icone="calendar-sync-outline"
                    libelle={Translator.get('SYNC_ENABLED')}
                    interrupteur={{ valeur: calendarSyncEnabled, onChange: toggleCalendarSync }}
                />
                <RangeeDeReglage theme={theme} icone="calendar-today" libelle={Translator.get('CALENDAR')} valeur={calendarName} onPress={openCalendarDialog} />
                <RangeeDeReglage
                    theme={theme}
                    icone={{ mi: 'sync' }}
                    libelle={isSynchronizingCalendar ? Translator.get('SYNCHRONIZING') : Translator.get('FORCE_SYNC')}
                    onPress={onForceSync}
                    enCours={isSynchronizingCalendar}
                    desactivee={selectedCalendar !== -1 && isSynchronizingCalendar}
                />
                {/* L'autre sens : ce que le Planning lit dans l'agenda (6.1.x-D). */}
                <RangeeDeReglage
                    theme={theme}
                    icone="calendar-multiple"
                    libelle={Translator.get('PHONE_CALENDARS')}
                    valeur={calendriersAffiches > 0 ? Translator.get('PHONE_CALENDARS_COUNT', String(calendriersAffiches)) : Translator.get('PHONE_CALENDARS_NONE')}
                    onPress={openCalendriersAffiches}
                />
            </GroupeDeReglages>
        </>
    );
};

const styles = StyleSheet.create({
    delai: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.md,
    },
    boutonDePas: {
        width: BOUTON_DE_PAS,
        height: BOUTON_DE_PAS,
        borderRadius: BOUTON_DE_PAS / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boutonEteint: {
        opacity: 0.5,
    },
    valeurDuDelai: {
        fontSize: tokens.fontSize.xl,
        fontWeight: tokens.fontWeight.semibold,
    },
});

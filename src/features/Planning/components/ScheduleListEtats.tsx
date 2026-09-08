/**
 * Les bandeaux et les etats plein ecran du planning, sortis de `ScheduleList`.
 *
 * `ScheduleList` est un composant a classe dense qui charge, met en cache, derive et rend ; le
 * jalon 6.1.x-D lui a ajoute la fusion des calendriers du telephone, et il a franchi la limite de
 * 400 lignes. Ce qui vit ici ne porte aucun etat : un bandeau qui dit « ce que tu vois est
 * partiel », et les trois etats — pas de favori, journee libre, chargement — dans l'hote commun
 * des etats plein ecran (shared/ui/ScreenState). Les sortir est le decoupage que la regle prescrit,
 * et il ne change rien au rendu.
 */

import React from 'react';
import { Text, View } from 'react-native';
import moment from 'moment';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ChargementPleinePage } from '../../../shared/ui/ChargementPleinePage';
import { ScreenState } from '../../../shared/ui/ScreenState';

/**
 * L'hote des etats plein ecran du planning.
 *
 * `topOffset={0}` : `DayViewHeader` est rendu **au-dessus** du planning, dans le flux, et non en
 * en-tete transparent. La boite du planning est donc deja la surface libre, et lui appliquer la
 * compensation d'en-tete descendrait le bloc de 130 points (shared/ui/ScreenState).
 */
export function EtatPlanning({ theme, children }: { theme: AppThemeType; children: React.ReactNode }) {
    return (
        <ScreenState theme={theme} background={theme.courseBackground} topOffset={0}>
            {children}
        </ScreenState>
    );
}

/**
 * Un bandeau au-dessus de la liste : la forme que ce depot donne a « ce que tu vois est partiel ».
 *
 * Deux raisons l'affichent, et elles peuvent coexister — une donnee servie depuis le cache, et un
 * groupe favori que le referentiel ne resout plus. Aucune des deux n'est un echec : le planning
 * est la, il lui manque quelque chose, et le taire serait pire que de l'ecrire.
 */
function Notice({ texte, icone, theme }: { texte: string; icone: boolean; theme: AppThemeType }) {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: theme.greyBackground,
            paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm,
            borderRadius: tokens.radius.md, marginBottom: tokens.space.md, marginHorizontal: tokens.space.md
        }}>
            {icone && <MaterialCommunityIcons name="clock-outline" size={14} color={theme.fontSecondary} style={{ marginRight: tokens.space.xs }} />}
            <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, flex: 1 }}>{texte}</Text>
        </View>
    );
}

export function NoticesPlanning({ cacheDate, manquants, mode, theme }: {
    cacheDate: moment.MomentInput | null; manquants: readonly string[]; mode: 'day' | 'week'; theme: AppThemeType;
}) {
    const bandeaux: React.ReactNode[] = [];

    if (cacheDate !== null) {
        bandeaux.push(<Notice key="cache" texte={Translator.get('OFFLINE_DISPLAY_FROM_DATE', moment(cacheDate).format('lll'))} icone={mode === 'week'} theme={theme} />);
    }

    // Un favori perime ne vide plus le planning agrege : les autres sont joues, et celui-la est
    // **nomme**. Un referentiel se perime a chaque rentree, donc ce cas est ordinaire (jalon 6-I).
    if (manquants.length > 0) {
        bandeaux.push(<Notice key="manquants" texte={Translator.get('TIMETABLE_GROUPS_MISSING', manquants.join(', '))} icone={false} theme={theme} />);
    }

    if (bandeaux.length === 0) return null;
    return <View style={{ paddingBottom: tokens.space.sm }}>{bandeaux}</View>;
}

export function FavorisVides({ theme, onChercher }: { theme: AppThemeType; onChercher: () => void }) {
    return (
        <EtatPlanning theme={theme}>
            <EmptyState
                variant="plain"
                icon="star-outline"
                title={Translator.get('FAVORITES_EMPTY_TITLE')}
                message={Translator.get('FAVORITES_EMPTY')}
                theme={theme}
                action={{ label: Translator.get('GROUPS_LIST'), onPress: onChercher, icon: 'magnify' }}
            />
        </EtatPlanning>
    );
}

/** Une journee sans cours : ce n'est ni une panne ni une absence de favori, c'est une journee libre. */
export function JourneeVide({ theme, listHeader }: { theme: AppThemeType; listHeader: React.ReactNode }) {
    return (
        <View style={{ flex: 1 }}>
            {listHeader}
            <EtatPlanning theme={theme}>
                <EmptyState
                    variant="plain"
                    // Des confettis, pas un calendrier vide : une journee libre est une bonne
                    // nouvelle, et c'est l'icone qui sourit — le texte, lui, ne change pas.
                    icon="party-popper"
                    title={Translator.get('NO_CLASS_THIS_DAY_TITLE')}
                    message={Translator.get('NO_CLASS_THIS_DAY')}
                    theme={theme}
                />
            </EtatPlanning>
        </View>
    );
}

export function ChargementPlanning({ theme }: { theme: AppThemeType }) {
    return (
        <ChargementPleinePage
            theme={theme}
            message={Translator.get('LOADING_TIMETABLE')}
            patience={Translator.get('LOADING_PATIENCE_UNIVERSITY')}
            background={theme.courseBackground}
            topOffset={0}
        />
    );
}

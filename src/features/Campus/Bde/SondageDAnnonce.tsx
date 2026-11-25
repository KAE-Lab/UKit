/**
 * Le sondage d'une annonce, sous son recit (phase 8, lot 4 ; docs/phase-8/4-sondages-idees-notation.md).
 *
 * La question, puis les choix en rangees d'une carte, au gabarit des groupes de reglages : un toucher
 * vote. Apres le vote, ou a la cloture, chaque rangee porte sa part et un trait qui la mesure — un repere
 * se dit par un trait et un chiffre, pas par un graphique — et le choix de l'appareil se coche. Un choix
 * sous cinq voix se lit « moins de 5 » ; sous cinq voix en tout, rien ne se montre encore.
 */

import moment from 'moment';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import type { ResultatsDeSondage, Sondage } from '../../../shared/annonces/sondage';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import { Icon } from '../../../shared/ui/Icon';
import { useSondage } from './useSondage';

const TRAIT = 3;
/** Le jour sans l'annee, dans la grammaire de chaque langue : « 28 novembre », « November 28 », « 28 de noviembre ». */
const FORMAT_DU_JOUR = { fr: 'D MMMM', en: 'MMMM D', es: 'D [de] MMMM' } as const;

function Part({ theme, part }: { theme: AppThemeType; part: number | null }) {
    return (
        <Text style={[styles.part, tokens.texte.chiffres, { color: part === null ? theme.fontTertiary : theme.font }]}>
            {part === null ? Translator.get('SONDAGE_MASQUE') : `${part} %`}
        </Text>
    );
}

/** `part` : `undefined` tant qu'aucun resultat ne se montre ; `null` pour une petite case. */
function Rangee({ theme, libelle, premiere, coche, part, apresVote, enCours, onPress }: {
    theme: AppThemeType; libelle: string; premiere: boolean; coche: boolean; part: number | null | undefined; apresVote: boolean; enCours: boolean;
    onPress?: () => void;
}) {
    const montrer = part !== undefined;
    return (
        <Pressable
            onPress={onPress}
            disabled={onPress === undefined}
            accessibilityRole={onPress === undefined ? 'text' : 'button'}
            accessibilityState={{ selected: coche }}
            style={({ pressed }) => [styles.rangee, !premiere && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }, pressed && { backgroundColor: theme.greyBackground }]}
        >
            <View style={styles.ligne}>
                {apresVote ? null : <Icon icon={{ name: 'radiobox-blank' }} size={20} color={theme.fontTertiary} />}
                <Text style={[styles.libelle, { color: theme.font }, coche && { fontWeight: tokens.fontWeight.semibold }]}>{libelle}</Text>
                {enCours ? <ActivityIndicator size="small" color={theme.accent} /> : null}
                {coche ? <Icon icon={{ name: 'check' }} size={18} color={theme.accent} /> : null}
                {montrer ? <Part theme={theme} part={part ?? null} /> : null}
            </View>
            {montrer ? (
                <View style={[styles.rail, { backgroundColor: theme.border }]}>
                    <View style={[styles.trait, { width: `${part ?? 0}%`, backgroundColor: coche ? theme.accent : theme.fontTertiary }]} />
                </View>
            ) : null}
        </Pressable>
    );
}

/** Ce qui se dit sous les choix, une phrase par ligne : la cloture, puis le nombre de voix ou pourquoi rien ne se montre. */
function pied(ouvert: boolean, closLe: number, montrer: boolean, resultats: ResultatsDeSondage | null | undefined): string[] {
    const quand = Translator.get(ouvert ? 'SONDAGE_JUSQU_AU' : 'SONDAGE_CLOS_LE', moment(closLe).format(FORMAT_DU_JOUR[Translator.getLanguage()]));
    if (!montrer || resultats === undefined) return [quand];
    if (resultats === null) return [quand, Translator.get('SONDAGE_RESULTATS_INDISPONIBLES')];
    if (!resultats.assez) return [quand, Translator.get('SONDAGE_PAS_ASSEZ')];
    return resultats.total !== null ? [quand, Translator.get('SONDAGE_VOIX', String(resultats.total))] : [quand];
}

export function SondageDAnnonce({ theme, annonce, sondage }: { theme: AppThemeType; annonce: string; sondage: Sondage }) {
    const s = useSondage(annonce, sondage);
    const montrer = s.choix !== null || !s.ouvert;
    const parts = s.resultats?.assez === true ? s.resultats.parts : null;

    const voter = async (choix: string) => {
        const issue = await s.voter(choix);
        if (issue === 'echec') new ErrorAlert(Translator.get('SONDAGE_ECHEC')).show();
        if (issue === 'clos') new ErrorAlert(Translator.get('SONDAGE_FERME')).show();
        if (issue === 'change') new ErrorAlert(Translator.get('SONDAGE_CHANGE')).show();
    };

    return (
        <View style={styles.bloc}>
            <Text style={[tokens.texte.titreDeCarte, { color: theme.font }]}>{sondage.question}</Text>
            <View style={[styles.carte, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                {sondage.choix.map((c, rang) => (
                    <Rangee
                        key={c.id}
                        theme={theme}
                        libelle={c.libelle}
                        premiere={rang === 0}
                        coche={s.choix === c.id}
                        part={montrer && parts !== null ? parts[c.id] ?? null : undefined}
                        apresVote={montrer}
                        enCours={s.enCours === c.id}
                        onPress={montrer || s.enCours !== null ? undefined : () => { void voter(c.id); }}
                    />
                ))}
            </View>
            {pied(s.ouvert, sondage.closLe, montrer, s.resultats).map((phrase) => (
                <Text key={phrase} style={[styles.pied, { color: theme.fontSecondary }]}>{phrase}</Text>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    bloc: {
        marginTop: tokens.space.xl,
        gap: tokens.space.sm,
    },
    carte: {
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    rangee: {
        minHeight: 48,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        justifyContent: 'center',
        gap: tokens.space.xs,
    },
    ligne: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
    },
    libelle: {
        flex: 1,
        fontSize: tokens.fontSize.md,
    },
    part: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    rail: {
        height: TRAIT,
        borderRadius: TRAIT,
        overflow: 'hidden',
    },
    trait: {
        height: TRAIT,
        borderRadius: TRAIT,
    },
    pied: {
        fontSize: tokens.fontSize.sm,
    },
});

/**
 * La journee en une carte (docs/phase-8/6-intelligence.md), en tete de la frise, le jour meme.
 *
 * **Un instrument, pas un resume ecrit.** L'heure du premier cours en grand et celle de la fin, la
 * journee en jauge — les plages occupees dans la teinte du Planning, le passe estompe, les trous en
 * creux, l'heure d'un trait —, puis le compte des cours et des trous. Dessous, midi :
 * la fenetre du trou et deux restaurants au plus, chacun avec ce qui le fait proposer (la distance au
 * batiment du cours suivant, le creneau de son service ou l'attente signalee, le plat). Puis ce qui a
 * change depuis la derniere lecture. Aucune phrase qui explique, aucun point lumineux : le seul rond est
 * le point de ton de l'attente, celui de la fiche du restaurant.
 *
 * Elle se tait quand elle n'a rien a dire (carteDuJour.ts) ; la surface est celle des cartes de cours.
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import moment from 'moment';

import Translator, { type TranslationKey } from '../../../shared/i18n/Translator';
import { tokens, toneColor, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon } from '../../../shared/ui/Icon';
import { PointDeCouleur } from '../../../shared/ui/PointDeCouleur';
import { useEnfoncement } from '../../../shared/ui/useEnfoncement';
import { formaterDistance } from '../../Campus/services/distance';
import { libelleLisible } from '../../Campus/services/CrousMapping';
import { useOuManger } from '../hooks/useOuManger';
import { avantEcrit, intituleDe, type Changement } from '../services/changements';
import { composerLaCarte, type ModeleDeLaCarte } from '../services/carteDuJour';
import { formaterDuree, formaterHeure } from '../services/frise';
import { RAYON_DE_MIDI_KM, trouDeMidi } from '../services/ouManger';
import type { Suggestion } from '../services/OuMangerService';
import type { PlanningEvent } from '../services/PlanningAssembly';
import { useMinuteDuJour } from './Frise';

const HAUTEUR_DE_JAUGE = 8;
/** Le trait de l'heure deborde la jauge d'un cran de chaque cote : il se lit sans cacher les segments. */
const HAUTEUR_DU_TRAIT = HAUTEUR_DE_JAUGE + tokens.space.sm;
const ICONE = 16;

type Navigation = { navigate: (route: string, params?: object) => void } | undefined;

function plage(debut: number, fin: number): string {
    return `${formaterHeure(debut)}–${formaterHeure(fin)}`;
}

function Jauge({ jauge, minute, theme }: { jauge: NonNullable<ModeleDeLaCarte['jauge']>; minute: number; theme: AppThemeType }) {
    const duree = jauge.fin - jauge.debut;
    const part = (minutes: number) => `${((minutes - jauge.debut) / duree) * 100}%` as const;
    return (
        <View style={styles.zoneDeJauge}>
            <View style={[styles.jauge, { backgroundColor: theme.greyBackground }]}>
                {jauge.segments.map((segment) => (
                    <View
                        key={segment.debut}
                        style={[styles.segment, segment.fin <= minute && styles.passe, {
                            left: part(segment.debut),
                            width: `${((segment.fin - segment.debut) / duree) * 100}%`,
                            backgroundColor: theme.accent,
                            borderRightColor: theme.eventBackground,
                        }]}
                    />
                ))}
            </View>
            {jauge.maintenant !== null ? (
                <View style={[styles.trait, { left: part(jauge.maintenant), backgroundColor: theme.font }]} />
            ) : null}
        </View>
    );
}

function LaJournee({ modele, minute, theme }: { modele: ModeleDeLaCarte; minute: number; theme: AppThemeType }) {
    const jauge = modele.jauge;
    if (jauge === null) return null;
    const cours = Translator.get(modele.nombreDeCours === 1 ? 'AGENDA_UN_COURS' : 'AGENDA_N_COURS', modele.nombreDeCours);
    const trous = modele.trous.length === 0 ? null : modele.trous.length === 1
        ? Translator.get('CARTE_UN_TROU', formaterDuree(modele.dureeDesTrous))
        : Translator.get('CARTE_N_TROUS', modele.trous.length, formaterDuree(modele.dureeDesTrous));
    return (
        <View accessible accessibilityLabel={[Translator.get('CARTE_JOURNEE', formaterHeure(jauge.debut), formaterHeure(jauge.fin)), cours, trous].filter(Boolean).join(', ')}>
            <View style={styles.bornes}>
                <Text style={[tokens.texte.heure, { color: theme.font }]}>{formaterHeure(jauge.debut)}</Text>
                <Text style={[styles.fin, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{formaterHeure(jauge.fin)}</Text>
            </View>
            <Jauge jauge={jauge} minute={minute} theme={theme} />
            <View style={styles.bornes}>
                <Text style={[styles.petit, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{cours}</Text>
                {trous !== null ? <Text style={[styles.petit, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{trous}</Text> : null}
            </View>
        </View>
    );
}

function Proposition({ suggestion, theme, navigation }: { suggestion: Suggestion; theme: AppThemeType; navigation: Navigation }) {
    const { restaurant, attente, plat } = suggestion;
    const distance = formaterDistance(suggestion.distanceKm, Translator.getLanguage());
    const service = plage(suggestion.service.debut, suggestion.service.fin);
    const motDAttente = attente === null ? null : Translator.get(`SIGNAL_RESTAURANT_ATTENTE_${attente.valeur.toUpperCase()}` as TranslationKey);
    const nomDuPlat = plat === null ? null : plat.recommande ? Translator.get('SIGNAL_PLAT_RECOMMANDE', libelleLisible(plat.nom)) : libelleLisible(plat.nom);
    const enfoncement = useEnfoncement();
    return (
        <Pressable
            onPressIn={enfoncement.onPressIn}
            onPressOut={enfoncement.onPressOut}
            onPress={() => navigation?.navigate('CrousMenu', {
                restaurantId: restaurant.id,
                restaurantName: restaurant.title,
                location: { lat: restaurant.lat, lng: restaurant.lon },
                openingLines: restaurant.openingLines,
            })}
            accessibilityRole="button"
            accessibilityLabel={[restaurant.title, distance, motDAttente ?? service, nomDuPlat].filter(Boolean).join(', ')}
        >
            <Reanimated.View style={[styles.proposition, enfoncement.style]}>
                <View style={styles.corps}>
                    <View style={styles.rangee}>
                        <Text numberOfLines={1} style={[styles.nom, { color: theme.font }]}>{restaurant.title}</Text>
                        <Text style={[styles.petit, tokens.texte.chiffres, { color: theme.font }]}>{distance}</Text>
                    </View>
                    <View style={styles.rangee}>
                        <Text numberOfLines={1} style={[styles.plat, { color: theme.fontSecondary }]}>{nomDuPlat ?? ''}</Text>
                        {attente !== null && motDAttente !== null ? (
                            <View style={styles.attente}>
                                <PointDeCouleur couleur={toneColor(theme, attente.ton)} />
                                <Text style={[styles.petit, { color: attente.enRetrait ? theme.fontSecondary : theme.font }]}>{motDAttente}</Text>
                            </View>
                        ) : (
                            <Text style={[styles.petit, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{service}</Text>
                        )}
                    </View>
                </View>
                <Icon icon={{ name: 'chevron-right' }} size={ICONE} color={theme.fontTertiary} />
            </Reanimated.View>
        </Pressable>
    );
}

/** Midi et ses restaurants ; repris tel quel par les creneaux communs avec un ami (docs/phase-8/8-amis.md). */
export function Midi({ fenetre, etat, theme, navigation }: {
    fenetre: { debut: number; fin: number };
    etat: ReturnType<typeof useOuManger>;
    theme: AppThemeType;
    navigation: Navigation;
}) {
    return (
        <View style={[styles.section, { borderTopColor: theme.border }]}>
            <View style={styles.rangee} accessible accessibilityLabel={`${Translator.get('CARTE_MIDI')}, ${plage(fenetre.debut, fenetre.fin)}`}>
                <View style={styles.titreDeSection}>
                    <Icon icon={{ name: 'silverware-fork-knife' }} size={ICONE} color={theme.fontSecondary} />
                    <Text style={[styles.libelle, { color: theme.font }]}>{Translator.get('CARTE_MIDI')}</Text>
                    <Text style={[styles.libelle, tokens.texte.chiffres, { color: theme.font }]}>{plage(fenetre.debut, fenetre.fin)}</Text>
                </View>
                <Text style={[styles.petit, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{formaterDuree(fenetre.fin - fenetre.debut)}</Text>
            </View>
            {etat.etat === 'pret' && etat.suggestions.map((suggestion) => (
                <Proposition key={suggestion.restaurant.id} suggestion={suggestion} theme={theme} navigation={navigation} />
            ))}
            {etat.etat === 'pret' && etat.suggestions.length === 0 ? (
                <Text style={[styles.petit, styles.aucun, { color: theme.fontTertiary }]}>{Translator.get('CARTE_MIDI_AUCUN', RAYON_DE_MIDI_KM)}</Text>
            ) : null}
        </View>
    );
}

/** Ce qui a change, ecrit : la nouvelle valeur d'abord, puis ce qu'elle remplace ; ou « Retire ». */
function detailDuChangement(changement: Changement): string {
    if (changement.genre === 'retire') return Translator.get('CARTE_RETIRE');
    const { cours } = changement;
    const maintenant = [changement.heure ? `${cours.debut}–${cours.fin}` : null, changement.salle ? cours.salle : null].filter(Boolean).join(', ');
    // Une salle retiree sans autre changement n'a pas de valeur nouvelle : seul l'avant se dit.
    return maintenant === '' ? Translator.get('COURS_AVANT', avantEcrit(changement)) : Translator.get('CARTE_CHANGE', maintenant, avantEcrit(changement));
}

/**
 * Une rangee par cours : l'intitule et son heure, puis ce qui a change, au ton d'avertissement. Sur
 * deux lignes : une salle s'ecrit longue (« CREMI - Bat. A28 Salle 204 »), et sur une seule, elle
 * ecrasait l'intitule (banc du 2026-11-25).
 */
function Changements({ changements, theme }: { changements: readonly Changement[]; theme: AppThemeType }) {
    const avertissement = toneColor(theme, 'warning');
    return (
        <View style={[styles.section, { borderTopColor: theme.border }]}>
            {changements.map((changement) => (
                <View
                    key={`${changement.genre}-${changement.cours.id}-${changement.cours.debut}`}
                    style={styles.changement}
                    accessible
                    accessibilityLabel={`${intituleDe(changement.cours)}, ${changement.cours.debut}, ${detailDuChangement(changement)}`}
                >
                    <Icon icon={{ name: changement.genre === 'retire' ? 'calendar-remove-outline' : 'update' }} size={ICONE} color={avertissement} style={styles.iconeDeChangement} />
                    <View style={styles.corps}>
                        <View style={styles.rangee}>
                            <Text numberOfLines={1} style={[styles.sujet, { color: theme.font }]}>{intituleDe(changement.cours)}</Text>
                            <Text style={[styles.petit, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{changement.cours.debut}</Text>
                        </View>
                        <Text numberOfLines={1} style={[styles.petit, tokens.texte.chiffres, { color: avertissement }]}>{detailDuChangement(changement)}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

export interface CarteDuJourProps {
    /** Les elements a heures du jour, cours et evenements, tels que la frise les recoit. */
    horaires: readonly PlanningEvent[];
    changements: readonly Changement[];
    jour: moment.MomentInput;
    theme: AppThemeType;
    navigation?: Navigation;
}

export function CarteDuJour({ horaires, changements, jour, theme, navigation }: CarteDuJourProps) {
    const minute = useMinuteDuJour(jour);
    const midi = useMemo(() => trouDeMidi(horaires), [horaires]);
    const modele = useMemo(() => (minute === null ? null : composerLaCarte(horaires, minute, changements)), [horaires, minute, changements]);
    // Midi ne se dit plus une fois le trou passe : la carte ne parle que de ce qui vient.
    const midiAVenir = midi !== null && minute !== null && minute < midi.fenetre.fin;
    const ouManger = useOuManger(midi, minute, midiAVenir && modele !== null);

    if (modele === null || minute === null) return null;
    return (
        <View style={[styles.carte, { backgroundColor: theme.eventBackground, borderColor: theme.contourDeCarte }]}>
            <LaJournee modele={modele} minute={minute} theme={theme} />
            {midiAVenir && midi !== null ? <Midi fenetre={midi.fenetre} etat={ouManger} theme={theme} navigation={navigation} /> : null}
            {modele.changements.length > 0 ? <Changements changements={modele.changements} theme={theme} /> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    // La surface des cartes de cours (CourseRow) : la carte du jour est un element de la meme frise.
    carte: {
        marginHorizontal: tokens.space.md,
        marginTop: tokens.space.xs,
        marginBottom: tokens.space.sm,
        padding: tokens.space.md,
        gap: tokens.space.sm,
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        ...tokens.shadow.sm,
    },
    bornes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    fin: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.medium,
    },
    zoneDeJauge: {
        height: HAUTEUR_DU_TRAIT,
        justifyContent: 'center',
        marginVertical: tokens.space.xxs,
    },
    jauge: {
        height: HAUTEUR_DE_JAUGE,
        borderRadius: tokens.radius.pill,
        overflow: 'hidden',
    },
    segment: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        // Deux cours qui se suivent restent deux : un filet de la couleur de la carte les separe.
        borderRightWidth: tokens.space.xxs,
    },
    // Un cours passe s'estompe, comme sa carte dans la frise (CourseRow).
    passe: {
        opacity: 0.5,
    },
    trait: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: tokens.space.xxs,
        marginLeft: -tokens.space.xxs / 2,
        borderRadius: tokens.radius.pill,
    },
    petit: {
        fontSize: tokens.fontSize.sm,
    },
    section: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: tokens.space.sm,
        gap: tokens.space.sm,
    },
    rangee: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: tokens.space.sm,
    },
    titreDeSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
        flexShrink: 1,
    },
    libelle: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    sujet: {
        flexShrink: 1,
        fontSize: tokens.fontSize.md,
    },
    proposition: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
        minHeight: 44,
        paddingLeft: ICONE + tokens.space.sm,
    },
    corps: {
        flex: 1,
        gap: tokens.space.xxs,
    },
    nom: {
        flexShrink: 1,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.medium,
    },
    plat: {
        flexShrink: 1,
        fontSize: tokens.fontSize.sm,
    },
    attente: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.xs,
    },
    changement: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: tokens.space.sm,
    },
    // L'icone s'aligne sur la premiere ligne, celle de l'intitule.
    iconeDeChangement: {
        marginTop: tokens.space.xxs,
    },
    aucun: {
        paddingLeft: ICONE + tokens.space.sm,
    },
});

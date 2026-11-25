/**
 * La section « Sur place » d'une fiche de lieu (docs/phase-8/2-signalements.md) : ce que les etudiants
 * et l'equipe disent du lieu aujourd'hui, et le geste de signaler. La grammaire est celle des horaires
 * d'une fiche, juste a cote : l'intertitre commun, puis une carte, un filet entre deux rangees.
 *
 * Une ligne d'etat se dit comme le plan l'ecrit — « Ferme aujourd'hui », puis « selon 4 etudiants, il y a
 * 20 min » —, avec le point de son ton, la seule forme ronde permise (theme.md). Une seule voix,
 * l'incertain et le non verifie se lisent en retrait : le texte passe au gris, le point reste.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { sujetDeLieu, sujetsDuDomaine, type DomaineDeLieu } from '../../../shared/communaute/vocabulaire';
import Translator from '../../../shared/i18n/Translator';
import { tokens, toneColor, toneSoftColor, type AppThemeType, type SemanticTone } from '../../../shared/theme/Theme';
import { ApparitionEnFondu } from '../../../shared/ui/ApparitionEnFondu';
import { Dialogue } from '../../../shared/ui/Dialogue';
import { Icon } from '../../../shared/ui/Icon';
import { PointDeCouleur } from '../../../shared/ui/PointDeCouleur';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { FeuilleDeSignalement, type HorairesASaisir } from './FeuilleDeSignalement';
import { sansInfoDepuis, valeurContraire, type LigneSurPlace } from './presentation';
import { detailDeCorrection, duree, ilYA, libelleDeValeur, sousTitre } from './textes';
import type { SurPlace } from './useSurPlace';

export interface SectionSurPlaceProps {
    theme: AppThemeType;
    surPlace: SurPlace;
    domaine: DomaineDeLieu;
    /** Aux heures du service, a proximite : « Ça attend ? » en tete (service.ts). Restaurants seulement. */
    questionDAttente?: boolean;
    /** Les horaires que la fiche affiche, et les services a corriger ; `null` : la correction ne s'offre pas. */
    horaires: HorairesASaisir | null;
    /** Les plats du menu du jour, pour la recommandation ; `null` ou vide : elle ne s'offre pas. */
    plats?: readonly string[] | null;
    ouvrirLesRegles: () => void;
    /** Le retrait lateral de l'intertitre et de la carte : celui de la fiche hote. */
    retrait: number;
    style?: StyleProp<ViewStyle>;
}

/** Une option en ligne : un ton, un mot ; choisie, elle prend le fond de son ton. 36 de haut, 44 au doigt. */
function Choix({ theme, libelle, ton, choisi, onPress, desactive }: {
    theme: AppThemeType; libelle: string; ton?: SemanticTone; choisi?: boolean; onPress: () => void; desactive?: boolean;
}) {
    const teinte = ton === undefined ? theme.accent : toneColor(theme, ton);
    return (
        <Pressable
            onPress={onPress}
            disabled={desactive}
            hitSlop={tokens.space.xs}
            accessibilityRole="button"
            accessibilityState={{ selected: choisi === true, disabled: desactive === true }}
            style={({ pressed }) => [styles.choix, {
                backgroundColor: choisi === true && ton !== undefined && ton !== 'neutral' ? toneSoftColor(theme, ton) : theme.greyBackground,
                borderColor: choisi === true ? teinte : theme.greyBackground,
                opacity: pressed || desactive === true ? 0.6 : 1,
            }]}
        >
            {ton !== undefined ? <PointDeCouleur couleur={teinte} /> : null}
            <Text numberOfLines={1} style={[styles.libelleDeChoix, { color: ton === undefined ? teinte : theme.font }]}>{libelle}</Text>
        </Pressable>
    );
}

function Filet({ theme }: { theme: AppThemeType }) {
    return <View style={[styles.filet, { backgroundColor: theme.border }]} />;
}

function LigneDEtat({ theme, ligne, instant, surPlace, empreinte }: {
    theme: AppThemeType; ligne: LigneSurPlace; instant: number; surPlace: SurPlace; empreinte: string | null;
}) {
    const retrait = ligne.enRetrait;
    const contraire = valeurContraire(ligne, empreinte);
    const detail = ligne.sujet.sujet.endsWith('.horaires') ? detailDeCorrection(ligne.valeur) : '';
    const repondre = (valeur: string) => {
        void surPlace.contribuer(ligne.sujet.sujet, valeur, ligne.sujet.famille === 'date' ? ligne.fin : null);
    };
    return (
        <View style={styles.ligne}>
            <PointDeCouleur couleur={ligne.source === 'non_verifie' ? theme.fontTertiary : toneColor(theme, ligne.ton)} style={styles.point} />
            <View style={styles.corps}>
                <Text style={[tokens.texte.titreDeCarte, { color: retrait ? theme.fontSecondary : theme.font }]}>
                    {libelleDeValeur(ligne.sujet, ligne.valeur, ligne.fin)}
                </Text>
                {detail !== '' ? <Text style={[styles.sous, tokens.texte.chiffres, { color: retrait ? theme.fontSecondary : theme.font }]}>{detail}</Text> : null}
                <Text style={[styles.sous, { color: ligne.source === 'non_verifie' ? theme.fontTertiary : theme.fontSecondary }]}>{sousTitre(ligne, instant)}</Text>
                {ligne.aConfirmer ? (
                    <View style={styles.question}>
                        <Text style={[styles.libelleDeQuestion, { color: theme.font }]}>{Translator.get('SIGNAL_TOUJOURS_VRAI')}</Text>
                        <Choix theme={theme} libelle={Translator.get('YES')} onPress={() => repondre(ligne.valeur)} desactive={surPlace.envoiEnCours} />
                        {contraire !== null ? (
                            <Choix theme={theme} libelle={Translator.get('NO')} onPress={() => repondre(contraire)} desactive={surPlace.envoiEnCours} />
                        ) : null}
                    </View>
                ) : null}
            </View>
        </View>
    );
}

/** « Ça attend ? » : les trois niveaux, chacun avec son mot et sa couleur ; celui de la communaute choisi. */
function RangeeDAttente({ theme, surPlace }: { theme: AppThemeType; surPlace: SurPlace }) {
    const sujet = sujetDeLieu('restaurant.attente');
    const etat = surPlace.etats.find((e) => e.sujet.sujet === 'restaurant.attente');
    if (sujet === undefined || sujet.valeurs === null) return null;
    const ligne = surPlace.lignes.find((l) => l.sujet.sujet === 'restaurant.attente');
    const passe = sansInfoDepuis(etat);
    const sous = ligne !== undefined ? sousTitre(ligne, surPlace.instant) : passe !== null ? Translator.get('SIGNAL_PAS_D_INFO', duree(passe, surPlace.instant)) : null;
    return (
        <View style={styles.rangee}>
            <Text style={[tokens.texte.titreDeCarte, { color: theme.font }]}>{Translator.get('SIGNAL_CA_ATTEND')}</Text>
            {sous !== null ? <Text style={[styles.sous, { color: theme.fontSecondary }]}>{sous}</Text> : null}
            <View style={styles.niveaux}>
                {sujet.valeurs.map((valeur) => (
                    <Choix
                        key={valeur}
                        theme={theme}
                        libelle={libelleDeValeur(sujet, valeur)}
                        ton={valeur === 'fluide' ? 'success' : valeur === 'attente' ? 'warning' : 'danger'}
                        choisi={ligne?.valeur === valeur}
                        desactive={surPlace.envoiEnCours}
                        onPress={() => { void surPlace.contribuer(sujet.sujet, valeur); }}
                    />
                ))}
            </View>
        </View>
    );
}

export function SectionSurPlace({ theme, surPlace, domaine, questionDAttente = false, horaires, plats = null, ouvrirLesRegles, retrait, style }: SectionSurPlaceProps) {
    const [feuille, setFeuille] = useState(false);
    const lignes = questionDAttente ? surPlace.lignes.filter((l) => l.sujet.sujet !== 'restaurant.attente') : surPlace.lignes;
    const rangees: React.ReactNode[] = [];
    if (questionDAttente) rangees.push(<RangeeDAttente key="attente" theme={theme} surPlace={surPlace} />);
    for (const ligne of lignes) {
        rangees.push(<LigneDEtat key={ligne.sujet.sujet} theme={theme} ligne={ligne} instant={surPlace.instant} surPlace={surPlace} empreinte={horaires?.empreinte ?? null} />);
    }
    if (surPlace.plat !== null) {
        rangees.push(
            <View key="plat" style={styles.ligne}>
                <PointDeCouleur couleur={theme.fontTertiary} style={styles.point} />
                <View style={styles.corps}>
                    <Text style={[tokens.texte.titreDeCarte, { color: theme.font }]}>{Translator.get('SIGNAL_PLAT_RECOMMANDE', surPlace.plat.valeur)}</Text>
                    <Text style={[styles.sous, { color: theme.fontSecondary }]}>
                        {surPlace.plat.voix <= 1
                            ? Translator.get('SIGNAL_SELON_UN', ilYA(surPlace.plat.recent, surPlace.instant))
                            : Translator.get('SIGNAL_SELON', String(surPlace.plat.voix), ilYA(surPlace.plat.recent, surPlace.instant))}
                    </Text>
                </View>
            </View>,
        );
    }

    const sujets = sujetsDuDomaine(domaine).filter((s) => {
        if (s.sujet.endsWith('.horaires')) return horaires !== null;
        if (s.sujet === 'restaurant.plat') return plats !== null && plats.length > 0;
        return true;
    });

    return (
        <View style={style}>
            <SectionHeader title={Translator.get('SUR_PLACE')} theme={theme} style={{ paddingHorizontal: retrait }} />
            <View style={[styles.carte, { marginHorizontal: retrait, backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
                {rangees.map((rangee, index) => (
                    <View key={index}>
                        {index > 0 ? <Filet theme={theme} /> : null}
                        {/* Ce qui arrive apres la lecture entre en fondu, sans repousser d'un coup ce qui suit. */}
                        <ApparitionEnFondu>{rangee}</ApparitionEnFondu>
                    </View>
                ))}
                {rangees.length > 0 ? <Filet theme={theme} /> : null}
                <Pressable
                    onPress={() => setFeuille(true)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.signaler, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <Icon icon={{ name: 'flag-outline' }} size={20} color={theme.accent} />
                    <Text style={[styles.libelleSignaler, { color: theme.accent }]}>{Translator.get('SIGNALER')}</Text>
                    <Icon icon={{ name: 'chevron-right' }} size={20} color={theme.fontTertiary} />
                </Pressable>
            </View>

            <FeuilleDeSignalement
                theme={theme}
                visible={feuille}
                fermer={() => setFeuille(false)}
                sujets={sujets}
                horaires={horaires}
                plats={plats ?? []}
                surPlace={surPlace}
                ouvrirLesRegles={ouvrirLesRegles}
            />

            {/* Un geste de la carte (« Ça attend ? », « toujours vrai ? ») a la premiere contribution : le
                rappel des regles, une fois, d'un toucher. Depuis la feuille, c'est elle qui le montre. */}
            <Dialogue
                theme={theme}
                visible={surPlace.reglesARappeler && !feuille}
                fermer={surPlace.renoncer}
                titre={Translator.get('REGLES_TITRE')}
                corps={Translator.get('REGLES_CORPS')}
                action={{ libelle: Translator.get('REGLES_COMPRIS'), onPress: () => { void surPlace.confirmerLesRegles(); } }}
                lien={{ libelle: Translator.get('REGLES_LIRE'), onPress: () => { surPlace.renoncer(); ouvrirLesRegles(); } }}
                libelleFermer={Translator.get('CANCEL')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    carte: {
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    filet: {
        height: StyleSheet.hairlineWidth,
        marginLeft: tokens.space.md,
    },
    ligne: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: tokens.space.sm + tokens.space.xs,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm + tokens.space.xs,
    },
    // Le point s'aligne sur la premiere ligne du titre, dont il dit le ton.
    point: {
        marginTop: tokens.space.xs + tokens.space.xxs,
    },
    corps: {
        flex: 1,
        gap: tokens.space.xxs,
    },
    sous: {
        fontSize: tokens.fontSize.sm,
    },
    question: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: tokens.space.sm,
        marginTop: tokens.space.sm,
    },
    libelleDeQuestion: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
        marginRight: tokens.space.xs,
    },
    rangee: {
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm + tokens.space.xs,
        gap: tokens.space.xxs,
    },
    niveaux: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: tokens.space.sm,
        marginTop: tokens.space.sm,
    },
    choix: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.xs + tokens.space.xxs,
        minHeight: 36,
        paddingHorizontal: tokens.space.sm + tokens.space.xs,
        borderRadius: tokens.radius.md,
        borderWidth: 1.5,
    },
    libelleDeChoix: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
    },
    signaler: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
        minHeight: 48,
        paddingHorizontal: tokens.space.md,
    },
    libelleSignaler: {
        flex: 1,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
});

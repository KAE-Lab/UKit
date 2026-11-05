/**
 * La carte d'un cours : un creneau de la journee (jalon 7-J, 2026-11-05).
 *
 * **Ce qu'on cherche d'abord est en haut.** L'heure, en chiffres tabulaires, dans sa colonne ; puis le
 * titre ; puis la **salle**, au poids du texte principal. Le reste suit par importance (enseignant,
 * groupe, code d'UE) dans le gris secondaire. Avant la refonte, la salle tombait en quatrieme ligne
 * sur six, au meme poids que le code d'UE ; les semaines du cours, qu'on ne consulte que dans la
 * fiche, y restent seules ; et une ligne que la source sert deux fois ne s'affiche qu'une
 * (`lignesDuCreneau`).
 *
 * **Le rail dit l'etat.** La couleur du cours borde la carte a gauche, comme avant ; pendant le cours,
 * le rail se remplit de haut en bas avec le temps ecoule, et le temps qui reste s'ecrit sous l'heure
 * de fin. Un cours passe s'efface a moitie : on le lit encore, il ne retient plus le regard. La carte
 * tire son etat de ses propres heures (`etatDuCours`), aujourd'hui seulement ; hors vue jour, elle est
 * toujours « a venir ».
 *
 * **Le carrousel des cours superposes** garde ses trois formes essayees puis defaites : en carrousel,
 * le titre et chaque ligne tiennent sur une ligne, la derniere laisse le coin bas droit a l'indicateur
 * de pages, et la carte s'etire a la hauteur de la rangee.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import Reanimated from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { useEnfoncement } from '../../../shared/ui/useEnfoncement';
import { CourseData } from './CourseCard';
import { lignesDuCreneau, type LigneDeCreneau } from './CourseAnnotations';
import { CalendarNewEventPrompt } from './CalendarNewEventPrompt';
import { couleurDeCours, encreDeCours } from '../services/couleurDeCours';
import { etatDuCours, formaterDuree, minutesDe } from '../services/frise';
import { Icon } from '../../../shared/ui/Icon';

/**
 * La place laissee a l'indicateur de pages du carrousel par la derniere ligne d'infos.
 *
 * L'indicateur (CourseGroupCarousel) est pose en absolu dans le coin bas droit, a hauteur de la
 * derniere ligne. Celle-ci se tronque donc avant de passer dessous — la suite se lit dans le
 * detail du cours. La reserve couvre jusqu'a cinq cours superposes ; un spacer sous le contenu a
 * ete essaye et defait : il rendait les cartes du carrousel plus hautes que les cartes seules.
 */
const RESERVE_INDICATEUR = 72;

/** La largeur du rail de couleur, a gauche de la carte. */
const RAIL = 4;
/** La taille des icones des lignes d'infos : celle du corps de la ligne. */
const ICONE_LIGNE = 15;

export interface CourseRowProps {
    data: CourseData;
    theme: AppThemeType;
    navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
    carouselMode?: boolean;
    /**
     * L'heure du jour affiche, en minutes depuis minuit, quand ce jour est aujourd'hui (frise.ts) :
     * la carte en tire son etat, a ses propres heures. Absente — un autre jour, la vue semaine — la
     * carte est « a venir ».
     */
    minute?: number | null;
}

/** Le rail de couleur : plein, ou qui se remplit avec le temps ecoule d'un cours en cours. */
function Rail({ couleur, progression }: { couleur: string; progression: number | null }) {
    if (progression === null) {
        return <View style={[styles.rail, { backgroundColor: couleur }]} />;
    }
    return (
        <View style={[styles.rail, { backgroundColor: `${couleur}4D` }]}>
            <View style={{ height: `${Math.round(Math.min(1, Math.max(0, progression)) * 100)}%`, backgroundColor: couleur }} />
        </View>
    );
}

function LigneDInfo({ ligne, theme, couleur, uneLigne, cedeALIndicateur }: {
    ligne: LigneDeCreneau | { texte: string; icone: 'code' };
    theme: AppThemeType;
    couleur: string;
    uneLigne: boolean;
    cedeALIndicateur: boolean;
}) {
    const salle = ligne.icone === 'room';
    const tertiaire = ligne.icone === 'code';
    return (
        <View style={[styles.ligne, cedeALIndicateur && { marginRight: RESERVE_INDICATEUR }]}>
            <Icon
                icon={{ family: 'material', name: ligne.icone }}
                size={ICONE_LIGNE}
                color={salle ? couleur : theme.fontTertiary}
                style={styles.iconeLigne}
            />
            <Text
                numberOfLines={uneLigne ? 1 : undefined}
                style={[
                    styles.texteLigne,
                    salle ? styles.texteSalle : null,
                    { color: salle ? theme.font : tertiaire ? theme.fontTertiary : theme.fontSecondary },
                ]}
            >
                {ligne.texte}
            </Text>
        </View>
    );
}

/** La colonne des heures : le debut en grand, la fin, et pendant le cours le temps qui reste. */
/**
 * La place du texte de la gouttiere a la taille par defaut. Elle grandit avec la police du systeme :
 * fixe, a 1,3 sur 360 points (A8), « 09:30 » se cassait en « 09:3 » / « 0 » (7-J). La frise s'aligne
 * sur le rail, pas sur la gouttiere : elle ne bouge pas.
 */
const TEXTE_DES_HEURES = 56;

function ColonneDesHeures({ data, theme, resteMinutes }: { data: CourseData; theme: AppThemeType; resteMinutes: number | null }) {
    const { fontScale } = useWindowDimensions();
    const largeur = tokens.space.md - RAIL + Math.ceil(TEXTE_DES_HEURES * Math.max(1, fontScale));
    return (
        <View style={[styles.heures, { width: largeur }]}>
            <Text numberOfLines={1} style={[tokens.texte.heure, { color: theme.font }]}>{data.starttime}</Text>
            {/* Une heure de fin que la source n'a pas su ecrire (« Invalid date ») ne s'affiche pas :
                la carte dit ce qu'elle sait (defauts-fonctionnels.md). */}
            {minutesDe(data.endtime) !== null ? (
                <Text style={[styles.heureDeFin, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{data.endtime}</Text>
            ) : null}
            {resteMinutes !== null ? (
                <View style={styles.reste}>
                    <Icon icon={{ name: 'timer-sand' }} size={12} color={theme.accent} />
                    <Text style={[styles.texteReste, tokens.texte.chiffres, { color: theme.accent }]}>
                        {formaterDuree(resteMinutes)}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

/** Le titre et le badge du type ; en carrousel, le titre tient sur une ligne. */
function RangeeDuTitre({ data, theme, encre, unSeulRang }: { data: CourseData; theme: AppThemeType; encre: string; unSeulRang: boolean }) {
    const badge = data.category !== '' && data.category !== data.subject;
    return (
        <View style={styles.rangeeDuTitre}>
            {data.subject !== 'N/C' ? (
                <Text
                    // En carrousel le titre tient sur **une** ligne : c'est lui qui creusait les ecarts
                    // de hauteur entre cours superposes, et la fiche porte l'intitule entier.
                    numberOfLines={unSeulRang ? 1 : undefined}
                    style={[tokens.texte.titreDeCarte, styles.titre, { color: theme.font }]}
                >
                    {data.subject.trim()}
                </Text>
            ) : <View style={styles.titre} />}
            {badge ? (
                <View style={[styles.badge, { backgroundColor: `${encre}1F` }]}>
                    <Text style={[styles.texteBadge, { color: encre }]}>{data.category}</Text>
                </View>
            ) : null}
        </View>
    );
}

export function CourseRow({ data, theme, navigation, carouselMode = false, minute = null }: CourseRowProps) {
    const [popupVisible, setPopupVisible] = useState(false);
    const enfoncement = useEnfoncement();

    if (data.category === 'masked') return null;

    const couleur = couleurDeCours(theme.courses, data.color);
    // La teinte du cours borde et teinte ; quand elle ecrit (le badge, l'icone de la salle), c'est
    // son encre, lisible sur la carte quel que soit le cours.
    const encre = encreDeCours(couleur, theme.eventBackground);
    // Les semaines du cours ne se lisent que dans la fiche : sur la carte, elles ne disaient rien de
    // la journee affichee.
    const lignes: (LigneDeCreneau | { texte: string; icone: 'code' })[] = lignesDuCreneau(data.description, data.lieu)
        .filter((ligne) => ligne.icone !== 'date-range');
    if (data.UE) lignes.push({ texte: data.UE, icone: 'code' });

    const { etat, progression, resteMinutes } = etatDuCours(data, minute);
    const enCours = etat === 'en-cours';
    const duTelephone = data.source === 'telephone';
    const salle = lignes.find((ligne) => ligne.icone === 'room')?.texte;

    const ouvrir = () => {
        if (!navigation) return;
        requestAnimationFrame(() => navigation.navigate('Course', { data }));
    };

    const carte = (
        <Reanimated.View
            style={[
                styles.carte,
                {
                    backgroundColor: theme.eventBackground,
                    borderColor: theme.contourDeCarte,
                },
                carouselMode && styles.etiree,
                etat === 'passe' && styles.passe,
                enfoncement.style,
            ]}
            // Un cours passe s'efface d'un bloc : sans composition hors ecran, Android applique
            // l'opacite a chaque vue, et le fond transparaitrait sous le texte.
            needsOffscreenAlphaCompositing={etat === 'passe'}
        >
            <Rail couleur={couleur} progression={enCours ? progression : null} />

            <ColonneDesHeures data={data} theme={theme} resteMinutes={enCours ? resteMinutes : null} />

            <View style={[styles.contenu, carouselMode && styles.etiree]}>
                <RangeeDuTitre data={data} theme={theme} encre={encre} unSeulRang={carouselMode} />

                {lignes.map((ligne, index) => (
                    <LigneDInfo
                        key={`${ligne.icone}-${ligne.texte}`}
                        ligne={ligne}
                        theme={theme}
                        couleur={encre}
                        uneLigne={carouselMode}
                        cedeALIndicateur={carouselMode && index === lignes.length - 1}
                    />
                ))}
            </View>
        </Reanimated.View>
    );

    return (
        // La chaine de `flex: 1` ne vit qu'en carrousel : elle porte l'etirement de la carte jusqu'a
        // la racine de la page. Hors carrousel, rien ne change.
        <View style={carouselMode ? styles.etiree : undefined}>
            <Pressable
                style={carouselMode ? styles.etiree : undefined}
                onPress={ouvrir}
                onPressIn={enfoncement.onPressIn}
                onPressOut={enfoncement.onPressOut}
                // Un evenement qui vient du calendrier ne s'y ajoute pas : pas d'appui long dessus (6.1.x-D).
                onLongPress={duTelephone ? undefined : () => setPopupVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={[data.subject, `${data.starttime} – ${data.endtime}`, salle].filter(Boolean).join(', ')}
            >
                {carte}
            </Pressable>
            {!duTelephone && (
                <CalendarNewEventPrompt
                    popupVisible={popupVisible}
                    closePopup={() => setPopupVisible(false)}
                    openPopup={() => setPopupVisible(true)}
                    theme={theme}
                    data={data}
                />
            )}
        </View>
    );
}

export function CourseRowWithNavigation(props: Omit<CourseRowProps, 'navigation'>) {
    const navigation = useNavigation();
    return <CourseRow {...props} navigation={navigation as CourseRowProps['navigation']} />;
}

const styles = StyleSheet.create({
    carte: {
        flexDirection: 'row',
        // Les marges de page de l'application (`md`), comme le titre et le ruban au-dessus : la carte
        // et l'en-tete partagent un bord gauche. Elles valaient `sm` jusqu'en 7-J.
        marginHorizontal: tokens.space.md,
        marginVertical: tokens.space.xs,
        minHeight: 96,
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        ...tokens.shadow.sm,
    },
    etiree: {
        flex: 1,
    },
    passe: {
        opacity: 0.5,
    },
    rail: {
        width: RAIL,
        alignSelf: 'stretch',
        overflow: 'hidden',
    },
    heures: {
        paddingLeft: tokens.space.md - RAIL,
        paddingVertical: tokens.space.md,
    },
    heureDeFin: {
        fontSize: tokens.fontSize.sm,
        marginTop: tokens.space.xxs,
    },
    reste: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: tokens.space.sm,
        gap: tokens.space.xxs,
    },
    texteReste: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
    },
    contenu: {
        flex: 1,
        paddingVertical: tokens.space.md,
        paddingRight: tokens.space.md,
    },
    rangeeDuTitre: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: tokens.space.xs,
        gap: tokens.space.sm,
    },
    titre: {
        flex: 1,
    },
    badge: {
        borderRadius: tokens.radius.md,
        paddingHorizontal: tokens.space.sm,
        paddingVertical: tokens.space.xxs,
    },
    texteBadge: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
    },
    ligne: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: tokens.space.xs,
    },
    iconeLigne: {
        marginRight: tokens.space.xs,
        marginTop: tokens.space.xxs,
    },
    texteLigne: {
        flex: 1,
        fontSize: tokens.fontSize.sm,
    },
    texteSalle: {
        fontWeight: tokens.fontWeight.semibold,
    },
});

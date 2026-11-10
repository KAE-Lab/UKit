/**
 * Le haut de la fiche d'un cours (jalon 7-J) : ce que la carte de la journee annonce, en grand.
 *
 * Le type et le titre, puis **l'heure** — le debut et la fin en chiffres tabulaires, et la duree — puis
 * les lignes du cours, rangees comme sur la carte : la salle d'abord, au poids du texte principal, et
 * une ligne servie deux fois par la source une seule fois (`lignesDuCreneau`). La fiche garde ce que la
 * carte laisse de cote, les semaines du cours. La couleur du cours ecrit par son encre.
 *
 * La fiche avait un filet de couleur de cinq points sur son bord haut, l'heure en couleur sous le titre,
 * et toutes ses lignes au meme poids gris.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { CourseData } from './CourseCard';
import { lignesDuCreneau, type LigneDeCreneau } from './CourseAnnotations';
import { formaterDuree, minutesDe } from '../services/frise';
import { phraseDuCompte } from '../services/seancesRestantes';
import { useSeancesRestantes } from '../hooks/useSeancesRestantes';
import { Icon } from '../../../shared/ui/Icon';

type LigneDeFiche = LigneDeCreneau | { texte: string; icone: 'code' | 'repeat' };

function Ligne({ ligne, theme, encre }: { ligne: LigneDeFiche; theme: AppThemeType; encre: string }) {
    const salle = ligne.icone === 'room';
    return (
        <View style={styles.ligne}>
            <Icon icon={{ family: 'material', name: ligne.icone }} size={18} color={salle ? encre : theme.fontTertiary} style={styles.iconeLigne} />
            <Text style={[styles.texteLigne, { color: salle ? theme.font : theme.fontSecondary }, salle && styles.texteSalle]}>
                {ligne.texte}
            </Text>
        </View>
    );
}

function Horaire({ data, theme }: { data: CourseData; theme: AppThemeType }) {
    if (data.journeeEntiere) {
        return (
            <View style={styles.horaire}>
                <Icon icon={{ name: 'calendar-blank' }} size={20} color={theme.fontSecondary} />
                <Text style={[styles.heure, { color: theme.font }]}>{Translator.get('ALL_DAY')}</Text>
            </View>
        );
    }
    const debut = minutesDe(data.starttime);
    const fin = minutesDe(data.endtime);
    return (
        <View style={styles.horaire}>
            <Text style={[styles.heure, tokens.texte.chiffres, { color: theme.font }]}>{data.starttime}</Text>
            {fin !== null ? (
                <>
                    <Icon icon={{ name: 'arrow-right' }} size={18} color={theme.fontTertiary} />
                    <Text style={[styles.heure, tokens.texte.chiffres, { color: theme.font }]}>{data.endtime}</Text>
                </>
            ) : null}
            {debut !== null && fin !== null && fin > debut ? (
                <Text style={[styles.duree, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{formaterDuree(fin - debut)}</Text>
            ) : null}
        </View>
    );
}

/**
 * Les seances restantes du meme enseignement, sous le code d'UE : une ligne de plus, au poids des
 * autres, ou rien quand le compte n'est pas sur (useSeancesRestantes).
 */
function LigneSeancesRestantes({ data, theme, encre }: { data: CourseData; theme: AppThemeType; encre: string }) {
    const restantes = useSeancesRestantes(data);
    if (restantes === null) return null;
    const { cle, args } = phraseDuCompte(restantes, data.category);
    return <Ligne ligne={{ texte: Translator.get(cle, ...args), icone: 'repeat' }} theme={theme} encre={encre} />;
}

export interface FicheDuCoursProps {
    data: CourseData;
    theme: AppThemeType;
    /** La teinte du cours et son encre lisible sur la carte (couleurDeCours.ts). */
    couleur: string;
    encre: string;
    /** Les gestes d'un evenement du telephone, poses sous les lignes. */
    actions?: React.ReactNode;
}

export function FicheDuCours({ data, theme, couleur, encre, actions }: FicheDuCoursProps) {
    const lignes: LigneDeFiche[] = lignesDuCreneau(data.description, data.lieu);
    if (data.UE) lignes.push({ texte: data.UE, icone: 'code' });
    const badge = data.category !== '' && data.category !== data.subject;

    return (
        <View style={[styles.carte, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
            <View style={[styles.rail, { backgroundColor: couleur }]} />
            {badge ? (
                <View style={[styles.badge, { backgroundColor: `${encre}1F` }]}>
                    <Text style={[styles.texteBadge, { color: encre }]}>{data.category}</Text>
                </View>
            ) : null}
            <Text style={[tokens.texte.titreDeSection, { color: theme.font }]}>
                {data.subject !== 'N/C' ? data.subject.trim() : Translator.get('UNKNOWN_SUBJECT')}
            </Text>
            <Horaire data={data} theme={theme} />
            <View style={[styles.filet, { backgroundColor: theme.border }]} />
            {lignes.map((ligne) => <Ligne key={`${ligne.icone}-${ligne.texte}`} ligne={ligne} theme={theme} encre={encre} />)}
            <LigneSeancesRestantes data={data} theme={theme} encre={encre} />
            {actions}
        </View>
    );
}

const styles = StyleSheet.create({
    carte: {
        marginHorizontal: tokens.space.md,
        marginTop: tokens.space.md,
        padding: tokens.space.lg,
        paddingLeft: tokens.space.lg + 4,
        borderRadius: tokens.radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        ...tokens.shadow.md,
    },
    // Le rail de la couleur du cours, comme sur la carte de la journee.
    rail: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
    badge: {
        alignSelf: 'flex-start',
        borderRadius: tokens.radius.md,
        paddingHorizontal: tokens.space.sm,
        paddingVertical: tokens.space.xxs,
        marginBottom: tokens.space.sm,
    },
    texteBadge: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
    },
    horaire: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
        marginTop: tokens.space.md,
    },
    heure: {
        fontSize: tokens.fontSize.xl,
        fontWeight: tokens.fontWeight.semibold,
        letterSpacing: -0.3,
    },
    duree: {
        marginLeft: 'auto',
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.medium,
    },
    filet: {
        height: StyleSheet.hairlineWidth,
        marginVertical: tokens.space.md,
    },
    ligne: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: tokens.space.sm,
    },
    iconeLigne: {
        marginRight: tokens.space.md,
    },
    texteLigne: {
        flex: 1,
        fontSize: tokens.fontSize.md,
    },
    texteSalle: {
        fontWeight: tokens.fontWeight.semibold,
    },
});

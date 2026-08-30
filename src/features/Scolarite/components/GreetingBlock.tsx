/**
 * La salutation : une ligne, sous le titre de l'onglet.
 *
 * **Elle a ete le titre de la page le temps d'un essai** (2026-08-30), defait le jour meme, et il ne
 * faut pas le refaire : un titre au contenu **variable** casse sa ligne au premier prenom compose ou
 * message publie long — 34 points ne pardonnent rien — et la page devenait la seule de l'application
 * a ne pas porter son nom. Elle est donc ce qu'elle doit etre : un accueil sous le titre, en 22, la
 * taille a laquelle « Joyeux anniversaire Kylian ! » tient sur une ligne.
 *
 * **Une ligne, toujours** : `numberOfLines={1}`, avec `adjustsFontSizeToFit` en garde-fou — une
 * salutation plus longue que prevu retrecit doucement (plancher a 75 %) avant de tronquer.
 *
 * Ce qu'elle dit vient d'une table de regles publiable — voir `salutations/`.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import moment from 'moment';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { maintenant } from '../../../shared/services/Temps';
import type { ScolariteColdData } from '../services/ScolariteMapping';
import { choisirSalutation } from '../salutations/regles';
import { salutationsActives } from '../salutations';

export interface GreetingBlockProps {
    coldData: ScolariteColdData | null;
    color: string;
    theme: AppThemeType;
}

const GreetingBlock = ({ coldData, color, theme }: GreetingBlockProps) => {
    const prenom = coldData?.firstName ?? '';

    /*
     * Calcule a chaque rendu, **volontairement**, et c'est un retour en arriere assume.
     *
     * Le texte etait memoise sur la date de naissance, ce qui l'a fige de deux facons : la langue
     * n'etait pas dans les dependances alors que `Translator.get` est appele ici — apres une bascule
     * de langue, la salutation restait dans l'ancienne pendant que la date, non memoisee, suivait —,
     * et une regle publiee arrivee apres le montage n'apparaissait jamais. Deux defauts pour une
     * optimisation qui n'en etait pas une : choisir parmi une poignee de regles ne coute rien, la
     * memoiser coutait la correction.
     *
     * L'heure est lue **ici** et non dans les regles : celles-ci restent pures, donc jouables sous
     * vitest, ce qui est la regle du depot pour tout ce qui decide d'une donnee affichee.
     */
    const regle = choisirSalutation(salutationsActives(), {
        // `maintenant()` et non `new Date()` : c'est **la** difference entre une salutation qui suit
        // le menu developpeur et une qui l'ignore. La date affichee juste dessous passe par `moment`,
        // donc elle suivait deja la simulation — les deux lignes se contredisaient (2026-08-29).
        maintenant: maintenant(),
        naissance: coldData?.dateOfBirth ?? null,
    });
    const salutation = regle?.texte
        ?? (regle?.cle !== undefined ? Translator.get(regle.cle) : Translator.get('GREETING_DAY'));

    return (
        <View>
            <Text
                style={[styles.salutation, { color: theme.font }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
            >
                {salutation}
                {prenom !== '' ? <Text style={{ color }}>{` ${prenom}`}</Text> : null}
                {' !'}
            </Text>
            <Text style={[styles.date, { color: theme.fontSecondary }]} numberOfLines={1}>
                {/* `dddd D MMMM` dans la locale de l'application : `moment.locale` est pose par
                    `Translator`, et suit donc la langue choisie dans les reglages. */}
                {moment().format('dddd D MMMM')}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    salutation: {
        // `xl` (22) et non `title` (34) : un texte variable ne titre pas — voir l'en-tete du fichier.
        fontSize: tokens.fontSize.xl,
        fontWeight: tokens.fontWeight.semibold,
        // `md` et non `xs` : deux textes de grande taille se lisent plus serres qu'ils ne le sont, et
        // quatre points ne separaient pas le titre de l'accueil — ils se touchaient optiquement.
        marginTop: tokens.space.md,
    },
    date: {
        fontSize: tokens.fontSize.sm,
        marginTop: tokens.space.xxs,
        textTransform: 'capitalize',
    },
});

export default GreetingBlock;

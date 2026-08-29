/**
 * La salutation : une ligne, sous le titre de l'onglet.
 *
 * **Elle est sous le titre, et elle ne bouge plus.** Elle a ete un second titre en 28 gras — deux
 * titres qui se disputaient la place —, puis une ligne minuscule fondue dans l'en-tete. Elle est
 * maintenant ce qu'elle doit etre : un accueil sous le titre de l'onglet, dans un en-tete **collant**
 * qui occupe sa propre place et ne s'efface pas (ScolariteDashboard).
 *
 * **Pourquoi il n'y a plus d'effacement du tout** : la page est courte, donc il n'y a pas assez de
 * course pour mener une disparition a son terme — le titre et la salutation restaient a moitie
 * effaces, l'un par-dessus l'autre. Aucun reglage d'interpolation ne rattrape une page qui ne defile
 * pas assez ; c'est la disposition qu'il fallait changer, pas la courbe.
 *
 * **Une ligne, toujours** (`numberOfLines={1}`), et en 22 plutot qu'en 28 : c'est la taille a
 * laquelle « Have a good weekend Kylian ! » tient sans passer sur deux lignes. Un message publie plus
 * long est tronque, ce qui est le bon comportement pour un accueil — mieux vaut une phrase coupee
 * qu'un paragraphe qui pousse la grille hors de l'ecran.
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
            <Text style={[styles.salutation, { color: theme.font }]} numberOfLines={1}>
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
        // `xl` (22) et non `xxl` (28) : c'est la taille a laquelle une salutation longue tient sur
        // une ligne. La hierarchie reste nette sous un titre en 34.
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

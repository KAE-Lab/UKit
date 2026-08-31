/**
 * Une rangee de widget : un service qu'on ouvre, et ce qu'il a a dire.
 *
 * Elle remplace `MailboxRow`, qui etait la meme chose ecrite pour un seul service. Elle garde ses
 * deux acquis, qui ne sont pas cosmetiques :
 *
 *   - **la forme pleine largeur**, et non une tuile : c'est elle qui permet d'afficher un echec en
 *     toutes lettres et de mener a la ressaisie quand les identifiants sont refuses ;
 *   - **la rangee qui porte un echec s'efface** au lieu de crier — teinte semantique, titre attenue.
 *
 * Elle ne decide rien : `etatDeLaRangee` l'a fait, et se teste (widgets/presentation.ts). Ce fichier
 * ne fait que traduire un etat en libelles et en couleurs.
 */

import React from 'react';
import { ActivityIndicator } from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import { type AppThemeType } from '../../../shared/theme/Theme';
import { presenterEchec } from '../services/ScolariteMapping';
import type { DefinitionWidget } from '../widgets/definitions';
import type { EtatRangee } from '../widgets/presentation';
import { CompteurScolarite, LigneScolarite } from './LigneScolarite';

/**
 * Ce que la rangee annonce en gros.
 *
 * Le nom du service est le repli de tous les etats sans compte : une rangee doit toujours dire de
 * quel service elle parle, y compris quand elle n'a rien d'autre a annoncer.
 */
function titre(definition: DefinitionWidget, etat: EtatRangee): string {
    if (etat.nature === 'echec' && etat.echec !== null) {
        return Translator.get(presenterEchec(etat.echec).messageKey);
    }
    if (etat.nature === 'compte' && etat.nombre !== null) {
        if (etat.nombre <= 0) return Translator.get(definition.zero);
        return Translator.get(etat.nombre === 1 ? definition.un : definition.plusieurs, etat.nombre);
    }
    return Translator.get(definition.nom);
}

/**
 * La ligne de dessous.
 *
 * Ordre de preference, du plus precis au plus general : ce que la source a nomme, puis le contexte
 * que l'ecran fournit (l'adresse de la boite, par exemple), puis la description du service.
 *
 * **`bientot` ne s'annonce plus**, et c'est une decision de produit prise le 2026-08-29. La rangee
 * affichait « Bientot dans UKit », ce qui portait a confusion : on pouvait croire que le bouton ne
 * marchait pas, alors qu'il ouvre bel et bien son service. Elle prend donc la description ordinaire
 * du service, exactement comme une rangee qui a une source mais rien a signaler — *on ne vend pas un
 * manque que personne ne remarquerait*. Seul `absent` garde sa phrase, parce que la rangee y mene
 * ailleurs qu'a son service et que le taire serait une surprise.
 */
function sousTitre(
    definition: DefinitionWidget,
    etat: EtatRangee,
    contexte: string | null,
): string | null {
    if (etat.nature === 'absent') return Translator.get('WIDGET_NOT_CARRIED');
    if (etat.nature === 'echec') return contexte;
    return etat.detail ?? contexte ?? Translator.get(definition.sousTitre);
}

export interface WidgetRowProps {
    definition: DefinitionWidget;
    etat: EtatRangee;
    /** Ce que l'ecran sait en plus de la source — l'adresse de la boite, notamment. */
    contexte?: string | null;
    teinte: string;
    theme: AppThemeType;
    onPress?: () => void;
}

export function WidgetRow({ definition, etat, contexte = null, teinte, theme, onPress }: WidgetRowProps) {
    const enEchec = etat.nature === 'echec';
    const couleur = enEchec ? theme.danger : teinte;
    const compteVisible = etat.nature === 'compte' && etat.nombre !== null && etat.nombre > 0;

    return (
        <LigneScolarite
            theme={theme}
            icon={enEchec ? definition.iconeEchec : definition.icone}
            teinte={couleur}
            titre={titre(definition, etat)}
            sousTitre={sousTitre(definition, etat, contexte)}
            // `absent` s'attenue comme un echec : rien n'est casse, mais il n'y a rien a attendre de
            // cette rangee aujourd'hui, et l'afficher au meme niveau que les autres la ferait
            // promettre autant qu'elles.
            attenue={enEchec || etat.nature === 'absent'}
            onPress={onPress}
            chevron={onPress !== undefined}
            droite={etat.chargement
                ? <ActivityIndicator size="small" color={teinte} />
                : (compteVisible
                    ? <CompteurScolarite valeur={etat.nombre as number} teinte={teinte} theme={theme} />
                    : null)}
        />
    );
}

export default WidgetRow;

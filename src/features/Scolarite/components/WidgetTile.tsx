/**
 * Une tuile de widget : l'adaptateur entre l'etat d'un widget et la tuile qui l'affiche.
 *
 * Le chassis visuel vit dans `TuileScolarite`, qui ne connait ni widget ni Blueprint — c'est ce qui
 * permet aux documents, dont la valeur vient de l'appareil et non d'un run, d'occuper la meme grille
 * sans passer par la machinerie de widgets.
 *
 * **Trois etats, et ils suivent la donnee :**
 *
 *   - un compte > 0    : le chiffre, puis l'unite (« 3 » / « non lus ») ;
 *   - un compte a zero : la phrase de repos (« Aucun message non lu ») — un `0` geant pour dire qu'il
 *     n'y a rien serait un contresens, c'est une bonne nouvelle et non une mesure ;
 *   - pas de donnee    : le nom du service, et ce qu'on peut en attendre.
 *
 * **Un echec tient en deux mots**, et la tuile garde sa taille : « Indisponible », « A ressaisir »,
 * « Erreur » — l'icone d'alerte du service, le mot, rien d'autre. La phrase, elle, vit dans la
 * feuille que le toucher ouvre (`FeuilleDeWidget`). La grille basculait autrefois la paire entiere
 * en rangees pour ecrire la phrase : la page changeait de forme sous les yeux de l'utilisateur, ce
 * qui amplifiait une panne de widget en page cassee (6.1-A).
 */

import React from 'react';

import Translator from '../../../shared/i18n/Translator';
import { toneColor, type AppThemeType } from '../../../shared/theme/Theme';
import { libelleEtablissement } from '../../../shared/etablissements';
import type { DefinitionWidget } from '../widgets/definitions';
import { echecDeTuile, type EtatRangee } from '../widgets/presentation';
import { TuileScolarite } from './TuileScolarite';

/** Le chiffre a mettre en avant, ou `null` quand la tuile a une phrase a dire plutot qu'un nombre. */
function grandNombre(etat: EtatRangee): number | null {
    return etat.nature === 'compte' && etat.nombre !== null && etat.nombre > 0 ? etat.nombre : null;
}

/** Ce qui s'ecrit sous le chiffre — ou a sa place, quand il n'y en a pas. */
function libelle(definition: DefinitionWidget, etat: EtatRangee): string {
    if (etat.nature === 'compte') {
        if (etat.nombre !== null && etat.nombre > 0 && definition.unite !== undefined) {
            // « 1 non lu », pas « 1 non lus » : l'unite s'accorde quand la definition le distingue.
            return Translator.get(
                etat.nombre === 1 && definition.uniteUn !== undefined ? definition.uniteUn : definition.unite,
            );
        }
        return Translator.get(definition.zero);
    }
    return Translator.get(definition.nom);
}

/**
 * La ligne du bas : du plus precis au plus general — ce que la source a nomme, ce que l'ecran sait,
 * puis **le nom du service tel que cet etablissement l'appelle**. Elle ne rend jamais de vide : voir
 * `TuileScolarite`.
 *
 * Le nom, et non la description, et c'est ce qui separe une tuile d'une rangee : le grand texte d'une
 * tuile est **la valeur**, pas le service — « 2 » / « a rendre » ne dit nulle part de quoi il s'agit.
 * La ligne du bas doit donc le nommer. Une rangee, elle, titre deja avec le service, donc sa
 * sous-ligne peut le decrire. Signale sur appareil le 2026-08-29 : la carte disait « Plateforme
 * pedagogique » la ou on attendait « Moodle ».
 *
 * **Le nom passe par le catalogue** (`libelleEtablissement`) : « Moodle » est le nom du produit, pas
 * celui de l'instance, et deux facs n'appellent pas la leur pareil. Une chaine de `Translator` ne
 * pouvait pas porter ca — un intitule propre a une universite n'est pas une traduction.
 *
 * **Et une tuile ne se repete pas.** Quand le service n'a rien a compter, son nom occupe deja le
 * grand texte ; le redire dessous donnait « Moodle » sur deux lignes. Dans ce cas seulement, la ligne
 * du bas decrit le service au lieu de le nommer — ce qui n'annule pas la correction ci-dessus, qui
 * porte sur le cas ou le grand texte est un chiffre.
 */
function contexteDeLaTuile(
    definition: DefinitionWidget,
    etat: EtatRangee,
    contexte: string | null,
    grandTexte: string,
): string {
    // `bientot` ne s'annonce pas : voir `WidgetRow`. La tuile prend le nom du service, comme quand
    // elle a une source et rien a signaler.
    if (etat.nature === 'absent') return Translator.get('WIDGET_NOT_CARRIED');

    const nom = libelleEtablissement(definition.point, Translator.get(definition.nom));
    const propose = etat.detail ?? contexte ?? nom;
    return propose === grandTexte ? Translator.get(definition.sousTitre) : propose;
}

export interface WidgetTileProps {
    definition: DefinitionWidget;
    etat: EtatRangee;
    /** Ce que l'ecran sait en plus de la source — l'adresse de la boite, notamment. */
    contexte?: string | null;
    teinte: string;
    theme: AppThemeType;
    onPress?: () => void;
}

export function WidgetTile({ definition, etat, contexte = null, teinte, theme, onPress }: WidgetTileProps) {
    if (etat.nature === 'echec' && etat.echec !== null) {
        // Meme signe que la rangee : l'icone d'alerte et le ton de l'echec, le texte efface. Pas de
        // ligne de contexte — deux mots, et c'est tout ce que la tuile a a dire.
        return (
            <TuileScolarite
                theme={theme}
                teinte={toneColor(theme, etat.echec.tone)}
                icone={definition.iconeEchec}
                libelle={Translator.get(echecDeTuile(etat.echec).libelleKey)}
                chargement={etat.chargement}
                cleDeFondu={etat.nature}
                attenue
                large={definition.forme === 'heros'}
                glypheDeFond={definition.glyphe}
                onPress={onPress}
            />
        );
    }

    const grandTexte = libelle(definition, etat);

    return (
        <TuileScolarite
            theme={theme}
            teinte={teinte}
            icone={definition.icone}
            nombre={grandNombre(etat)}
            libelle={grandTexte}
            contexte={contexteDeLaTuile(definition, etat, contexte, grandTexte)}
            chargement={etat.chargement}
            cleDeFondu={etat.nature}
            attenue={etat.nature === 'absent'}
            large={definition.forme === 'heros'}
            glypheDeFond={definition.glyphe}
            onPress={onPress}
        />
    );
}

export default WidgetTile;

/**
 * La grille du tableau de bord : tout ce que l'onglet montre, en une seule surface.
 *
 * La section portait des portes muettes et une seule rangee parlante — la messagerie. Elle porte
 * desormais **quatre widgets** et la porte du portail, et la difference n'est pas quantitative :
 *
 *   - **les quatre rangees sont les memes chez les deux etablissements**, et c'est l'objectif. Avant,
 *     un etudiant de l'INP voyait deux rangees la ou un bordelais en voyait quatre, parce que son
 *     webmail et son Apogee ne sont pas declares. Ce qui varie desormais est la **donnee**, pas la
 *     liste : une rangee sans source annonce ce qui vient, ou constate qu'elle n'est pas portee ici ;
 *   - **rien n'est mort.** Une rangee sans donnee ouvre quand meme son service, et une rangee que
 *     l'etablissement ne porte pas propose de la demander. C'est la regle du depot — un etat vide
 *     offre une action, jamais un bouton Reessayer qui n'aurait rien a rejouer.
 *
 * **L'ENT reste une porte et n'est pas un widget.** Il n'a rien a compter qui vaille un run complet :
 * le seul chiffre qu'on pourrait en tirer serait un nombre d'actualites que personne ne lit. Il ferme
 * la liste plutot que de l'ouvrir — ce qui porte une information passe devant.
 *
 * ## Trois formes, et la forme veut dire quelque chose
 *
 * Un **heros** pleine largeur : Moodle. Une chronologie ne porte pas qu'un chiffre, elle nomme la
 * prochaine echeance — « Devoir de calcul — jeudi » ne tient pas dans une demi-largeur sans etre
 * tronque. Puis **deux tuiles** cote a cote : la messagerie, qui se resume vraiment a un compteur, et
 * les **documents**. Puis **des rangees** : les notes, les examens, l'ENT — des evenements et des
 * portes, rien a annoncer la plupart de l'annee.
 *
 * **La forme vient du role, jamais de la donnee.** La faire dependre de la presence d'une source
 * donnerait deux pages differentes selon l'universite : l'INP, qui n'a qu'une source, se retrouverait
 * avec une tuile seule et un trou a cote. La grille est donc identique partout ; ce qui change est ce
 * que les tuiles disent.
 *
 * ## Les documents sont entres dans la grille, et l'en-tete de section en est sorti
 *
 * « Trois natures, trois sections » etait la regle, et elle valait quand il y en avait trois. Le
 * dossier est parti sur l'ecran du compte ; il n'en restait que deux, et deux en-tetes au-dessus de
 * deux petits groupes font plus d'ornement que de structure. Les documents deviennent donc une
 * **tuile** — ils ont un compte, comme les autres — et leur detail a gagne son propre ecran, ou la
 * liste a la place de respirer au lieu de pousser le reste de la page vers le bas pour un contenu
 * qu'on consulte le jour ou l'on en a besoin.
 *
 * Il n'y a plus d'en-tete du tout : **la salutation est le titre de la page**, et la grille suit.
 *
 * **Une seule exception, et elle est indispensable : un echec bascule la paire entiere en rangees.**
 * Un echec demande des mots — « Identifiants incorrects », et la ressaisie derriere. Une tuile de 140
 * points les tronquerait, et une phrase tronquee est une impasse. Basculer *les deux* plutot que la
 * seule fautive evite le trou qu'une tuile esseulee laisserait dans la grille.
 *
 * Les adresses viennent **toutes** du catalogue (jalon 6-G) : une grille ecrite ici enverrait un
 * etudiant de l'INP sur l'Apogee de Bordeaux.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { serviceEtablissement, widgetPublie } from '../../../shared/etablissements';
import type { UkitFailure } from '../../../shared/aetherius/failures';
import type { ScolariteColdData } from '../services/ScolariteMapping';
import { widgetsDeForme, type DefinitionWidget, type PointWidget } from '../widgets/definitions';
import { etatDeLaRangee } from '../widgets/presentation';
import type { ValeursWidgets } from '../widgets/runner';
import { GroupeScolarite, LigneScolarite } from './LigneScolarite';
import WidgetRow from './WidgetRow';
import WidgetTile from './WidgetTile';

export type EchecsWidgets = Readonly<Partial<Record<PointWidget, UkitFailure>>>;

export interface GrilleScolariteProps {
    theme: AppThemeType;
    teinte: string;
    valeurs: ValeursWidgets;
    echecs: EchecsWidgets;
    /** Le point en cours de lecture, ou `null`. Un seul a la fois : le moteur est sequentiel. */
    pointEnCours: PointWidget | null;
    coldData: ScolariteColdData | null;
    /** Ou mene une rangee : sa porte, ou la ressaisie quand les identifiants sont refuses. */
    onWidget: (point: PointWidget) => void;
    onPorte: (point: string) => void;
    /** Ouvre le formulaire de demande, pour un service que l'etablissement ne porte pas. */
    onDemande: (adresse: string) => void;
    /**
     * La tuile des documents, montee par l'appelant.
     *
     * Un emplacement plutot qu'un import : les documents sont **locaux**, leur valeur ne vient pas
     * d'un run. Les faire entrer dans la machinerie de widgets — qui ne connait que des Blueprints —
     * l'aurait obligee a porter un cas qui n'est pas le sien.
     */
    tuileDocuments?: React.ReactNode;
}

export function GrilleScolarite({
    theme, teinte, valeurs, echecs, pointEnCours, coldData, onWidget, onPorte, onDemande, tuileDocuments,
}: GrilleScolariteProps) {
    const ent = serviceEtablissement('ent');
    const demande = serviceEtablissement('adaptation');

    /** L'etat d'un widget, sa couleur, et ou sa rangee doit mener. Un seul endroit pour les trois formes. */
    const preparer = (definition: DefinitionWidget) => {
        const etat = etatDeLaRangee({
            valeur: valeurs[definition.point],
            echec: echecs[definition.point] ?? null,
            enCours: pointEnCours === definition.point,
            aUneSource: widgetPublie(definition.point) !== null,
            aUnePorte: serviceEtablissement(definition.point) !== null,
        });
        // Un widget « absent » sans formulaire publie n'a nulle part ou mener : il reste alors une
        // information, sans chevron. C'est le seul cas ou une rangee ne s'ouvre pas, et il vaut mieux
        // qu'un chevron qui ne va nulle part.
        const action = etat.nature === 'absent'
            ? (demande !== null ? () => onDemande(demande) : undefined)
            : () => onWidget(definition.point);
        const contexte = definition.point === 'messagerie' ? coldData?.emailAddress ?? null : null;

        // La couleur du service, du theme donc suivant le mode sombre. Le repli sur l'accent couvre
        // un index hors palette — une definition mal ecrite ne doit pas rendre une teinte `undefined`,
        // qui ferait disparaitre l'icone au lieu de la colorer.
        const couleur = theme.sectionsHeaders[definition.couleur] ?? teinte;

        return { definition, etat, action, contexte, couleur };
    };

    const heros = widgetsDeForme('heros').map(preparer);
    const tuiles = widgetsDeForme('tuile').map(preparer);
    const rangees = widgetsDeForme('rangee').map(preparer);
    // Voir l'en-tete : un echec demande des mots, et les tuiles basculent **ensemble** pour ne pas
    // laisser un trou dans la grille. Le heros y va aussi : lui seul en rangee, avec ses voisines
    // restees carrees, casserait la hierarchie que sa taille etablit.
    const enRangees = [...heros, ...tuiles].some(({ etat }) => etat.nature === 'echec');

    const rendreRangee = ({ definition, etat, action, contexte, couleur }: ReturnType<typeof preparer>) => (
        <WidgetRow
            key={definition.point}
            definition={definition}
            etat={etat}
            contexte={contexte}
            teinte={couleur}
            theme={theme}
            onPress={action}
        />
    );

    return (
        /*
         * Un seul bloc, resserre : le conteneur de la page espace ses enfants de `lg` (24), ce qui
         * separerait ici les moities d'une meme grille. Les emballer leur donne leur propre rythme.
         */
        <View style={styles.bloc}>
            {enRangees ? null : (
                <>
                    {heros.map(({ definition, etat, action, contexte, couleur }) => (
                        <View key={definition.point} style={styles.pleineLargeur}>
                            <WidgetTile
                                definition={definition}
                                etat={etat}
                                contexte={contexte}
                                teinte={couleur}
                                theme={theme}
                                onPress={action}
                            />
                        </View>
                    ))}

                    <View style={styles.grille}>
                        {tuiles.map(({ definition, etat, action, contexte, couleur }) => (
                            <WidgetTile
                                key={definition.point}
                                definition={definition}
                                etat={etat}
                                contexte={contexte}
                                teinte={couleur}
                                theme={theme}
                                onPress={action}
                            />
                        ))}
                        {tuileDocuments}
                    </View>
                </>
            )}

            <GroupeScolarite theme={theme}>
                {enRangees ? [...heros, ...tuiles].map(rendreRangee) : null}
                {rangees.map(rendreRangee)}

                {/*
                  * L'ENT garde **l'accent de l'application**, seul de la liste.
                  *
                  * Ce n'est pas un oubli : c'est le portail generique, la porte qui mene a tout le
                  * reste, et rien n'y est compte. Lui donner une couleur de service l'aurait pose au
                  * meme rang que les quatre qui rapportent quelque chose. Et il n'en restait de toute
                  * facon aucune de libre — en theme sombre, la palette ne porte que cinq teintes
                  * distinctes (les index 0 et 4 y sont identiques).
                  */}
                {ent !== null ? (
                    <LigneScolarite
                        theme={theme}
                        icon={{ name: 'school' }}
                        teinte={teinte}
                        titre={Translator.get('SERVICE_ENT')}
                        sousTitre={Translator.get('SERVICE_ENT_SUBTITLE')}
                        chevron
                        onPress={() => onPorte('ent')}
                    />
                ) : null}
            </GroupeScolarite>
        </View>
    );
}

const styles = StyleSheet.create({
    bloc: {
        gap: tokens.space.sm,
    },
    pleineLargeur: {
        // Le heros porte sa marge ici plutot que dans la tuile : `TuileScolarite` ne connait pas la
        // page qui l'accueille, et deux composants qui posent la meme marge finissent par diverger.
        marginHorizontal: tokens.space.md,
    },
    grille: {
        flexDirection: 'row',
        // La meme marge laterale que `GroupeScolarite`, pour que les tuiles et le groupe de rangees
        // partagent exactement le meme bord. Un decalage d'un point se voit.
        marginHorizontal: tokens.space.md,
        gap: tokens.space.md,
    },
});

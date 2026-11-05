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
 * ## L'instrument, puis les rangees (deuxieme passe de 7-J)
 *
 * Moodle, la messagerie et les documents se lisent desormais sur **un instrument** : une carte, trois
 * colonnes de chiffres, et la prochaine echeance de Moodle en pied (`InstrumentScolarite`). Les
 * rangees, les services et l'ENT suivent, au gabarit des Reglages, icones neutres. La premiere passe
 * gardait un heros et deux tuiles a carres de couleur et glyphes en filigrane : trois objets generiques
 * la ou il y a trois nombres a lire (review du 2026-11-05). Ce qui suit dit pourquoi les formes etaient
 * ce qu'elles etaient ; le role de chacune n'a pas change.
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
 * **La salutation est le titre de la page**, et la grille suit — sous deux intertitres discrets,
 * « En un coup d'oeil » et « Tes services ». Ce ne sont pas les en-tetes de section d'avant qui
 * reviennent : c'est l'intertitre des Reglages et des horaires du CROUS, une ligne en petites
 * capitales qui nomme sans peser. Sans eux, le heros, les tuiles et les rangees se lisaient comme un
 * seul empilement — la page manquait d'air precisement la ou sa structure changeait de nature.
 *
 * **Une tuile ne change pas de taille, quoi qu'il arrive a sa source.** La grille basculait la paire
 * entiere en rangees des qu'un widget echouait, pour lui donner la place d'une phrase — et le soir
 * de la sortie de la 6.0, une panne de Moodle a transforme la messagerie en rangee aussi : la page
 * changeait de forme sous les yeux de l'utilisateur, ce qui amplifiait une panne de widget en page
 * cassee. L'echec tient desormais en deux mots sur la tuile, et la phrase est dans la feuille que le
 * toucher ouvre (`FeuilleDeWidget`), avec le geste qui va avec — relancer ce seul widget, ou
 * ressaisir ses identifiants (6.1-A).
 *
 * Les adresses viennent **toutes** du catalogue (jalon 6-G) : une grille ecrite ici enverrait un
 * etudiant de l'INP sur l'Apogee de Bordeaux.
 *
 * ## La meme grille sans compte
 *
 * Depuis le jalon 6.1.x-B, la page existe **sans session** — un enseignant-chercheur cherchait le
 * webmail de son universite dans une application qui ne lui montrait qu'un formulaire etudiant. La
 * grille est alors la meme, tuiles comprises, et chaque rangee est une **porte** (`sansSession`,
 * widgets/presentation) : le nom du service, sa description, et il s'ouvre. Rien ne tourne, rien
 * n'attend, aucun teaser — ce qui n'existe pas chez l'etablissement reste `absent`, comme avec un
 * compte, pour que les deux pages se ressemblent.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import moment from 'moment';

import Translator from '../../../shared/i18n/Translator';
import { tokens, toneColor, type AppThemeType } from '../../../shared/theme/Theme';
import { libelleEtablissement, serviceEtablissement, widgetPublie } from '../../../shared/etablissements';
import { Icon } from '../../../shared/ui/Icon';
import { ModaleBientot } from '../../../shared/ui/ModaleBientot';
import type { ScolariteColdData } from '../services/ScolariteMapping';
import { serviceDuPoint, widgetsDeForme, type DefinitionWidget, type PointWidget } from '../widgets/definitions';
import { echecDeTuile, etatDeLaRangee } from '../widgets/presentation';
import type { ValeursWidgets } from '../widgets/runner';
import type { EchecsWidgets } from '../widgets/useWidgets';
import { FeuilleDeWidget } from './FeuilleDeWidget';
import { GroupeScolarite, LigneScolarite } from './LigneScolarite';
import { InstrumentScolarite, type ColonneInstrument } from './InstrumentScolarite';
import { RangeeMysterieuse } from './RangeeMysterieuse';
import WidgetRow from './WidgetRow';

/** Ce que `preparer` rend pour chaque widget : son etat, sa couleur, et ou il mene. */
interface RangeePreparee {
    definition: DefinitionWidget;
    etat: ReturnType<typeof etatDeLaRangee>;
    action: (() => void) | undefined;
    contexte: string | null;
    couleur: string;
}

/**
 * La colonne de l'instrument d'un widget : les regles de l'ancienne tuile, telles quelles. Un compte
 * ecrit son chiffre et son unite — ou la phrase du zero ; un echec, ses deux mots dans le ton de
 * l'echec, a la place du chiffre ; tout le reste — une porte sans session, une attente, un service que
 * l'etablissement ne porte pas — nomme le service.
 */
function colonneDuWidget({ definition, etat, action }: RangeePreparee, theme: AppThemeType): ColonneInstrument {
    const nom = libelleEtablissement(definition.point, Translator.get(definition.nom));
    const commun = { cle: definition.point, chargement: etat.chargement, onPress: action };
    if (etat.nature === 'echec' && etat.echec !== null) {
        const mots = Translator.get(echecDeTuile(etat.echec).libelleKey);
        return { ...commun, icone: definition.iconeEchec, chiffre: null, texte: mots, couleurDuTexte: toneColor(theme, etat.echec.tone), accessibilite: `${nom}, ${mots}` };
    }
    if (etat.nature === 'compte') {
        const nombre = etat.nombre ?? 0;
        const texte = nombre > 0 && definition.unite !== undefined
            ? Translator.get(nombre === 1 && definition.uniteUn !== undefined ? definition.uniteUn : definition.unite)
            : Translator.get(definition.zero);
        return { ...commun, icone: definition.icone, chiffre: nombre, texte, accessibilite: `${nom}, ${nombre > 0 ? `${nombre} ${texte}` : texte}` };
    }
    const absent = etat.nature === 'absent';
    return {
        ...commun,
        icone: definition.icone,
        chiffre: null,
        texte: absent ? Translator.get('WIDGET_NOT_CARRIED') : nom,
        attenuee: absent,
        invite: !absent && action !== undefined ? Translator.get('INSTRUMENT_OUVRIR') : undefined,
        accessibilite: nom,
    };
}

/** Le pied de l'instrument : la prochaine echeance de Moodle, quand la source en nomme une. */
function PiedDeMoodle({ detail, theme }: { detail: string; theme: AppThemeType }) {
    return (
        <View style={styles.pied}>
            <Icon icon={{ name: 'calendar-clock' }} size={18} color={theme.fontSecondary} />
            <Text style={[styles.texteDuPied, { color: theme.font }]} numberOfLines={2}>{detail}</Text>
        </View>
    );
}

/**
 * Une rangee de la grille — ou son teaser.
 *
 * Sans source publiee (`bientot`, `absent`), la rangee est mysterieuse : floutee, et son toucher
 * ouvre la modale « bientot ». Le jour ou le Blueprint est publie, le flou tombe sans release.
 */
function RangeeDeWidget({ rangee, theme, onTeaser }: { rangee: RangeePreparee; theme: AppThemeType; onTeaser: (point: PointWidget) => void }) {
    const { definition, etat, action, contexte, couleur } = rangee;

    if (etat.nature === 'bientot' || etat.nature === 'absent') {
        return (
            <RangeeMysterieuse theme={theme} libelle={Translator.get(definition.nom)} onPress={() => onTeaser(definition.point)}>
                <WidgetRow
                    definition={definition}
                    etat={etat}
                    contexte={contexte}
                    teinte={couleur}
                    theme={theme}
                    masque
                />
            </RangeeMysterieuse>
        );
    }

    return (
        <WidgetRow
            definition={definition}
            etat={etat}
            contexte={contexte}
            teinte={couleur}
            theme={theme}
            onPress={action}
        />
    );
}

/**
 * La feuille du widget dont l'echec est ouvert, ou rien.
 *
 * Elle ferme avant d'agir : relancer ou ressaisir sont des gestes qui quittent la feuille, et une
 * feuille qui resterait ouverte sur un indicateur de relance cacherait la tuile qu'on vient de relancer.
 */
function FeuilleDuPointOuvert({ rangees, point, theme, fermer, onRelancer, onRessaisir }: {
    rangees: readonly RangeePreparee[];
    point: PointWidget | null;
    theme: AppThemeType;
    fermer: () => void;
    onRelancer: (point: PointWidget) => void;
    onRessaisir: () => void;
}) {
    const rangee = point === null ? null : rangees.find(({ definition }) => definition.point === point) ?? null;
    if (rangee === null || rangee.etat.echec === null) return null;

    return (
        <FeuilleDeWidget
            theme={theme}
            echec={rangee.etat.echec}
            visible
            fermer={fermer}
            onRelancer={() => {
                fermer();
                onRelancer(rangee.definition.point);
            }}
            onRessaisir={() => {
                fermer();
                onRessaisir();
            }}
        />
    );
}

/**
 * Quand les services ont ete relus pour la derniere fois, ou `null` si rien ne l'a jamais ete.
 *
 * **La plus recente des lectures**, et non la plus ancienne : la ligne repond a « ca date de
 * quand ? », pas a « qu'est-ce qui traine ? ». Chaque widget a sa propre peremption, donc la plus
 * ancienne serait toujours celle du widget au rythme le plus lent — elle dirait « il y a six heures »
 * sur une page dont la boite vient d'etre relue.
 */
function derniereLecture(valeurs: ValeursWidgets): string | null {
    let plusRecente: number | null = null;
    for (const valeur of Object.values(valeurs)) {
        const lu = Date.parse(valeur.luLe);
        if (Number.isFinite(lu) && (plusRecente === null || lu > plusRecente)) plusRecente = lu;
    }
    return plusRecente === null ? null : moment(plusRecente).fromNow();
}

/**
 * L'intertitre des Reglages et des horaires du CROUS : petites capitales, sans surface.
 *
 * `detail` pose la fraicheur des lectures a sa droite — au ras de ce qu'elle mesure. Elle vivait en
 * pastille dans l'en-tete, ou elle posait une question de coherence : « mis a jour il y a X » sur une
 * page et pas les autres se lit comme un oubli. Ici elle qualifie **les widgets**, et aucun autre
 * onglet n'a de cache a peremption a qualifier.
 */
function Intertitre({ texte, detail, theme }: { texte: string; detail?: string | null; theme: AppThemeType }) {
    return (
        <View style={styles.ligneIntertitre}>
            <Text style={[styles.intertitre, { color: theme.fontSecondary }]}>
                {texte}
            </Text>
            {detail ? (
                <Text style={[styles.detailIntertitre, { color: theme.fontSecondary }]} numberOfLines={1}>
                    {detail}
                </Text>
            ) : null}
        </View>
    );
}

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
    /** Relit ce seul widget, depuis la feuille d'echec. */
    onRelancer: (point: PointWidget) => void;
    /** Ouvre la fiche du compte en ressaisie, depuis la feuille d'echec. */
    onRessaisir: () => void;
    onPorte: (point: string) => void;
    /** Ouvre le formulaire de demande, pour un service que l'etablissement ne porte pas. */
    onDemande: (adresse: string) => void;
    /**
     * La colonne des documents, preparee par l'appelant (`useColonneDocuments`).
     *
     * Un emplacement plutot qu'un import : les documents sont **locaux**, leur valeur ne vient pas
     * d'un run. Les faire entrer dans la machinerie de widgets — qui ne connait que des Blueprints —
     * l'aurait obligee a porter un cas qui n'est pas le sien.
     */
    colonneDocuments?: ColonneInstrument;
    /** Aucune session : les rangees sont des portes, la fraicheur ne se dit pas. */
    sansSession?: boolean;
}

export function GrilleScolarite({
    theme, teinte, valeurs, echecs, pointEnCours, coldData,
    onWidget, onRelancer, onRessaisir, onPorte, onDemande, colonneDocuments, sansSession = false,
}: GrilleScolariteProps) {
    const ent = serviceEtablissement('ent');
    const demande = serviceEtablissement('adaptation');
    const fraicheur = sansSession ? null : derniereLecture(valeurs);
    /** Le point dont le teaser est ouvert, ou `null`. Voir `RangeeMysterieuse`. */
    const [teaser, setTeaser] = useState<PointWidget | null>(null);
    /** Le point dont la feuille d'echec est ouverte, ou `null`. Voir `FeuilleDeWidget`. */
    const [echecOuvert, setEchecOuvert] = useState<PointWidget | null>(null);

    /** L'etat d'un widget, sa couleur, et ou sa rangee doit mener. Un seul endroit pour les trois formes. */
    const preparer = (definition: DefinitionWidget) => {
        const etat = etatDeLaRangee({
            valeur: valeurs[definition.point],
            echec: echecs[definition.point] ?? null,
            enCours: pointEnCours === definition.point,
            aUneSource: widgetPublie(definition.point) !== null,
            aUnePorte: serviceEtablissement(serviceDuPoint(definition.point)) !== null,
            sansSession,
        });
        // Un widget « absent » sans formulaire publie n'a nulle part ou mener : il reste alors une
        // information, sans chevron. C'est le seul cas ou une rangee ne s'ouvre pas, et il vaut mieux
        // qu'un chevron qui ne va nulle part. Un echec mene a la ressaisie quand c'est ce qu'il
        // demande — `onWidget` y route deja — et a la feuille sinon.
        const action = etat.nature === 'absent'
            ? (demande !== null ? () => onDemande(demande) : undefined)
            : etat.nature === 'echec' && etat.echec !== null && echecDeTuile(etat.echec).ouvre === 'feuille'
                ? () => setEchecOuvert(definition.point)
                : () => onWidget(definition.point);
        const contexte = definition.point === 'messagerie' ? coldData?.emailAddress ?? null : null;

        // Le glyphe d'une rangee est neutre depuis la deuxieme passe de 7-J : la couleur de chaque
        // service (`definition.couleur`) ne sert plus a l'ecran, l'echec prend le sien (WidgetRow).
        const couleur = theme.fontSecondary;

        return { definition, etat, action, contexte, couleur };
    };

    const heros = widgetsDeForme('heros').map(preparer);
    const tuiles = widgetsDeForme('tuile').map(preparer);
    const rangees = widgetsDeForme('rangee').map(preparer);

    // La prochaine echeance : seulement sur un compte, ou elle est la phrase de la source.
    const moodle = heros[0];
    const detailDeMoodle = moodle !== undefined && moodle.etat.nature === 'compte' ? moodle.etat.detail : null;

    const rendreRangee = (rangee: RangeePreparee) => (
        <RangeeDeWidget key={rangee.definition.point} rangee={rangee} theme={theme} onTeaser={setTeaser} />
    );

    return (
        /*
         * Un seul bloc, resserre : le conteneur de la page espace ses enfants de `lg` (24), ce qui
         * separerait ici les moities d'une meme grille. Les emballer leur donne leur propre rythme.
         */
        <View style={styles.bloc}>
            <Intertitre
                texte={Translator.get('SCOLARITE_SECTION_GLANCE')}
                detail={fraicheur !== null ? Translator.get('WIDGETS_REFRESHED', fraicheur) : null}
                theme={theme}
            />

            <InstrumentScolarite
                theme={theme}
                colonnes={[
                    ...[...heros, ...tuiles].map((rangee) => colonneDuWidget(rangee, theme)),
                    ...(colonneDocuments !== undefined ? [colonneDocuments] : []),
                ]}
                pied={detailDeMoodle !== null ? <PiedDeMoodle detail={detailDeMoodle} theme={theme} /> : null}
            />

            <View style={styles.sectionServices}>
                <Intertitre texte={Translator.get('SCOLARITE_SECTION_SERVICES')} theme={theme} />
            </View>

            <GroupeScolarite theme={theme}>
                {rangees.map(rendreRangee)}

                {/* L'ENT, le portail generique, ferme la liste : rien n'y est compte. Il portait
                    l'accent, seul de la liste, pour ne pas etre mis au rang des services colores ;
                    toutes les icones sont neutres depuis la deuxieme passe de 7-J. */}
                {ent !== null ? (
                    <LigneScolarite
                        theme={theme}
                        icon={{ name: 'school' }}
                        teinte={theme.fontSecondary}
                        titre={Translator.get('SERVICE_ENT')}
                        sousTitre={Translator.get('SERVICE_ENT_SUBTITLE')}
                        chevron
                        onPress={() => onPorte('ent')}
                    />
                ) : null}
            </GroupeScolarite>

            <ModaleBientot
                theme={theme}
                visible={teaser !== null}
                fermer={() => setTeaser(null)}
                ouvrirQuandMeme={teaser !== null && serviceEtablissement(serviceDuPoint(teaser)) !== null
                    ? () => {
                        const point = teaser;
                        setTeaser(null);
                        onWidget(point);
                    }
                    : undefined}
            />

            <FeuilleDuPointOuvert
                rangees={[...heros, ...tuiles, ...rangees]}
                point={echecOuvert}
                theme={theme}
                fermer={() => setEchecOuvert(null)}
                onRelancer={onRelancer}
                onRessaisir={onRessaisir}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    bloc: {
        gap: tokens.space.sm,
    },
    ligneIntertitre: {
        // Le rang s'aligne sur le bord des cartes, pas sur celui de l'ecran — c'est ce qui le
        // rattache a ce qu'il annonce.
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: tokens.space.sm,
        marginHorizontal: tokens.space.md,
        paddingHorizontal: tokens.space.xxs,
    },
    intertitre: {
        // Le style des periodes du CROUS et des sections de Reglages : petites capitales espacees.
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    detailIntertitre: {
        // En bas de casse, sans espacement de capitales : la fraicheur est une note, pas un titre.
        fontSize: tokens.fontSize.xs,
        flexShrink: 1,
    },
    sectionServices: {
        // L'air entre les deux moities de la grille : le `gap` du bloc suffit entre des cartes, pas
        // entre deux sections que leurs intertitres viennent justement de separer.
        marginTop: tokens.space.md,
    },
    pied: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
    },
    texteDuPied: {
        flex: 1,
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.medium,
    },
});

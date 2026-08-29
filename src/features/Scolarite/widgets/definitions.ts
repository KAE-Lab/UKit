/**
 * Les widgets de l'onglet Scolarite : ce que chaque service **dit**, en plus de s'ouvrir.
 *
 * Un widget est une rangee de service qui porte une donnee. La messagerie l'etait deja, seule et en
 * dur ; ce fichier en fait une famille. Trois decisions la structurent, et aucune n'est cosmetique :
 *
 *   - **la presentation est du code, la source est du catalogue.** Le nom, l'icone et les libelles
 *     vivent ici parce qu'ils sont traduits et dessines ; le Blueprint qui remplit la valeur vient de
 *     la base. C'est ce qui rend vraie la promesse « un widget de plus = un Blueprint publie + une
 *     ligne de catalogue » : les libelles sont deja livres, y compris ceux des widgets dont la donnee
 *     n'existe pas encore. Les omettre aurait rendu chaque nouveau widget dependant d'une release ;
 *   - **l'application ne connait aucun portail.** Elle connait un `point`, qui est a la fois la cle
 *     de la porte dans `services` et celle du Blueprint dans `portailWidgets`. Faire diverger les
 *     deux creerait une table de correspondance dont personne n'aurait besoin (jalon 6-G) ;
 *   - **l'ordre est fixe et le meme partout.** Deux etudiants de deux facs voient la meme page ; ce
 *     qui change est la donnee a droite, pas la liste ni sa suite.
 *
 * Voir docs/features/scolarite.md, section « Les widgets ».
 */

import type { TranslationKey } from '../../../shared/i18n/Translator';
import type { IconSpec } from '../../../shared/ui/Icon';

/**
 * Les services qui peuvent porter une donnee.
 *
 * Une union fermee et non `string` : le point sert d'index au cache, au catalogue et aux libelles,
 * et une chaine libre y ferait passer une faute de frappe jusqu'a une rangee vide sans erreur.
 */
export type PointWidget = 'messagerie' | 'moodle' | 'notes' | 'examens';

/**
 * La forme d'un widget dans la page, decidee par son **role** et jamais par sa donnee.
 *
 * C'est la contrainte centrale de la grille : faire dependre la forme de la presence d'une source
 * ferait deux pages differentes selon l'universite — l'INP, qui n'a qu'une source, se retrouverait
 * avec une tuile seule et un trou a cote. La forme est donc fixe.
 *
 *   - `heros` : un flux **qui a quelque chose a raconter**. Une chronologie ne porte pas qu'un
 *     chiffre, elle nomme la prochaine echeance — « Devoir de calcul — jeudi » ne tient pas dans une
 *     demi-largeur sans etre tronque. Il en faut **un seul** : deux heros ne sont plus une hierarchie ;
 *   - `tuile` : un flux qui se resume a un chiffre. Il y en a toujours un, meme zero — une boite de
 *     reception. Un carre a demi-largeur suffit, et c'est ce qu'on lit d'un coup d'oeil ;
 *   - `rangee` : un **evenement** ou une **porte**. Il n'y a rien a annoncer la plupart de l'annee —
 *     une note qui tombe, un examen programme, un portail qu'on ouvre. Une ligne suffit, et elle
 *     laisse la place d'ecrire.
 */
export type FormeWidget = 'heros' | 'tuile' | 'rangee';

export interface DefinitionWidget {
    readonly point: PointWidget;
    readonly forme: FormeWidget;
    readonly icone: IconSpec;
    /** L'icone d'un echec : la rangee change de signe, pas seulement de couleur. */
    readonly iconeEchec: IconSpec;
    /**
     * Sa couleur, en index dans `theme.sectionsHeaders`.
     *
     * **Toute la grille etait a l'accent** — icones, surfaces, compteurs, tous bleus —, et elle se
     * lisait comme un bloc indifferencie : on lisait les libelles pour retrouver un service au lieu
     * de le reconnaitre. C'est le motif des Reglages d'iOS, dont ces rangees ont deja la forme : un
     * carre arrondi de couleur par service, qui rend la liste balayable d'un coup d'oeil.
     *
     * L'index et non une couleur ecrite : la palette est **du theme**, donc elle suit le mode sombre.
     * `sectionsHeaders` existe depuis longtemps et le Planning s'en sert deja pour colorer ses
     * sections — en inventer une seconde aurait cree deux vocabulaires de couleur.
     *
     * Piege a connaitre : en theme sombre, les index **0 et 4 portent la meme valeur** (`#5E5CE6`), la
     * ou le theme clair en a deux differentes. On evite donc le 4 ici, et l'ENT garde l'accent de
     * l'application plutot que d'occuper le doublon.
     */
    readonly couleur: number;
    /** Le nom du service. Affiche tant qu'il n'y a pas de donnee a annoncer a sa place. */
    readonly nom: TranslationKey;
    readonly sousTitre: TranslationKey;
    /** Ce que la rangee annonce selon le compte. `$-` recoit le nombre. */
    readonly zero: TranslationKey;
    readonly un: TranslationKey;
    readonly plusieurs: TranslationKey;
    /**
     * L'unite, seule, pour une tuile : « non lus », « a rendre ».
     *
     * Une tuile separe le **chiffre** du mot qui le qualifie, parce que c'est le chiffre qu'on vient
     * y chercher ; une rangee, elle, ecrit la phrase entiere. Les deux formes ont donc besoin de deux
     * vocabulaires, et les melanger donnerait « 3 » au-dessus de « 3 messages non lus ».
     */
    readonly unite?: TranslationKey;
    /**
     * La peremption par defaut, en minutes.
     *
     * Par widget, parce que les donnees ne vieillissent pas au meme rythme : une boite de reception
     * change dans la journee, une liste d'echeances beaucoup moins. Une valeur unique aurait fait
     * payer a la plus lente le rythme de la plus rapide — c'est-a-dire un run de moteur pour rien a
     * chaque retour d'arriere-plan. Le catalogue peut la surcharger sans release.
     */
    readonly peremptionMin: number;
}

/**
 * Les quatre rangees, dans leur ordre d'affichage.
 *
 * Quatre et pas deux : les notes et les examens n'ont pas encore de donnee — les resultats tombent
 * en bloc en fin de semestre, et il n'existe pas de calendrier d'examens avant la rentree —, mais
 * leurs **portes** existent et leur place est tenue. Une rangee sans donnee reste utile : elle ouvre
 * son service. C'est la difference entre annoncer ce qui vient et afficher une tuile morte.
 */
export const WIDGETS: readonly DefinitionWidget[] = [
    {
        point: 'messagerie',
        // Le bleu : c'est le service le plus consulte, et il garde la couleur d'action.
        couleur: 0,
        forme: 'tuile',
        icone: { name: 'email-outline' },
        iconeEchec: { name: 'email-alert-outline' },
        nom: 'SERVICE_MAILBOX',
        sousTitre: 'SERVICE_MAILBOX_SUBTITLE',
        zero: 'MAILBOX_NO_UNREAD',
        un: 'MAILBOX_UNREAD_ONE',
        plusieurs: 'MAILBOX_UNREAD_MANY',
        unite: 'WIDGET_MAILBOX_UNIT',
        peremptionMin: 20,
    },
    {
        point: 'moodle',
        // L'orange, qui se trouve etre celui de Moodle — coincidence utile, pas une reprise de marque.
        couleur: 2,
        forme: 'heros',
        icone: { name: 'book-open-variant' },
        iconeEchec: { name: 'book-alert-outline' },
        nom: 'SERVICE_MOODLE',
        sousTitre: 'SERVICE_MOODLE_SUBTITLE',
        zero: 'WIDGET_MOODLE_NONE',
        un: 'WIDGET_MOODLE_ONE',
        plusieurs: 'WIDGET_MOODLE_MANY',
        unite: 'WIDGET_MOODLE_UNIT',
        // Six heures : une echeance de devoir se pose des jours a l'avance. La relire a chaque retour
        // d'arriere-plan couterait la traversee complete du WAYF puis du CAS pour une valeur
        // identique.
        peremptionMin: 360,
    },
    {
        point: 'notes',
        // Le vert : une note qui tombe est une bonne nouvelle plus souvent qu'une mauvaise.
        couleur: 1,
        forme: 'rangee',
        icone: { name: 'chart-line' },
        iconeEchec: { name: 'chart-line' },
        nom: 'SERVICE_NOTES',
        sousTitre: 'SERVICE_NOTES_SUBTITLE',
        zero: 'WIDGET_NOTES_NONE',
        un: 'WIDGET_NOTES_ONE',
        plusieurs: 'WIDGET_NOTES_MANY',
        peremptionMin: 360,
    },
    {
        point: 'examens',
        // Le rouge : une echeance d'epreuve est ce qui presse le plus dans cette liste.
        couleur: 3,
        forme: 'rangee',
        icone: { name: 'calendar-check-outline' },
        iconeEchec: { name: 'calendar-alert' },
        nom: 'SERVICE_EXAMS',
        sousTitre: 'SERVICE_EXAMS_SUBTITLE',
        zero: 'WIDGET_EXAMS_NONE',
        un: 'WIDGET_EXAMS_ONE',
        plusieurs: 'WIDGET_EXAMS_MANY',
        peremptionMin: 720,
    },
];

/** Les widgets d'une forme donnee, dans l'ordre d'affichage. */
export function widgetsDeForme(forme: FormeWidget): readonly DefinitionWidget[] {
    return WIDGETS.filter((widget) => widget.forme === forme);
}

/** La definition d'un point, ou `null` — utile aux appelants qui lisent une cle venue de la base. */
export function definitionDuWidget(point: string): DefinitionWidget | null {
    return WIDGETS.find((widget) => widget.point === point) ?? null;
}

/**
 * Le rafraichissement des widgets : quoi rejouer, quand, et dans quel ordre.
 *
 * **Sequentiel, et ce n'est pas un choix de confort.** Il y a une seule WebView montee, donc un seul
 * run Act II a la fois (`MoteurNavigateur`). Lancer les widgets en parallele ne les rendrait pas plus
 * rapides : le second serait refuse, ou remonterait la vue sous le premier.
 *
 * **Perime plutot que systematique.** Le rafraichissement se declenche au lancement et au retour
 * d'arriere-plan — c'est frequent, et c'est bien ce qu'on veut pour une boite de reception. Mais
 * rejouer *tous* les widgets a chaque bascule d'application ferait traverser le WAYF puis le CAS
 * pour une valeur identique, plusieurs fois par heure. Chaque widget porte donc sa propre
 * peremption, et un widget frais est **saute** — pas mis en file, pas joue.
 *
 * **Ce qui reste affiche pendant ce temps, c'est la derniere valeur connue.** Le cache est ce qui
 * fait que la page s'ouvre pleine ; ce module ne le lit ni ne l'ecrit, il le recoit et le rend. La
 * persistance appartient a l'appelant, ce qui garde ce fichier jouable sans plateforme.
 *
 * Voir docs/features/scolarite.md, section « Les widgets ».
 */

import { widgetPublie } from '../../../shared/etablissements';
import { maintenant, maintenantMs } from '../../../shared/services/Temps';
import {
    estNomDePortail,
    reportFailure,
    runBlueprint,
    type RunnableBlueprintName,
    type UkitFailure,
} from '../../../shared/aetherius';
import { surLeNavigateur } from '../services/MoteurNavigateur';
import { WIDGETS, type PointWidget } from './definitions';
import { projeterWidget, valeurFraiche, type ValeurWidget } from './projection';

/** Les valeurs connues, par point. Une absence veut dire « jamais lu », pas « vide ». */
export type ValeursWidgets = Readonly<Partial<Record<PointWidget, ValeurWidget>>>;

/** Les points en cours de lecture. L'ecran s'en sert pour poser un indicateur sur la bonne rangee. */
export type PointsEnCours = ReadonlySet<PointWidget>;

export interface OptionsRafraichissement {
    /** Rejoue meme ce qui est frais. Vrai en sortie de parcours froid, ou sur un geste explicite. */
    readonly force?: boolean;
    readonly signal?: AbortSignal;
    /** Une lecture a abouti. Emis **au fil de l'eau** : chaque rangee s'allume des qu'elle sait. */
    readonly onValeur?: (point: PointWidget, valeur: ValeurWidget) => void;
    /** Une lecture a echoue. Les autres widgets continuent : une panne de l'un n'emporte pas l'autre. */
    readonly onEchec?: (point: PointWidget, echec: UkitFailure) => void;
    /** Le point qui commence, puis `null` quand il finit. Pilote l'indicateur d'attente. */
    readonly onEnCours?: (point: PointWidget | null) => void;
}

/**
 * Le Blueprint jouable d'un widget chez l'etablissement selectionne, ou `null`.
 *
 * Le nom **doit** vivre sous le prefixe reserve : il vient de la base, et un catalogue mal rempli
 * nommerait un Blueprint que le registre refuserait. Le refuser ici le rend explicable, plutot que de
 * faire echouer un rafraichissement au milieu.
 */
function sourceDuWidget(point: PointWidget): { nom: string; peremptionMin: number | null } | null {
    const publie = widgetPublie(point);
    if (publie === null || !estNomDePortail(publie.blueprint)) return null;
    return { nom: publie.blueprint, peremptionMin: publie.peremptionMin };
}

/**
 * Rejoue les widgets perimes de l'etablissement selectionne, un par un.
 *
 * Rend les valeurs obtenues **fusionnees** avec celles qu'on avait : un widget saute ou echoue garde
 * la sienne. Ne leve jamais — un rafraichissement d'arriere-plan qui remonterait une exception
 * ferait tomber l'ecran qui l'a declenche.
 */
export async function rafraichirWidgets(
    connues: ValeursWidgets,
    options: OptionsRafraichissement = {},
): Promise<ValeursWidgets> {
    const instant = maintenantMs();
    const obtenues: Partial<Record<PointWidget, ValeurWidget>> = { ...connues };

    for (const definition of WIDGETS) {
        if (abandonnee(options)) break;

        const source = sourceDuWidget(definition.point);
        if (source === null) continue;

        const peremption = source.peremptionMin ?? definition.peremptionMin;
        if (options.force !== true && valeurFraiche(connues[definition.point], peremption, instant)) {
            continue;
        }

        options.onEnCours?.(definition.point);
        const lu = await lireUnWidget(source.nom, options);
        options.onEnCours?.(null);

        /*
         * **Rien n'est applique apres un abandon.**
         *
         * Un run qui franchit son dernier step une milliseconde avant l'abandon rend `ok: true` :
         * sans cette garde, `onValeur` reecrivait dans le trousseau la valeur d'un compte qu'on vient
         * d'effacer — exactement ce que la deconnexion supprime en appelant `deleteWidgets`. La garde
         * du haut de boucle ne suffit pas : elle protege le run **suivant**, pas celui qui vient de
         * finir.
         */
        if (abandonnee(options)) break;

        appliquer(definition.point, lu, obtenues, options);
    }

    return obtenues;
}

/**
 * La serie a-t-elle ete abandonnee ?
 *
 * Une fonction plutot que la lecture directe du drapeau, et ce n'est pas de la coquetterie : lu deux
 * fois autour d'un `await`, TypeScript affine le second test a partir du premier et le declare
 * inutile, alors que c'est justement pendant cette attente que l'abandon arrive.
 */
function abandonnee(options: OptionsLecture): boolean {
    return options.signal?.aborted === true;
}

/** Ce qu'une lecture change : la table rendue, et la rangee qui s'allume. */
function appliquer(
    point: PointWidget,
    lu: LectureWidget,
    obtenues: Partial<Record<PointWidget, ValeurWidget>>,
    options: OptionsRafraichissement,
): void {
    if (lu.ok === true) {
        obtenues[point] = lu.valeur;
        options.onValeur?.(point, lu.valeur);
        return;
    }
    if (lu.echec !== null) options.onEchec?.(point, lu.echec);
}

export type LectureWidget =
    | { readonly ok: true; readonly valeur: ValeurWidget }
    | { readonly ok: false; readonly echec: UkitFailure | null };

export interface OptionsLecture {
    readonly signal?: AbortSignal;
}

/**
 * Relit **un seul** point, depuis la feuille d'echec de sa tuile.
 *
 * La meme reservation que le rafraichissement — `arriere-plan`, interruptible par un geste — et le
 * meme silence : un point sans source, un moteur pris ou un run abandonne rendent `echec: null`.
 * Le geste vient de l'utilisateur, mais ce qu'il relance reste une lecture d'arriere-plan : une
 * session qui demarrerait pendant la relance doit pouvoir la faire ceder (MoteurNavigateur).
 */
export async function relireWidget(point: PointWidget, options: OptionsLecture = {}): Promise<LectureWidget> {
    const source = sourceDuWidget(point);
    if (source === null) return { ok: false, echec: null };
    return lireUnWidget(source.nom, options);
}

/**
 * Une lecture, moteur reserve.
 *
 * `priorite: 'arriere-plan'` : un widget qui trouve le moteur pris n'est pas une erreur de
 * programmation — une connexion peut tres bien se jouer au moment ou l'application revient au premier
 * plan. Il patiente. Et il **se laisse interrompre** : un geste de l'utilisateur qui arrive pendant sa
 * lecture la fait abandonner, ce qui est la bonne priorite — la valeur d'avant reste affichee, et la
 * prochaine occasion reessaiera.
 *
 * Un moteur toujours pris apres l'attente, ou une lecture abandonnee, rendent `echec: null` : il n'y a
 * **rien a dire a l'utilisateur**. Afficher une erreur ici transformerait un contretemps interne en
 * panne apparente — et un abandon est de toute facon deja marque `silent` par le moteur.
 */
async function lireUnWidget(
    nom: RunnableBlueprintName | string,
    options: OptionsLecture,
): Promise<LectureWidget> {
    const blueprint = nom as RunnableBlueprintName;

    const reserve = await surLeNavigateur(
        blueprint,
        (signal) => runBlueprint(blueprint, { signal }),
        {
            priorite: 'arriere-plan',
            ...(options.signal !== undefined ? { signal: options.signal } : {}),
        },
    );

    if (reserve.ok === false) {
        console.warn(`[widgets] ${blueprint} saute : le moteur joue ${reserve.occupePar}`);
        return { ok: false, echec: null };
    }

    // Un run abandonne en vol n'a rien a rendre, meme s'il a eu le temps d'aboutir : la valeur
    // appartient a un compte ou a un etablissement qu'on est en train de quitter.
    if (abandonnee(options)) return { ok: false, echec: null };

    const run = reserve.valeur;
    if (run.ok === false) {
        reportFailure(blueprint, run.failure);
        // Un run annule — l'utilisateur est parti, l'application est passee en arriere-plan — n'a
        // rien a dire non plus : `silent` porte deja cette distinction.
        return { ok: false, echec: run.failure.silent === true ? null : run.failure };
    }

    return { ok: true, valeur: projeterWidget(run.outputs, maintenant().toISOString()) };
}

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
        if (options.signal?.aborted === true) break;

        const source = sourceDuWidget(definition.point);
        if (source === null) continue;

        const peremption = source.peremptionMin ?? definition.peremptionMin;
        if (options.force !== true && valeurFraiche(connues[definition.point], peremption, instant)) {
            continue;
        }

        options.onEnCours?.(definition.point);
        const lu = await lireUnWidget(source.nom, options);
        options.onEnCours?.(null);

        if (lu.ok === true) {
            obtenues[definition.point] = lu.valeur;
            options.onValeur?.(definition.point, lu.valeur);
        } else if (lu.echec !== null) {
            options.onEchec?.(definition.point, lu.echec);
        }
    }

    return obtenues;
}

type LectureWidget =
    | { readonly ok: true; readonly valeur: ValeurWidget }
    | { readonly ok: false; readonly echec: UkitFailure | null };

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
    options: OptionsRafraichissement,
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

    const run = reserve.valeur;
    if (run.ok === false) {
        reportFailure(blueprint, run.failure);
        // Un run annule — l'utilisateur est parti, l'application est passee en arriere-plan — n'a
        // rien a dire non plus : `silent` porte deja cette distinction.
        return { ok: false, echec: run.failure.silent === true ? null : run.failure };
    }

    return { ok: true, valeur: projeterWidget(run.outputs, maintenant().toISOString()) };
}

/**
 * La journee en une carte (docs/phase-8/6-intelligence.md) : ce que la carte du jour montre, et quand
 * elle se tait. Pur : les elements du jour arrivent deja fusionnes (cours, telephone, campus), l'heure
 * en minutes depuis minuit ; le composant dessine (CarteDuJour.tsx).
 *
 * La carte ne repete pas la frise : elle dit la forme entiere de la journee — du premier debut a la
 * derniere fin, les cours sur une jauge, les trous —, le trou de midi et ce qui a change. Elle se tait
 * un jour sans element, une journee finie, et une journee sans trou, quand rien n'a change : la frise
 * dit deja tout de celle-la. Un changement la garde, journee finie comprise.
 */

import type { Changement } from './changements';
import { minutesDe } from './frise';

/** Ce que la carte lit d'un element de la journee. Un `PlanningEvent` en est un. */
export interface ElementDuJour {
    readonly starttime: string;
    readonly endtime: string;
    readonly source?: 'telephone';
    readonly journeeEntiere?: boolean;
}

/** Un ecart entre deux elements qui merite son nom : en dessous, c'est une pause, que la frise cote. */
export const TROU_MINIMAL = 45;

export interface Plage {
    readonly debut: number;
    readonly fin: number;
}

/** Les elements qui ont des heures lisibles, en plages, dans l'ordre du debut. */
function plagesDe<T extends ElementDuJour>(elements: readonly T[]): { element: T; plage: Plage }[] {
    const plages: { element: T; plage: Plage }[] = [];
    for (const element of elements) {
        if (element.journeeEntiere === true) continue;
        const debut = minutesDe(element.starttime);
        const fin = minutesDe(element.endtime);
        if (debut === null || fin === null || fin <= debut) continue;
        plages.push({ element, plage: { debut, fin } });
    }
    return plages.sort((a, b) => a.plage.debut - b.plage.debut || a.plage.fin - b.plage.fin);
}

/** Les plages fondues quand elles se recouvrent ; deux cours qui se touchent restent deux. */
function occupees(plages: readonly Plage[]): Plage[] {
    const blocs: Plage[] = [];
    for (const plage of plages) {
        const dernier = blocs[blocs.length - 1];
        if (dernier !== undefined && plage.debut < dernier.fin) blocs[blocs.length - 1] = { debut: dernier.debut, fin: Math.max(dernier.fin, plage.fin) };
        else blocs.push({ ...plage });
    }
    return blocs;
}

export interface Trou<T> extends Plage {
    /** L'element qui finit le trou ; le cours qui suit se cherche a partir de lui. */
    readonly suivants: readonly T[];
}

/**
 * Les trous de la journee : les ecarts de `TROU_MINIMAL` ou plus entre deux elements, une fois les
 * elements superposes fondus. Les evenements du telephone occupent la journee comme des cours : un
 * dejeuner note dans l'agenda n'est pas un trou.
 */
export function trousDuJour<T extends ElementDuJour>(elements: readonly T[]): Trou<T>[] {
    const plages = plagesDe(elements);
    const trous: Trou<T>[] = [];
    let finOccupee: number | null = null;
    plages.forEach(({ plage }, rang) => {
        if (finOccupee !== null && plage.debut - finOccupee >= TROU_MINIMAL) {
            trous.push({ debut: finOccupee, fin: plage.debut, suivants: plages.slice(rang).map((p) => p.element) });
        }
        finOccupee = Math.max(finOccupee ?? plage.fin, plage.fin);
    });
    return trous;
}

export interface ModeleDeLaCarte {
    /** La jauge, a partir de deux elements ; `null` sinon. */
    readonly jauge: {
        readonly debut: number;
        readonly fin: number;
        /**
         * Les plages occupees, cours superposes fondus : une teinte, celle du Planning. Les couleurs des
         * cours y faisaient un rouge et un vert qui se lisaient comme un etat (banc du 2026-11-25).
         */
        readonly segments: readonly Plage[];
        /** L'heure, si elle tombe dans la journee. */
        readonly maintenant: number | null;
    } | null;
    /** Les cours seuls : les evenements du telephone et du campus ne se comptent pas (lot 5). */
    readonly nombreDeCours: number;
    readonly trous: readonly Plage[];
    readonly dureeDesTrous: number;
    readonly changements: readonly Changement[];
}

/**
 * La carte d'aujourd'hui a la minute donnee, ou `null` quand elle n'a rien a dire. Le trou de midi se
 * decide a part (ouManger.ts) : il demande des restaurants, que ce module ne lit pas.
 */
export function composerLaCarte(
    elements: readonly ElementDuJour[],
    minute: number,
    changements: readonly Changement[],
): ModeleDeLaCarte | null {
    const plages = plagesDe(elements);
    const debut = plages[0]?.plage.debut ?? 0;
    const fin = Math.max(...plages.map((p) => p.plage.fin));
    // La journee finie, sa forme ne sert plus ; ce qui y a change se dit encore — la carte est le seul
    // endroit du jour ou un cours retire se lit, les bandeaux le taisent sous elle (ScheduleList).
    const finie = plages.length === 0 || minute >= fin;
    if (finie && changements.length === 0) return null;

    const trous = finie ? [] : trousDuJour(elements).map(({ debut: d, fin: f }) => ({ debut: d, fin: f }));
    const jauge = finie || plages.length < 2 ? null : {
        debut,
        fin,
        segments: occupees(plages.map(({ plage }) => plage)),
        maintenant: minute >= debut && minute < fin ? minute : null,
    };
    // Une journee d'un bloc, sans rien de change, la frise la dit deja juste dessous (banc du 2026-11-25).
    if (changements.length === 0 && (jauge === null || trous.length === 0)) return null;

    return {
        jauge,
        nombreDeCours: plages.filter(({ element }) => element.source !== 'telephone').length,
        trous,
        dureeDesTrous: trous.reduce((total, trou) => total + trou.fin - trou.debut, 0),
        changements,
    };
}

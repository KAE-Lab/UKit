/**
 * Les creneaux libres en commun avec un ami (docs/phase-8/8-amis.md). Pur : les heures occupees de
 * chacun arrivent deja lues, en minutes depuis minuit.
 *
 * **Ils prolongent les trous de la journee** du lot 6 (`trousDuJour`) : un creneau commun est un
 * moment ou les deux sont libres pendant la journee de cours de l'un ou de l'autre — du premier cours
 * qui commence au dernier qui finit, des deux emplois du temps reunis —, de `TROU_MINIMAL` ou plus.
 * Sans ami, c'est exactement un trou de sa propre journee ; avec un ami, c'est aussi le dejeuner apres
 * son dernier cours du matin, quand l'autre attend le sien de l'apres-midi. Avant le premier cours et
 * apres le dernier, personne n'est sur le campus : rien ne s'y propose.
 */

import { TROU_MINIMAL, type Plage } from '../../Planning/services/carteDuJour';
import { minutesDe } from '../../Planning/services/frise';
import { MIDI, TROU_DE_MIDI_MINIMAL } from '../../Planning/services/ouManger';
import { fondre } from './instantane';

/** Le libre d'une personne dans une borne : la borne, moins ses plages occupees. */
function libreDans(borne: Plage, occupe: readonly Plage[]): Plage[] {
    const libres: Plage[] = [];
    let curseur = borne.debut;
    for (const plage of fondre(occupe)) {
        if (plage.fin <= curseur) continue;
        if (plage.debut >= borne.fin) break;
        if (plage.debut > curseur) libres.push({ debut: curseur, fin: Math.min(plage.debut, borne.fin) });
        curseur = Math.max(curseur, plage.fin);
    }
    if (curseur < borne.fin) libres.push({ debut: curseur, fin: borne.fin });
    return libres;
}

function intersection(a: readonly Plage[], b: readonly Plage[]): Plage[] {
    const communs: Plage[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        const debut = Math.max(a[i].debut, b[j].debut);
        const fin = Math.min(a[i].fin, b[j].fin);
        if (fin > debut) communs.push({ debut, fin });
        if (a[i].fin < b[j].fin) i += 1;
        else j += 1;
    }
    return communs;
}

/**
 * Les creneaux de `TROU_MINIMAL` ou plus ou les deux sont libres, dans la journee de cours reunie.
 * Un jour ou ni l'un ni l'autre n'a cours n'en a aucun : un samedi libre n'est pas un rendez-vous.
 */
export function creneauxCommuns(miens: readonly Plage[], siens: readonly Plage[]): Plage[] {
    const tous = [...miens, ...siens].filter((p) => p.fin > p.debut);
    if (tous.length === 0) return [];
    const borne = { debut: Math.min(...tous.map((p) => p.debut)), fin: Math.max(...tous.map((p) => p.fin)) };
    return intersection(libreDans(borne, miens), libreDans(borne, siens)).filter((p) => p.fin - p.debut >= TROU_MINIMAL);
}

/**
 * La part de midi d'un creneau commun, celle du lot 6 (`trouDeMidi`) : entre 11 h 30 et 14 h, de
 * `TROU_DE_MIDI_MINIMAL` ou plus ; `null` sinon.
 */
export function partDeMidi(creneau: Plage): Plage | null {
    const debut = Math.max(creneau.debut, MIDI.debut);
    const fin = Math.min(creneau.fin, MIDI.fin);
    return fin - debut >= TROU_DE_MIDI_MINIMAL ? { debut, fin } : null;
}

/** Ce qui reste a venir d'un creneau a la minute donnee ; `null` s'il est fini ou trop court. */
export function resteDuCreneau(creneau: Plage, minute: number | null): Plage | null {
    if (minute === null || minute <= creneau.debut) return creneau;
    return creneau.fin - minute >= TROU_MINIMAL ? { debut: minute, fin: creneau.fin } : null;
}

/** Un jour de la semaine commune : sa date, et ses creneaux a venir. */
export interface JourCommun {
    readonly date: string;
    readonly creneaux: readonly Plage[];
}

/**
 * Les creneaux communs d'une semaine, jour par jour, a partir d'aujourd'hui : un jour passe ne sert a
 * rien, et aujourd'hui ne garde que ce qui reste (`resteDuCreneau`). Un jour ou l'un des deux est
 * **inconnu** (`null`, hors de l'instantane de l'ami) ne se calcule pas : il n'est pas libre. Les jours
 * sans creneau commun ne sont pas rendus.
 */
export function semaineCommune(
    jours: readonly { readonly date: string; readonly miens: readonly Plage[] | null; readonly siens: readonly Plage[] | null }[],
    aujourdhui: string,
    minute: number,
): JourCommun[] {
    const communs: JourCommun[] = [];
    for (const { date, miens, siens } of jours) {
        if (date < aujourdhui || miens === null || siens === null) continue;
        const tous = creneauxCommuns(miens, siens);
        const creneaux = date === aujourdhui ? tous.map((c) => resteDuCreneau(c, minute)).filter((c): c is Plage => c !== null) : tous;
        if (creneaux.length > 0) communs.push({ date, creneaux });
    }
    return communs;
}

/** Le premier element qui commence a la fin du creneau ou apres : celui dont le batiment compte. */
export function premierApres<T extends { readonly starttime: string; readonly source?: 'telephone' }>(elements: readonly T[], minute: number): T | null {
    let meilleur: T | null = null;
    let debutDuMeilleur = Infinity;
    for (const element of elements) {
        const debut = minutesDe(element.starttime);
        if (element.source === 'telephone' || debut === null || debut < minute || debut >= debutDuMeilleur) continue;
        meilleur = element;
        debutDuMeilleur = debut;
    }
    return meilleur;
}

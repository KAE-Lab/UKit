/**
 * Quand demander « Ça attend ? » (docs/phase-8/README.md, « Attente au RU ») : aux heures du service
 * lues dans la source, a l'ouverture de la fiche du restaurant, et, si la position est accordee,
 * seulement a proximite — calcule ici, sur l'appareil. Pur : l'heure et la position arrivent en
 * parametre.
 *
 * La source ne declare pas ses services ; elle les ecrit (« SELF : 11h30 - 13h45 », « du lundi au
 * vendredi »). On n'en lit que les creneaux et une portee de jours ; ce qui ne se lit pas ne fait pas
 * poser la question, et l'attente reste a signaler depuis la feuille.
 */

import { getDistanceInKm } from '../services/distance';

export interface CreneauDeService {
    readonly debut: number;
    readonly fin: number;
}

/** Un etudiant a la porte du restaurant, ou dans sa file : quelques centaines de metres. */
export const RAYON_DE_PROXIMITE_KM = 0.4;
/** La file se forme avant l'ouverture et dure apres la derniere entree. */
const MARGE_MINUTES = 15;

const CRENEAU = /(\d{1,2})\s*[hH:]\s*(\d{2})?\s*(?:-|–|à|a|au|jusqu'?à)\s*(\d{1,2})\s*[hH:]\s*(\d{2})?/g;
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const PORTEE = /du\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+au\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i;

/** Les creneaux lus dans les lignes d'horaires, en minutes depuis minuit. */
export function creneauxDeService(lignes: readonly string[]): readonly CreneauDeService[] {
    const creneaux: CreneauDeService[] = [];
    for (const ligne of lignes) {
        for (const m of ligne.matchAll(CRENEAU)) {
            const debut = Number(m[1]) * 60 + Number(m[2] ?? 0);
            const fin = Number(m[3]) * 60 + Number(m[4] ?? 0);
            if (debut < fin && fin <= 24 * 60) creneaux.push({ debut, fin });
        }
    }
    return creneaux;
}

/**
 * Le jour de la semaine (0 dimanche) est-il dans la portee « du lundi au vendredi » des lignes ? Sans
 * portee, oui. Lu aussi par le trou de midi du Planning (ouManger.ts), qui juge un restaurant ouvert.
 */
export function jourOuvre(lignes: readonly string[], jour: number): boolean {
    for (const ligne of lignes) {
        const m = PORTEE.exec(ligne);
        if (m === null) continue;
        const de = JOURS.indexOf((m[1] ?? '').toLowerCase());
        const a = JOURS.indexOf((m[2] ?? '').toLowerCase());
        return de <= a ? jour >= de && jour <= a : jour >= de || jour <= a;
    }
    return true;
}

/**
 * Les lignes du service ou l'on fait la queue : celles du self quand la source le nomme — une cafeteria
 * ouverte de 8 h a 16 h ne doit pas faire poser la question toute la journee —, sinon toutes.
 */
function lignesDuSelf(lignes: readonly string[]): readonly string[] {
    const self = lignes.filter((ligne) => /\bself\b/i.test(ligne));
    return self.length > 0 ? self : lignes;
}

/**
 * L'instant est-il dans un service lu (marges comprises), un jour ou le restaurant sert ? L'heure est
 * celle de l'appareil : le parc est a Bordeaux (annonces/ordre.ts).
 */
export function enService(lignes: readonly string[], maintenant: Date): boolean {
    if (!jourOuvre(lignes, maintenant.getDay())) return false;
    const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
    return creneauxDeService(lignesDuSelf(lignes)).some((c) => minutes >= c.debut - MARGE_MINUTES && minutes <= c.fin + MARGE_MINUTES);
}

export interface Position { readonly lat: number; readonly lon: number }

/**
 * La question se pose : en service, et a proximite quand la position est connue. Sans position — refusee,
 * ou pas encore lue —, elle se pose quand meme : c'est la regle du plan.
 */
export function poserLaQuestionDeLAttente(lignes: readonly string[], maintenant: Date, position: Position | null, lieu: Position | null): boolean {
    if (!enService(lignes, maintenant)) return false;
    if (position === null || lieu === null) return true;
    return getDistanceInKm(position.lat, position.lon, lieu.lat, lieu.lon) <= RAYON_DE_PROXIMITE_KM;
}

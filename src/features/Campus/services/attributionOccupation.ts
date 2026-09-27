/**
 * Les evenements d'un run d'occupation groupe, rendus a leurs salles : pur et teste.
 *
 * Celcat ne dit pas pour quelle ressource interrogee il rend un evenement, mais la description de
 * chacun nomme sa salle. La regle portee ici est celle de la sonde du jalon 7-C
 * (sondes/mesures/comparaison.py), mesuree sur les dix-sept salles de l'A28 et trois journees :
 * 109 attributions justes, aucune fausse. Un cours multi-salles etait present dans le run individuel
 * de chacune : un evenement va donc a **chaque** salle qu'il nomme.
 *
 * La description arrive deja decodee (projeterOccupation, CampusApiMapping.ts) : les entites HTML de
 * Celcat — `B&#226;t.` — ne peuvent plus masquer un nom.
 *
 * Un evenement de vacances ne nomme aucune salle, et c'est lui qui ferme le batiment
 * (useFreeRoomsData) : il va a toutes les salles, comme le run de chacune le rendait. Tout autre
 * evenement qui n'en nomme aucune n'a nulle part ou aller ; il est ecarte, et compte.
 *
 * Voir docs/features/campus-salles-libres.md.
 */

import type { CampusEvent } from './CampusApiMapping';
import type { RoomInfo } from './FreeRoomService';
import type { OccupationSalle } from './occupationCache';

interface AttributionOccupation {
    /** Une entree par salle, dans l'ordre recu ; le lot a repondu, donc chacune est `ok`. */
    readonly salles: OccupationSalle[];
    /** Les evenements hors vacances qui ne nomment aucune salle du lot. */
    readonly ecartes: number;
}

/** Blancs ramenes a une espace, minuscules : la description et le libelle se comparent sous cette forme. */
function normaliser(texte: string): string {
    return texte.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Les formes sous lesquelles une description nomme une salle : le libelle entier, puis sans sa
 * parenthese finale — Celcat ecrit `… Salle 005 (… Salle 005)` a l'inventaire, `… Salle 005` au cours.
 */
function formesDuLibelle(libelle: string): string[] {
    const entier = normaliser(libelle);
    const sansParenthese = entier.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const formes = sansParenthese !== '' && sansParenthese !== entier ? [entier, sansParenthese] : [entier];
    return formes.filter((forme) => forme !== '');
}

export function attribuerOccupation(
    salles: readonly Pick<RoomInfo, 'id' | 'fullName'>[],
    evenements: readonly CampusEvent[],
): AttributionOccupation {
    const formes = salles.map((salle) => formesDuLibelle(salle.fullName));
    const parSalle: CampusEvent[][] = salles.map(() => []);
    let ecartes = 0;

    for (const evenement of evenements) {
        if (evenement.isVacances) {
            for (const liste of parSalle) liste.push(evenement);
            continue;
        }
        const texte = normaliser(evenement.description);
        const nommees = formes.flatMap((formesDeLaSalle, index) =>
            formesDeLaSalle.some((forme) => texte.includes(forme)) ? [index] : [],
        );
        if (nommees.length === 0) ecartes += 1;
        for (const index of nommees) parSalle[index].push(evenement);
    }

    return {
        salles: salles.map((salle, index) => ({ roomId: salle.id, ok: true, events: parSalle[index] })),
        ecartes,
    };
}

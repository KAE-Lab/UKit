/**
 * Les observateurs d'echec de run : un registre pur, sans rien importer de la plateforme.
 *
 * C'est le point de branchement de la mesure (jalon 7-D, `source.echec`) — et il doit rester un
 * registre pur, parce que le cycle d'import est deja ferme d'un cote : `AppCore` importe
 * `PlanningApiService`, qui importe `runBlueprint`. Si `runBlueprint` importait la mesure, qui lit un
 * reglage, le cercle serait boucle. Ici, `runBlueprint` signale ; qui veut ecouter s'abonne.
 *
 * Un run que le disjoncteur court-circuite n'est **pas** signale : il n'y a pas eu de run, et la
 * mesure compterait des dizaines d'echecs fictifs par minute.
 */

import type { Origine } from './disjoncteur';
import type { UkitFailureKind } from './failures';

export interface EchecDeRun {
    readonly nom: string;
    readonly hote: string;
    readonly famille: UkitFailureKind;
    readonly origine: Origine;
}

export type AbonneEchec = (echec: EchecDeRun) => void;

const abonnes = new Set<AbonneEchec>();

/** S'abonne aux echecs non silencieux ; rend le desabonnement. */
export function onEchecDeRun(abonne: AbonneEchec): () => void {
    abonnes.add(abonne);
    return () => {
        abonnes.delete(abonne);
    };
}

/** Appele par `runBlueprint` sur tout echec non silencieux. Un abonne qui leve n'empeche pas les autres. */
export function signalerEchec(echec: EchecDeRun): void {
    for (const abonne of abonnes) {
        try {
            abonne(echec);
        } catch (erreur) {
            console.warn('[aetherius] un observateur d echec a leve', erreur);
        }
    }
}

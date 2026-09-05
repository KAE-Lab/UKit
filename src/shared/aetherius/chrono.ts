/**
 * Le chrono d'un run : lire ou part le temps, au lieu de le supposer (jalon 6.1-D, S7).
 *
 * Les attentes des Blueprints de portail ont ete calees a la main sur le pire cas du jour ou elles
 * ont ete ecrites, et elles sont payees en entier a chaque run — d'ou les widgets qui mettent une
 * minute a se remplir. Les resserrer demande de savoir quelle cascade coute quoi, et le moteur le
 * sait deja : `Result.step_results` porte une duree par step. Le poste l'imprime (`aetherius run`
 * rend une table Step / Action / Status / Duration) ; l'appareil ne l'imprimait nulle part, et une
 * mesure « en cellulaire » se faisait donc au chronometre a la main.
 *
 * Le detail par step part dans la console de Metro, sous `__DEV__` seulement — meme instrument et
 * meme prefixe que les reperes de demarrage ([`services/Chrono.ts`](../services/Chrono.ts)). La
 * duree **totale**, elle, remonte a l'appelant : le panneau Blueprints du menu l'affiche, et ce menu
 * existe en production (docs/qualite.md), donc la mesure reste faisable sur un vrai build.
 *
 * L'horloge est la vraie. `Date.now` et non `maintenantMs` : la simulation temporelle du menu
 * deplace `moment.now`, et une duree mesuree sur une horloge deplacable ne veut rien dire — c'est la
 * regle deja ecrite dans [`services/Temps.ts`](../services/Temps.ts) pour les traces de diagnostic.
 *
 * Voir docs/qualite.md et docs/phase-6/6-1-d-publication.md.
 */

import type { Result } from '@aetherius/engine';

/** L'instant d'un chrono, sur l'horloge reelle. */
export function debutDeRun(): number {
    return Date.now();
}

/**
 * Ecrit le detail d'un run dans la console de developpement.
 *
 * *resultat* manque quand le run n'a pas atteint le moteur — un Blueprint introuvable, un refus de
 * validation : il reste alors une duree totale, qui est deja l'information utile.
 *
 * Les steps sont numerotes dans l'ordre du fichier, sauts compris (un step saute par `when` produit
 * une ligne `skipped`) : l'index d'une ligne est donc celui du step dans le Blueprint, ce qui rend la
 * lecture directe fichier en main.
 */
export function chronometrer(nom: string, dureeMs: number, resultat?: Result): void {
    if (!__DEV__) return;

    const etat = resultat?.status ?? 'interrompu';
    console.info(`[chrono] ${nom} ${etat} ${Math.round(dureeMs)} ms`);

    resultat?.step_results.forEach((step, index) => {
        const cible = step.step_id === null ? step.action : `${step.action} ${step.step_id}`;
        console.info(`[chrono]   #${index} ${cible} ${step.status} ${Math.round(step.duration_ms)} ms`);
    });
}

/** Une duree lisible d'un coup d'oeil sur un telephone : `8,4 s`. */
export function dureeLisible(dureeMs: number): string {
    return `${(dureeMs / 1000).toFixed(1).replace('.', ',')} s`;
}

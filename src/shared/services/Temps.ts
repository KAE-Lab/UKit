/**
 * L'heure courante de l'application — **une seule** lecture, pour qu'elle soit simulable.
 *
 * ## Le defaut que ce module supprime
 *
 * `TimeMockService` simule une date en remplacant `moment.now`, et rien d'autre. C'est efficace et
 * peu couteux, mais ca cree une regle invisible : **`moment()` suit la date simulee, `new Date()` ne
 * la suit pas.** Rien dans le code ne le rappelle, et le depot s'y est repris a plusieurs fois — un
 * commentaire de `useFreeRoomsData` porte deja la lecon, apprise sur un batiment qui restait ferme un
 * jour de cours simule.
 *
 * Le meme defaut a ete signale le 2026-08-29 sur l'onglet Scolarite : la **date** sous la salutation
 * suivait la simulation (elle passe par `moment`) pendant que la **salutation elle-meme** restait sur
 * l'heure reelle (elle passait par `new Date`). Deux lignes voisines, deux jours differents.
 *
 * ## La regle
 *
 * **Tout ce qui decide de quelque chose a partir de « maintenant » passe par ici.** Un affichage, un
 * choix de message, une peremption, une borne de calendrier.
 *
 * **Ce qui n'en releve pas**, et qui doit garder l'horloge reelle : la programmation d'une
 * notification (elle doit sonner a l'heure vraie), les horodatages de cache (les simuler ferait
 * expirer ou ressusciter des entrees sans rapport), et les traces de diagnostic.
 *
 * ## Pourquoi un module a part
 *
 * Il n'importe que `moment`. `TimeMockService`, lui, tire `AsyncStorage` et `react-native` — l'appeler
 * depuis un module pur le rendrait injouable sous vitest, ce qui est exactement ce que la separation
 * du depot cherche a eviter. Les fonctions **pures** ne lisent d'ailleurs pas l'heure du tout : elles
 * la recoivent en parametre (`valeurFraiche`, `choisirSalutation`), et c'est leur appelant qui vient
 * la chercher ici.
 */

import moment from 'moment';

/** L'instant courant en millisecondes — simule quand le menu developpeur l'est. */
export function maintenantMs(): number {
    // `moment.now` et non `Date.now` : c'est le seul point que `TimeMockService` deplace.
    return moment.now();
}

/** L'instant courant. Le pendant de `new Date()`, en respectant la simulation. */
export function maintenant(): Date {
    return new Date(maintenantMs());
}

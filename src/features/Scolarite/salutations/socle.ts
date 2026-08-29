/**
 * Le socle des salutations : ce que l'application dit sans avoir jamais contacte le reseau.
 *
 * Il n'est **jamais optionnel** — meme regle que le socle des Blueprints et celui du catalogue : une
 * application doit fonctionner au premier lancement, hors ligne. Le distant ne fait que l'etendre.
 *
 * **Les priorites sont espacees de dix**, et c'est deliberé : une regle publiee doit pouvoir se
 * glisser *entre* deux regles embarquees sans qu'on ait a republier l'application. Numeroter de un en
 * un aurait rendu chaque insertion impossible sans release, c'est-a-dire aurait detruit l'interet.
 */

import type { RegleSalutation } from './regles';

export const SALUTATIONS_SOCLE: readonly RegleSalutation[] = [
    // Le repli absolu : aucune condition, donc toujours vrai. Il garantit qu'il y a **toujours**
    // quelque chose a afficher, y compris si une regle plus fine se revele mal ecrite.
    { id: 'socle.jour', priorite: 0, condition: {}, cle: 'GREETING_DAY' },
    // Le decoupage de la journee. « Bonsoir » commencait a 19 h en dur ; il commence toujours a 19 h,
    // mais c'est desormais une donnee — et la nuit existe, ce qui n'etait pas le cas.
    { id: 'socle.matin', priorite: 10, condition: { heures: { de: 5, a: 12 } }, cle: 'GREETING_MORNING' },
    { id: 'socle.soir', priorite: 10, condition: { heures: { de: 19, a: 23 } }, cle: 'GREETING_EVENING' },
    { id: 'socle.nuit', priorite: 10, condition: { heures: { de: 23, a: 5 } }, cle: 'GREETING_NIGHT' },
    // Le week-end passe devant l'heure : « Bon week-end » vaut mieux que « Bonsoir » un samedi soir.
    { id: 'socle.weekend', priorite: 20, condition: { jours: [0, 6], heures: { de: 5, a: 23 } }, cle: 'GREETING_WEEKEND' },
    // L'anniversaire passe devant tout le reste du socle. C'est le seul message qui parle de la
    // personne et non du moment, et rien du calendrier ne doit le recouvrir.
    { id: 'socle.anniversaire', priorite: 90, condition: { anniversaire: true }, cle: 'HAPPY_BIRTHDAY' },
];

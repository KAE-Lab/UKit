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
    // La soiree passe minuit : « Bonsoir » de 19 h a 4 h, « Bonjour » couvre le reste par le repli.
    // Le socle s'est reduit a ces deux moments — matin, nuit et week-end multipliaient les variantes
    // pour un accueil qu'on ne relit pas, et un mot de circonstance reste possible par une regle
    // publiee : c'est exactement le role de la table.
    { id: 'socle.soir', priorite: 10, condition: { heures: { de: 19, a: 4 } }, cle: 'GREETING_EVENING' },
    // L'anniversaire passe devant tout le reste du socle. C'est le seul message qui parle de la
    // personne et non du moment, et rien du calendrier ne doit le recouvrir.
    { id: 'socle.anniversaire', priorite: 90, condition: { anniversaire: true }, cle: 'HAPPY_BIRTHDAY' },
];

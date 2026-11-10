/**
 * Un groupe favori qui n'a plus de cours : « Journee libre » n'est alors pas la bonne reponse.
 *
 * Retour d'un utilisateur, recu le 2026-09-17 : « le planning affiche journee libre tout le
 * semestre ». Son favori etait le groupe de l'annee passee ; a la rentree Celcat en publie de
 * nouveaux, et l'ancien ne porte plus rien. Une journee vide ne se distingue pas, a elle seule, d'un
 * groupe eteint : il faut regarder autour. La regle : **aucun cours sur quatre semaines avant et
 * quatre apres** le jour affiche. Deux semaines de vacances de Noel ne la declenchent pas ; un ete
 * entier, si — c'est alors un fait, et la phrase dit « peut-etre ».
 *
 * Pur, sans dependance de plateforme : groupeInactif.test.ts. L'annee lue vient de
 * `anneeDesFavoris`, partagee avec les propositions du dossier.
 *
 * Voir docs/features/planning.md.
 */

import moment from 'moment';

/** La demi-fenetre, en jours, de part et d'autre du jour affiche. */
export const DEMI_FENETRE_JOURS = 28;

/**
 * Le groupe est-il eteint autour de ce jour ? `cours` est l'annee **non filtree** des favoris : un
 * cours masque par un filtre d'UE existe, et le groupe n'a pas change pour autant.
 */
export function estGroupeInactif(
    cours: ReadonlyArray<{ date?: { start?: string } }>,
    jour: moment.MomentInput,
    demiFenetre: number = DEMI_FENETRE_JOURS,
): boolean {
    const debut = moment(jour).startOf('day').subtract(demiFenetre, 'days').valueOf();
    const fin = moment(jour).endOf('day').add(demiFenetre, 'days').valueOf();
    return !cours.some((un) => {
        const instant = un.date?.start !== undefined ? Date.parse(un.date.start) : Number.NaN;
        return Number.isFinite(instant) && instant >= debut && instant <= fin;
    });
}

/**
 * Le retour au premier plan, et lui seul.
 *
 * `AppState` emet `active` dans deux situations qui n'ont rien a voir : le retour d'arriere-plan, et
 * la fin d'une interruption — centre de controle tire, invite systeme, invite Face ID — qui ne passe
 * que par `inactive`. Relire la base ou rejouer un widget dans le second cas est du travail pour rien,
 * et c'est ce que faisaient les six rafraichissements du conteneur racine et les widgets de la
 * scolarite avant 6.1-C : ouvrir l'onglet Scolarite jouait ses widgets deux fois, la seconde juste
 * apres Face ID. Ce detecteur ne dit « retour » qu'apres un vrai passage en arriere-plan.
 *
 * Pur, sans React Native, pour etre jouable sous vitest. La couture de plateforme est `premierPlan.ts`.
 */

export type EtatApplication = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export class DetecteurDeRetour {
    private enArrierePlan = false;

    /** Enregistre une transition, et dit si elle est un retour au premier plan. */
    transition(etat: EtatApplication): boolean {
        if (etat === 'background') {
            this.enArrierePlan = true;
            return false;
        }
        if (etat === 'active' && this.enArrierePlan) {
            this.enArrierePlan = false;
            return true;
        }
        return false;
    }
}

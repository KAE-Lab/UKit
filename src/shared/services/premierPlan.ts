/**
 * La couture de plateforme du retour au premier plan : un seul abonnement `AppState` pour toute
 * l'application, et des abonnes qui ne sont prevenus qu'apres un vrai passage en arriere-plan
 * (`retourAuPremierPlan.ts`, qui porte la regle et son test).
 *
 * Consommateurs : le conteneur racine (les six rafraichissements de donnee publiee), les annonces
 * (relues au retour, pour qu'un contenu publie atteigne un ecran deja monte), le Planning (le jour
 * courant recalcule apres minuit) et les widgets de la scolarite. Voir docs/architecture.md.
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { DetecteurDeRetour } from './retourAuPremierPlan';

const abonnes = new Set<() => void>();
const detecteur = new DetecteurDeRetour();
let branche = false;

/** L'abonnement systeme vit avec l'application ; il n'est pose qu'au premier abonne, jamais a l'import. */
function brancher(): void {
    if (branche) return;
    branche = true;
    AppState.addEventListener('change', (etat) => {
        if (!detecteur.transition(etat)) return;
        // Une copie : un abonne peut se desabonner en etant prevenu.
        for (const abonne of [...abonnes]) abonne();
    });
}

/** S'abonne au retour au premier plan ; rend la fonction de desabonnement. */
export function onRetourAuPremierPlan(abonne: () => void): () => void {
    brancher();
    abonnes.add(abonne);
    return () => {
        abonnes.delete(abonne);
    };
}

/** La forme hook : le rappel est relu au moment de l'appel, jamais capture au montage. */
export function useRetourAuPremierPlan(rappel: () => void): void {
    const rappelRef = useRef(rappel);
    rappelRef.current = rappel;
    useEffect(() => onRetourAuPremierPlan(() => rappelRef.current()), []);
}

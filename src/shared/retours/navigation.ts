/**
 * La navigation vue d'en dehors des ecrans (lot 3) : l'hote des retours ouvre « Mes retours » ou le
 * formulaire depuis la racine, et le parcours de la session note chaque ecran affiche. La reference est
 * celle du `NavigationContainer` (rootContainer.tsx), comme le guide « Navigating without the
 * navigation prop » de React Navigation le recommande.
 */

import { createNavigationContainerRef, type ParamListBase } from '@react-navigation/native';

export const navigationRacine = createNavigationContainerRef<ParamListBase>();

/** Va a une route de la pile racine, si la navigation est prete ; rien sinon. */
export function allerA(route: string, params?: object): void {
    if (!navigationRacine.isReady()) return;
    (navigationRacine.navigate as (nom: string, p?: object) => void)(route, params);
}

/** Le nom de l'ecran affiche, pour le parcours de la session ; jamais ses parametres. */
export function ecranCourant(): string | undefined {
    return navigationRacine.isReady() ? navigationRacine.getCurrentRoute()?.name : undefined;
}

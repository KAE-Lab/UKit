/**
 * Le rappel des regles de la communaute, une fois, d'un toucher, a la premiere contribution
 * (docs/phase-8/README.md, « Conditions d'utilisation ») : pas d'ecran d'acceptation, une information.
 * Ce qui est retenu tient en une marque sur l'appareil ; une reinstallation la perd, comme elle perd la
 * cle de l'appareil, et le rappel revient avec elle.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = 'communaute-regles-rappelees@1';

/** Le rappel a-t-il deja ete montre ? Un stockage illisible vaut « non » : le rappel de trop coute moins qu'aucun. */
export async function reglesDejaRappelees(): Promise<boolean> {
    return (await AsyncStorage.getItem(CLE).catch(() => null)) !== null;
}

export async function retenirLeRappel(): Promise<void> {
    await AsyncStorage.setItem(CLE, '1').catch(() => undefined);
}

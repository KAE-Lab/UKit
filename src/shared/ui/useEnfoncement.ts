/**
 * L'enfoncement d'une surface sous le doigt : une echelle de `tokens.mouvement.pression`, au ressort
 * de l'application (jalon 7-I pour la carte, partage au 7-J avec la carte de cours).
 *
 * **Une surface pressee se reduit, elle ne palit pas.** L'opacite d'appui s'applique vue par vue sur
 * Android, la ou iOS compose le groupe : deux couches empilees y deviennent translucides l'une sur
 * l'autre. Une echelle ne traverse rien, et elle se sent au lieu de se voir.
 *
 * Reanimated applique de lui-meme « reduire les animations » au ressort : l'echelle saute alors a sa
 * valeur, sans glisser.
 */

import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { tokens } from '../theme/tokens';

const { pression, ressort } = tokens.mouvement;

export function useEnfoncement() {
    const echelle = useSharedValue(1);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
    return {
        style,
        onPressIn: () => { echelle.value = withSpring(pression, ressort); },
        onPressOut: () => { echelle.value = withSpring(1, ressort); },
    };
}

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useReponsesNonLues } from '../retours/useRetours';
import { tokens, type AppThemeType } from '../theme/Theme';
import { Icon } from '../ui/Icon';
import { PointDeCouleur } from '../ui/PointDeCouleur';

/**
 * L'icone des Reglages, et le point plein et immobile qui dit qu'une reponse de l'equipe attend dans
 * « Mes retours » (lot 3 de la 7.0) — un etat, pas un appel : il ne pulse pas (docs/theme.md).
 */
export function IconeDesReglages({ color, theme }: { color: string; theme: AppThemeType }) {
    const nonLues = useReponsesNonLues();
    return (
        <View>
            <Icon icon={{ name: 'cog-outline' }} size={24} color={color} />
            {nonLues > 0 ? <PointDeCouleur couleur={theme.danger} style={styles.pointDeReponse} /> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    pointDeReponse: {
        position: 'absolute',
        top: -tokens.space.xxs,
        right: -tokens.space.xxs,
    },
});

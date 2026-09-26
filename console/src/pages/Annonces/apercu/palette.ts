/**
 * Les couleurs et les mesures de l'application, posees en variables CSS sur le conteneur de
 * l'apercu : `--app-*`. Elles viennent des modules purs du theme — `palettes.ts` pour les deux
 * themes, `tokens.ts` pour les espacements, les rayons et les tailles — et jamais d'une copie :
 * l'apercu ne peut pas deriver de ce que le telephone dessine.
 */

import type { CSSProperties } from 'react';

import { PALETTES, type PaletteDeBase } from '../../../../../src/shared/theme/palettes';
import { tokens } from '../../../../../src/shared/theme/tokens';

export type ThemeDApercu = 'light' | 'dark';

export function paletteDe(theme: ThemeDApercu): PaletteDeBase {
    return PALETTES[theme];
}

function px(valeur: number): string {
    return `${valeur}px`;
}

/** L'ombre `md` de l'application, en CSS : le flou d'iOS double (ombres.ts), l'opacite telle quelle. */
function ombre(): string {
    const { y, flou, opacite } = tokens.ombres.md;
    return `0 ${y}px ${flou * 2}px rgba(0, 0, 0, ${opacite})`;
}

/** Les variables du theme d'apercu, a poser en `style` sur le conteneur. */
export function variablesDApercu(theme: ThemeDApercu): CSSProperties {
    const palette = paletteDe(theme);
    const variables: Record<string, string> = {
        '--app-fond': palette.background,
        '--app-carte': palette.cardBackground,
        '--app-gris': palette.greyBackground,
        '--app-texte': palette.font,
        '--app-texte-2': palette.fontSecondary,
        '--app-accent': palette.accent,
        '--app-bordure': palette.border,
        '--app-ombre': ombre(),
        '--app-espace-xxs': px(tokens.space.xxs),
        '--app-espace-xs': px(tokens.space.xs),
        '--app-espace-sm': px(tokens.space.sm),
        '--app-espace-md': px(tokens.space.md),
        '--app-espace-lg': px(tokens.space.lg),
        '--app-espace-xl': px(tokens.space.xl),
        '--app-espace-xxl': px(tokens.space.xxl),
        '--app-rayon-sm': px(tokens.radius.sm),
        '--app-rayon-md': px(tokens.radius.md),
        '--app-rayon-lg': px(tokens.radius.lg),
        '--app-rayon-xl': px(tokens.radius.xl),
        '--app-taille-xs': px(tokens.fontSize.xs),
        '--app-taille-sm': px(tokens.fontSize.sm),
        '--app-taille-md': px(tokens.fontSize.md),
        '--app-taille-lg': px(tokens.fontSize.lg),
        '--app-taille-xl': px(tokens.fontSize.xl),
        '--app-taille-xxl': px(tokens.fontSize.xxl),
    };
    return variables as CSSProperties;
}

/**
 * Les primitives de design : espacements, rayons, tailles, graisses, ombres.
 *
 * **Un fichier a part, et ce n'est pas du rangement.** [`Theme.ts`](Theme.ts) importe `react-native`
 * pour la branche `Platform.OS`, ce qui le rend injouable sous Node — donc invérifiable. Les tokens,
 * eux, sont de la donnee pure : les isoler les rend testables, et c'est ce qui permet a
 * [`tools/eslint/no-style-literals.mjs`](../../../tools/eslint/no-style-literals.mjs) de verifier que
 * sa table d'echelles n'a pas derive de celle-ci. C'est la regle du depot appliquee a la lettre : le
 * code testable est separe du code de plateforme (docs/qualite.md).
 *
 * Ils restent reexportes par `Theme.ts` — `import { tokens } from '../theme/Theme'` continue de
 * marcher partout, et rien n'a eu a changer.
 */

export const tokens = {
    space: {
        // `xxs` nomme le pas que l'echelle n'avait pas : 26 espacements valaient 2 en dur, sous le
        // `xs` de 4 (inventaire visuel du 2026-08-16, jalon 6-K). Ajoute, pas invente.
        xxs: 2,
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    radius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        pill: 999,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 22,
        xxl: 28,
        // `title` remplace un `hero: 36` qui n'etait reference nulle part : le grand titre de page
        // reellement utilise vaut 34, dans quatre ecrans dont Planning et le tableau de bord Campus.
        // Nommer la valeur qui est la plutot que garder celle que personne n'appelle (jalon 6-K).
        title: 34,
    },
    fontWeight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
    /**
     * Les ombres, en **specifications** : decalage, flou, opacite, au sens d'iOS. `Theme.ts` les
     * resout pour la plateforme en `tokens.shadow.{sm,md,lg}`, prets a etaler — iOS garde ses quatre
     * proprietes, Android recoit un `boxShadow` (ombres.ts). Elles portaient une `elevation`
     * jusqu'en 6.2.x : ombre dure, et ordre de dessin change sur les vieux Android.
     */
    ombres: {
        sm: { y: 2, flou: 6, opacite: 0.04 },
        md: { y: 6, flou: 14, opacite: 0.06 },
        lg: { y: 10, flou: 24, opacite: 0.08 },
    },
};

export default tokens;

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
     * Des objets complets — `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`,
     * `elevation` — couvrant iOS et Android d'un coup : les etaler plutot que redefinir les cinq
     * proprietes.
     */
    shadow: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 14,
            elevation: 5,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 10,
        },
    },
};

export default tokens;

/**
 * Les graduations de l'axe d'une courbe : des nombres ronds — 0, 10 000, 20 000 —, pas les quarts du
 * maximum que Recharts propose (2 750, 5 500, 8 250). Le pas est 1, 2 ou 5 fois une puissance de
 * dix, le plus petit qui tienne le maximum en `n` intervalles au plus.
 *
 * Pur : joue par `npm test` a la racine du depot (graduations.test.ts).
 */

export function graduations(maximum: number, n = 4): number[] {
    if (!(maximum > 0)) return [0, 1];
    const brut = maximum / n;
    const puissance = 10 ** Math.floor(Math.log10(brut));
    const pas = [1, 2, 5, 10].map((f) => f * puissance).find((p) => p * n >= maximum) ?? 10 * puissance;
    // Un compte est entier : jamais un pas sous un.
    const entier = Math.max(1, pas);
    return Array.from({ length: Math.ceil(maximum / entier) + 1 }, (_, i) => i * entier);
}

/**
 * La cle d'un message de service, proposee depuis son titre.
 *
 * La cle est la memoire « vu » des appareils : elle doit etre stable d'une republication a l'autre
 * et lisible dans le journal. Un slug du titre suivi de la date du jour fait les deux — et reste
 * modifiable dans le formulaire, parce que republier un message corrige doit garder la cle d'avant.
 *
 * Pur : joue par `npm test` a la racine du depot (cle.test.ts).
 */

export function slug(texte: string): string {
    return texte
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** `Maintenance ce soir` + 2026-09-03 -> `maintenance-ce-soir-2026-09-03`. */
export function proposerCle(titre: string, date: Date): string {
    const jour = date.toISOString().slice(0, 10);
    const base = slug(titre);
    return base === '' ? `message-${jour}` : `${base}-${jour}`;
}

/**
 * La derivation de l'identifiant testeur : une graine d'appareil devient un UUID, a sens unique.
 *
 * Pourquoi une empreinte et non la graine elle-meme : la graine Android est le SSAID du systeme, un
 * identifiant d'appareil qui n'a rien a faire sur un ecran ni dans une base ; et la colonne
 * `testeurs.id` est `uuid`, ce qui garde a la console son controle de coquille (schema.sql). Le
 * SHA-256 de « graine de domaine + valeur », mis en forme d'UUID **version 8** — la version que la
 * RFC 9562 reserve aux derivations maison ; v5 dirait SHA-1 sur un espace de noms, ce qu'on ne fait
 * pas. La graine de domaine n'est pas un secret (le depot est public) : elle separe cet usage de tout
 * autre qui hacherait le meme SSAID, et son numero permet de tout renouveler d'un coup.
 *
 * Pur : `identifiant.ts` fournit la graine et le SHA-256 (`expo-crypto`), ce fichier fait le reste.
 * Le test fige un vecteur calcule avec `node:crypto`, pour que l'accord avec `expo-crypto` se lise.
 */

/** Separation de domaine et version de la derivation. Pas un secret. */
export const GRAINE = 'ukit/testeur/v1';

const EMPREINTE_SHA256 = /^[0-9a-f]{64}$/;

/** Le texte a hacher pour une graine d'appareil, ou `null` si elle est inutilisable (absente, vide, pas une chaine). */
export function texteAHacher(graine: unknown): string | null {
    if (typeof graine !== 'string') return null;
    const propre = graine.trim().toLowerCase();
    return propre === '' ? null : `${GRAINE}:${propre}`;
}

/** Une empreinte SHA-256 en hexadecimal, mise en forme d'UUID v8 (variante `10xx`). */
export function uuidDepuisEmpreinte(empreinteHex: string): string {
    const hex = empreinteHex.toLowerCase();
    if (!EMPREINTE_SHA256.test(hex)) throw new Error('empreinte SHA-256 hexadecimale attendue');
    const variante = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variante}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

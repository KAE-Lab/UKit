/**
 * Ce qu'un journal peut garder d'une adresse : son origine, jamais son chemin ni sa requete.
 *
 * Un journal d'appareil n'est pas un lieu prive : la console de production part dans le journal du
 * systeme, que d'autres outils lisent. Or trois lignes y ecrivaient des adresses completes — l'echec
 * d'un Blueprint, dont le detail porte l'URL de la requete, et deux traces du navigateur integre.
 * Constate au banc le 2026-11-10 : `[aetherius] ukit.edt.abonnement : rejected — … https://…` avec le
 * lien d'abonnement entier, qui vaut un secret (il rend le planning de quelqu'un sans authentification,
 * docs/features/scolarite.md) ; et un lien du navigateur peut porter un ticket CAS dans sa requete.
 * L'origine suffit a savoir quelle source a cede.
 *
 * Pur : journal.test.ts.
 */

const ADRESSE = /\b([a-z][a-z0-9+.-]*:\/\/[^\s/?#'"<>]*)[^\s'"<>]*/gi;

/** Le texte, chaque adresse reduite a son origine suivie de `/…` quand elle portait davantage. */
export function sansAdresses(texte: string): string {
    return texte.replace(ADRESSE, (adresse: string, origine: string) => (adresse.length > origine.length ? `${origine}/…` : origine));
}

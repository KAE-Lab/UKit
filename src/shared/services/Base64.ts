/**
 * Le decodage base64, a la main et sans dependance — parce que celui de la plateforme a menti.
 *
 * `expo-file-system` sait ecrire une chaine base64 (`write(contenu, { encoding: 'base64' })`)…
 * depuis sa version 19.0.16. Le natif qui tourne reellement est celui **embarque dans Expo Go**, pas
 * celui de `node_modules` : un natif anterieur ignore silencieusement l'option et ecrit la chaine
 * **comme du texte UTF-8**. C'est ce qui a produit un « certificat de scolarite » de 125 Ko de texte
 * base64 sur un appareil reel (2026-08-29) — un fichier que WKWebView chargeait sans erreur et
 * rendait en ecran noir. Quatre allers-retours d'essais pour le nommer.
 *
 * Decoder en JavaScript et ecrire des **octets** (`write(Uint8Array)`, present dans tous les natifs
 * 19.x) rend l'ecriture independante de la version embarquee. La roue est petite — vingt lignes —
 * et `atob` n'est pas garanti par Hermes selon la version : la reecrire ici est le choix le moins
 * fragile, et il est teste.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** La table inverse, construite une fois. */
const VALEURS: Record<string, number> = {};
for (let index = 0; index < ALPHABET.length; index += 1) {
    VALEURS[ALPHABET.charAt(index)] = index;
}

/**
 * Les octets d'une chaine base64 standard (RFC 4648, avec ou sans bourrage `=`).
 *
 * **Leve** sur un caractere hors alphabet plutot que de l'ignorer : une chaine corrompue doit se
 * voir a l'ecriture, pas a l'ouverture du fichier trois jours plus tard.
 */
export function decoderBase64(base64: string): Uint8Array {
    const propre = base64.replace(/[\r\n]/g, '').replace(/=+$/, '');
    const octets = new Uint8Array(Math.floor((propre.length * 3) / 4));

    let tampon = 0;
    let bits = 0;
    let position = 0;
    for (let index = 0; index < propre.length; index += 1) {
        const valeur = VALEURS[propre.charAt(index)];
        if (valeur === undefined) {
            throw new Error(`caractere hors alphabet base64 : ${JSON.stringify(propre.charAt(index))}`);
        }
        tampon = (tampon << 6) | valeur;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            octets[position] = (tampon >> bits) & 0xff;
            position += 1;
        }
    }
    return position === octets.length ? octets : octets.slice(0, position);
}

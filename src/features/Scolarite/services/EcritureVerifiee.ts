/**
 * L'ecriture d'un fichier, **prouvee par relecture** — parce que deux chemins d'ecriture ont menti.
 *
 * La chronique est sur un vrai appareil (2026-08-29) : `write(base64, { encoding: 'base64' })` a
 * laisse un fichier de zero octet sans qu'aucune etape ne leve — l'option n'existe que depuis
 * expo-file-system 19.0.16, et le natif qui tourne est celui **embarque dans Expo Go**, pas celui de
 * node_modules. Cinq allers-retours d'essais pour le nommer, parce que chaque appel « reussissait ».
 *
 * D'ou la regle que ce module incarne : **aucun appel d'ecriture n'est cru sur parole**. La seule
 * preuve est la relecture, comparee a la taille attendue.
 */

import type { File } from 'expo-file-system';
import * as Heritee from 'expo-file-system/legacy';

/** Ce que le disque porte reellement, en octets. `-1` quand il refuse de repondre. */
function tailleRelue(fichier: File): number {
    try {
        return fichier.bytesSync().length;
    } catch {
        return -1;
    }
}

/**
 * Ecrit, **relit, et verifie** — parce que deux chemins d'ecriture ont deja menti sans lever.
 *
 * La chronique complete est sur un vrai appareil (2026-08-29) : `write(base64, { encoding })` a
 * laisse un fichier de zero octet — l'option n'existe pas dans tous les natifs d'Expo Go, et l'echec
 * n'a pas ete bruyant. On n'accorde donc plus de confiance a un appel d'ecriture : la seule preuve
 * est **la relecture**, comparee a la taille attendue.
 *
 *   1. l'API moderne (`write(Uint8Array)`), d'abord : un chemin d'octets bruts, sans option a
 *      ignorer ;
 *   2. au moindre ecart, l'API **heritee** (`writeAsStringAsync`, base64) : elle tourne dans Expo Go
 *      depuis des annees, c'est le chemin le plus eprouve de tout le paquet ;
 *   3. toujours faux apres relecture : on **leve**, et l'appelant efface le fichier partiel — un
 *      demi-fichier sous le nom-cle bloquerait toute reprise.
 */
export async function ecrireEtVerifier(destination: File, octets: Uint8Array, base64: string): Promise<void> {
    try {
        destination.write(octets);
    } catch (erreur) {
        console.warn(`[documents] ecriture moderne rejetee : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
    if (tailleRelue(destination) === octets.length) return;

    console.warn(`[documents] ecriture moderne incomplete (${tailleRelue(destination)}/${octets.length} octets) : repli sur l'API heritee`);
    await Heritee.writeAsStringAsync(destination.uri, base64, { encoding: Heritee.EncodingType.Base64 });

    const relue = tailleRelue(destination);
    if (relue !== octets.length) {
        throw new Error(`ecriture incomplete (${relue}/${octets.length} octets)`);
    }
}

/**
 * Le blurhash d'une image, calcule dans le navigateur : la version floue que l'application affiche
 * le temps que le visuel arrive (expo-image, 6.3). Trente-deux pixels de cote suffisent — le
 * blurhash n'encode que quelques composantes — et evitent de decoder l'image entiere une seconde fois.
 */

import { encode } from 'blurhash';

const COTE = 32;
const COMPOSANTES_X = 4;
const COMPOSANTES_Y = 3;

function chargerImage(fichier: File): Promise<HTMLImageElement> {
    return new Promise((resoudre, rejeter) => {
        const url = URL.createObjectURL(fichier);
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(url); resoudre(image); };
        image.onerror = () => { URL.revokeObjectURL(url); rejeter(new Error('image illisible')); };
        image.src = url;
    });
}

/** Le blurhash d'un fichier image, ou `null` si le navigateur ne sait pas le dessiner. */
export async function calculerBlurhash(fichier: File): Promise<string | null> {
    try {
        const image = await chargerImage(fichier);
        const ratio = image.naturalWidth === 0 ? 1 : image.naturalHeight / image.naturalWidth;
        const largeur = ratio > 1 ? Math.max(1, Math.round(COTE / ratio)) : COTE;
        const hauteur = ratio > 1 ? COTE : Math.max(1, Math.round(COTE * ratio));
        const toile = document.createElement('canvas');
        toile.width = largeur;
        toile.height = hauteur;
        const contexte = toile.getContext('2d');
        if (contexte === null) return null;
        contexte.drawImage(image, 0, 0, largeur, hauteur);
        const pixels = contexte.getImageData(0, 0, largeur, hauteur).data;
        return encode(pixels, largeur, hauteur, COMPOSANTES_X, COMPOSANTES_Y);
    } catch {
        return null;
    }
}

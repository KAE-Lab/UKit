/**
 * Le nom d'un objet televerse : `<dossier>/<identifiant court>-<slug>.webp`.
 *
 * Unique par construction : deux annonces qui televersent chacune `affiche.jpg` obtiennent deux
 * objets, et aucun n'ecrase l'autre (defaut 7 du jalon 7-E). L'extension est `.webp` parce que le
 * pipeline re-encode en WebP ; si la compression echoue et que l'original part, c'est le
 * `Content-Type` qui fait foi — les deux plateformes decodent au type, pas a l'extension (7-A).
 *
 * Pur : joue par `npm test` a la racine du depot (nommage.test.ts).
 */

import { slug } from './cle';

const LONGUEUR_IDENTIFIANT = 8;
const LONGUEUR_MAX_SLUG = 48;

export function identifiantCourt(uuid: string = crypto.randomUUID()): string {
    return uuid.replace(/-/g, '').slice(0, LONGUEUR_IDENTIFIANT).toLowerCase();
}

function sansExtension(nomDeFichier: string): string {
    const point = nomDeFichier.lastIndexOf('.');
    return point > 0 ? nomDeFichier.slice(0, point) : nomDeFichier;
}

/** `annonces`, `Affiche Soirée.JPG`, `3f2a9c1d` -> `annonces/3f2a9c1d-affiche-soiree.webp`. */
export function nomDObjet(dossier: string, nomDeFichier: string, identifiant: string): string {
    const base = slug(sansExtension(nomDeFichier)).slice(0, LONGUEUR_MAX_SLUG).replace(/-+$/, '');
    return `${dossier}/${identifiant}-${base === '' ? 'image' : base}.webp`;
}

/**
 * D'ou vient le CSV : la feuille de reponses par son lien, ou un fichier.
 *
 * La feuille liee au formulaire se lit sans compte quand elle est partagee « a toute personne
 * disposant du lien », a son adresse d'export. Le lien de partage que Google donne est celui de
 * l'editeur (`/edit?usp=sharing`) ; il est traduit ici pour qu'on puisse coller l'un ou l'autre dans
 * RETOURS_CSV_URL.
 *
 * Une feuille qui n'est pas partagee ne repond pas par un refus : Google sert une page de connexion
 * en HTML, avec un statut 200. La lecture la reconnait et dit quoi faire, plutot que de lire une
 * page web comme un CSV a une colonne.
 */

import { readFile } from 'node:fs/promises';

const FEUILLE = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;

function gidDe(...requetes) {
    for (const requete of requetes) {
        const gid = new URLSearchParams(requete ?? '').get('gid');
        if (gid !== null && /^\d+$/.test(gid)) return gid;
    }
    return null;
}

/**
 * L'adresse d'export CSV d'une feuille Google, depuis son lien de partage ou son adresse d'export ;
 * toute autre adresse est rendue telle quelle.
 *
 * @param {string} lien
 * @returns {string}
 */
export function urlDExport(lien) {
    const feuille = FEUILLE.exec(lien.trim());
    if (feuille === null) return lien.trim();
    const [, identifiant, chemin, requete, fragment] = feuille;
    if ((chemin ?? '').startsWith('export')) return lien.trim();
    const gid = gidDe(fragment, requete);
    return `https://docs.google.com/spreadsheets/d/${identifiant}/export?format=csv${gid === null ? '' : `&gid=${gid}`}`;
}

/**
 * Le texte CSV, depuis un fichier ou une adresse. Exactement l'un des deux.
 *
 * @param {{ fichier?: string | null; url?: string | null }} source
 * @returns {Promise<string>}
 */
export async function lireSource({ fichier = null, url = null }) {
    if (fichier !== null) return readFile(fichier, 'utf8');
    if (url === null) throw new Error('aucune source : --fichier <csv> ou RETOURS_CSV_URL');

    const reponse = await fetch(urlDExport(url), { redirect: 'follow', headers: { 'User-Agent': 'ukit-retours' } });
    const corps = await reponse.text();
    if (!reponse.ok) throw new Error(`lecture de la feuille : ${reponse.status}`);
    const type = reponse.headers.get('content-type') ?? '';
    if (!type.includes('text/csv') || corps.trimStart().startsWith('<')) {
        throw new Error('la feuille ne rend pas un CSV : verifier qu elle est partagee « a toute personne disposant du lien »');
    }
    return corps;
}

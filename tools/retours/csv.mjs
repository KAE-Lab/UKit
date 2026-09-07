/**
 * Un lecteur CSV au sens de la RFC 4180, et rien de plus : guillemets doubles, guillemet double
 * pour un guillemet, virgules et sauts de ligne a l'interieur d'une cellule, fins de ligne CRLF ou
 * LF, marque d'ordre des octets en tete.
 *
 * Ecrit ici plutot qu'importe : l'importeur des retours tourne en integration continue sans
 * `npm ci` (installer le projet React Native pour lire un fichier prendrait des minutes), et un
 * export Google Sheets n'a besoin d'aucune option de dialecte. Il est pur et joue par csv.test.ts.
 *
 * Les sauts de ligne a l'interieur d'une cellule sont ramenes a `\n` : les deux exports de Google
 * (fichier telecharge, adresse d'export) ne les ecrivent pas pareil, et la cle d'un retour est
 * calculee sur la valeur — elle doit etre la meme des deux cotes (projection.mjs).
 */

const BOM = '\uFEFF';

/**
 * Decoupe un texte CSV en lignes de cellules. Une ligne entierement vide est ignoree. Un guillemet
 * ouvert et jamais ferme est une erreur : mieux vaut refuser un fichier tronque que ranger une
 * demi-reponse.
 *
 * @param {string} texte
 * @returns {string[][]}
 */
export function analyserCsv(texte) {
    const source = texte.startsWith(BOM) ? texte.slice(BOM.length) : texte;
    const lignes = [];
    let ligne = [];
    let cellule = '';
    let entreGuillemets = false;
    let position = 0;

    while (position < source.length) {
        const caractere = source[position];
        if (entreGuillemets) {
            if (caractere === '"') {
                if (source[position + 1] === '"') {
                    cellule += '"';
                    position += 2;
                } else {
                    entreGuillemets = false;
                    position += 1;
                }
            } else if (caractere === '\r' && source[position + 1] === '\n') {
                cellule += '\n';
                position += 2;
            } else {
                cellule += caractere;
                position += 1;
            }
            continue;
        }
        if (caractere === '"') {
            entreGuillemets = true;
        } else if (caractere === ',') {
            ligne.push(cellule);
            cellule = '';
        } else if (caractere === '\n' || caractere === '\r') {
            if (caractere === '\r' && source[position + 1] === '\n') position += 1;
            ligne.push(cellule);
            lignes.push(ligne);
            ligne = [];
            cellule = '';
        } else {
            cellule += caractere;
        }
        position += 1;
    }
    if (entreGuillemets) throw new Error('CSV tronque : un guillemet ouvert n est jamais ferme');
    if (cellule !== '' || ligne.length > 0) {
        ligne.push(cellule);
        lignes.push(ligne);
    }
    return lignes.filter((candidate) => !(candidate.length === 1 && candidate[0] === ''));
}

/**
 * La premiere ligne devient les en-tetes, les suivantes des enregistrements indexes par en-tete.
 * Une ligne plus courte que les en-tetes est completee par des cellules vides — Google omet les
 * virgules finales ; une ligne plus longue est une erreur, numerotee comme dans la feuille (la
 * premiere reponse est la ligne 2).
 *
 * @param {string[][]} lignes
 * @returns {{ entetes: string[]; enregistrements: string[][] }}
 */
export function enregistrementsDe(lignes) {
    if (lignes.length === 0) return { entetes: [], enregistrements: [] };
    const entetes = lignes[0].map((entete) => entete.trim());
    const enregistrements = lignes.slice(1).map((ligne, index) => {
        if (ligne.length > entetes.length) {
            throw new Error(`ligne ${index + 2} : ${ligne.length} cellules pour ${entetes.length} en-tetes`);
        }
        return [...ligne, ...new Array(entetes.length - ligne.length).fill('')];
    });
    return { entetes, enregistrements };
}

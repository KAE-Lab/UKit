/**
 * Ce qu'un run de documents rapporte, et sous quel nom on le range.
 *
 * Pur, donc jouable sous vitest : c'est la regle du depot pour tout ce qui decide d'une donnee — et
 * ici la decision porte sur un **fichier qu'on ecrit sur l'appareil de quelqu'un**, ce qui rend la
 * verification plus utile encore qu'ailleurs.
 *
 * La couture — jouer le Blueprint, ecrire les octets — vit dans `CertificatService`, qui ne decide
 * rien : il lit ce que ce module rend et l'applique. Meme partage que `widgets/projection.ts` face a
 * `widgets/runner.ts`.
 *
 * **Le run n'echoue pas quand il n'y a rien a prendre**, et c'est la forme du Blueprint : sa derniere
 * etape rend `null` pour une categorie vide et `{ erreur }` pour une reponse inattendue. Les deux
 * arrivent ici comme des refus **nommes**, pas comme des pannes — un etudiant qui n'a pas encore de
 * certificat n'a rien casse.
 */

/** Pourquoi il n'y a rien a ranger. Nomme, parce qu'un refus muet ne se diagnostique pas. */
export type RefusCertificat =
    /** La categorie ne liste aucune piece : le cas d'un dossier tout neuf. */
    | 'aucune-piece'
    /** La sortie n'a pas la forme attendue : Blueprint ou portail a corriger. */
    | 'illisible'
    /** Le portail a repondu autre chose qu'un PDF — session expiree, ou piece retiree. */
    | 'refuse';

export interface CertificatRapporte {
    /** Le libelle du portail, tel quel : « Certificat 2026/2027 ». */
    readonly libelle: string;
    /** Le contenu du PDF, en base64. Ecrit par le systeme, jamais decode en JavaScript. */
    readonly contenu: string;
    /** La taille annoncee par le portail, en octets. Sert a verifier, pas a afficher. */
    readonly octets: number;
}

export type ProjectionCertificat =
    | { readonly ok: true; readonly certificat: CertificatRapporte }
    | { readonly ok: false; readonly refus: RefusCertificat };

function texte(valeur: unknown): string {
    return typeof valeur === 'string' ? valeur.trim() : '';
}

/**
 * Ce que la sortie `fichier` d'un run porte, ou pourquoi elle ne porte rien.
 *
 * Defensive comme toutes les projections du depot : la sortie vient d'un script publie, donc d'une
 * source qui peut deriver sans qu'on republie l'application. Une forme inattendue devient un refus
 * nomme, jamais une exception ni un fichier vide ecrit sur l'appareil.
 */
export function projeterCertificat(sorties: Readonly<Record<string, unknown>>): ProjectionCertificat {
    const fichier = sorties.fichier;

    // `null` est la reponse normale d'une categorie vide : le script du Blueprint le rend plutot que
    // d'echouer, pour que l'absence de certificat ne ressemble pas a une panne du portail.
    if (fichier === null || fichier === undefined) return { ok: false, refus: 'aucune-piece' };
    if (typeof fichier !== 'object' || Array.isArray(fichier)) return { ok: false, refus: 'illisible' };

    const source = fichier as Record<string, unknown>;
    if (source.erreur !== undefined) return { ok: false, refus: 'refuse' };

    const contenu = texte(source.contenu);
    const octets = typeof source.octets === 'number' ? source.octets : 0;
    // Un contenu vide passerait `enregistrerDocument` sans lever et rangerait un PDF de zero octet,
    // qui s'ouvrirait sur une erreur. Mieux vaut ne rien ranger.
    if (contenu === '' || octets <= 0) return { ok: false, refus: 'illisible' };

    return {
        ok: true,
        certificat: { libelle: texte(source.libelle), contenu, octets },
    };
}

/** Ce qu'on accepte dans un nom de fichier. Le reste devient un tiret. */
const INTERDITS = /[^\p{L}\p{N} .()-]/gu;

/**
 * Le nom sous lequel la piece est rangee.
 *
 * Trois contraintes, et elles se cumulent :
 *
 *   - **le libelle du portail contient une barre oblique** (« Certificat 2026/2027 »), qui separe les
 *     repertoires sur les deux plateformes. Le laisser passer ecrirait dans un dossier inexistant ;
 *   - **le nom est la cle d'idempotence.** C'est lui qu'on interroge pour savoir si la piece est deja
 *     rangee, faute d'index a cote des fichiers (`DocumentsService`). Il doit donc etre **stable** :
 *     le meme libelle rend toujours le meme nom, sans date ni compteur ;
 *   - **il est lu par un humain**, dans une liste qu'il a lui-meme remplie par ailleurs. « Certificat
 *     2026-2027.pdf » se reconnait, un identifiant de portail non.
 *
 * Le repli existe pour le libelle vide : une piece sans nom reste une piece a ranger.
 */
export function nomDuCertificat(libelle: string, defaut: string): string {
    const propre = libelle.replace(INTERDITS, '-').replace(/-+/g, '-').replace(/\s+/g, ' ').trim();
    return `${propre === '' || propre === '-' ? defaut : propre}.pdf`;
}

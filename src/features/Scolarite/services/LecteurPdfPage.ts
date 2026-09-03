/**
 * La page du lecteur pdf.js, assemblee : le gabarit, la bibliotheque, son worker, et le document.
 *
 * **Pur**, donc teste : ce module ne lit aucun fichier — la couture qui va chercher les trois pieces
 * dans les assets vit dans `LecteurPdf.ts`. Il ne fait que poser des litteraux JavaScript dans un
 * gabarit HTML (assets/pdfjs/viewer.html), et c'est la seule operation qui puisse casser la page en
 * silence : un `</script>` dans une bibliotheque minifiee, ou un `$&` dans un remplacement, et la
 * WebView rend une page blanche sans un mot.
 *
 * Pourquoi une page **inline** plutot que des fichiers servis a la WebView : `source={{ html }}` est
 * le chemin de l'ecran de carte et du rendu `inline` du lecteur, prouve sur les deux plateformes.
 * Servir des fichiers `file://` a une WebView Android demande des autorisations d'acces que ce
 * lecteur n'a pas a ouvrir, et un module ES charge depuis `file://` est refuse par Chromium comme
 * une requete cross-origin. Un Blob, fabrique par la page elle-meme, n'a aucun de ces problemes.
 */

export interface PiecesDuLecteur {
    /** Le gabarit HTML, avec ses marqueurs. */
    readonly gabarit: string;
    /** Le texte de `pdf.min.mjs`, tel quel. */
    readonly bibliotheque: string;
    /** Le texte de `pdf.worker.min.mjs`, tel quel. */
    readonly worker: string;
}

/**
 * Au-dela, on n'assemble pas : la page tiendrait la bibliotheque **et** le document dans une seule
 * chaine passee au natif, et un rendu qui manque de memoire ne dit rien — il tue le processus web.
 * Huit millions de caracteres de base64 font six mega-octets de PDF ; un certificat en fait 94 Ko.
 */
export const LIMITE_BASE64 = 8_000_000;

const MARQUEURS = {
    bibliotheque: '/*UKIT:LIB*/',
    worker: '/*UKIT:WORKER*/',
    document: '/*UKIT:DOCUMENT*/',
    fond: '/*UKIT:FOND*/',
} as const;

/**
 * Un litteral de chaine JavaScript sur, quel que soit le texte.
 *
 * `JSON.stringify` echappe les guillemets, les antislashs et les retours a la ligne ; il laisse `<`
 * tel quel, et c'est lui qui fermerait un `<script>` si le texte portait `</script>`. `<` est
 * la meme lettre pour JavaScript et une lettre inoffensive pour l'analyseur HTML. Les deux
 * separateurs de ligne Unicode que `JSON.stringify` laisse passer sont echappes pour la meme raison.
 */
export function litteralScript(source: string): string {
    return JSON.stringify(source)
        .replace(/</g, '\\u003c')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

/** Une couleur CSS acceptable dans le gabarit : celle du theme, hexadecimale, et rien d'autre. */
function couleurCss(fond: string): string {
    if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(fond)) {
        throw new Error(`fond de page inattendu : ${JSON.stringify(fond)}`);
    }
    return fond;
}

/**
 * Remplace chaque marqueur du gabarit, et leve si l'un d'eux manque : un gabarit sans marqueur
 * rendrait une page qui n'a rien a afficher, sans un mot.
 *
 * `split`/`join` et non `replace` : la valeur de remplacement contient une bibliotheque minifiee,
 * donc des `$` en pagaille, que `replace` interpreterait comme des motifs de substitution.
 */
export function assemblerPageLecteur(pieces: PiecesDuLecteur, documentBase64: string, fond: string): string {
    const valeurs: Readonly<Record<keyof typeof MARQUEURS, string>> = {
        bibliotheque: litteralScript(pieces.bibliotheque),
        worker: litteralScript(pieces.worker),
        document: litteralScript(documentBase64),
        fond: couleurCss(fond),
    };

    let page = pieces.gabarit;
    for (const cle of Object.keys(MARQUEURS) as (keyof typeof MARQUEURS)[]) {
        const marqueur = MARQUEURS[cle];
        if (!page.includes(marqueur)) throw new Error(`marqueur absent du gabarit : ${marqueur}`);
        page = page.split(marqueur).join(valeurs[cle]);
    }
    return page;
}

/** Ce que la page dit a l'application : la premiere page est rendue, ou rien ne le sera. */
export type MessageDuLecteur =
    | { readonly type: 'rendu'; readonly pages: number }
    | { readonly type: 'echec'; readonly detail: string };

/**
 * Le message de `postMessage`, lu avec defiance : la page est a nous, mais un JSON malforme ou un
 * type inconnu ne doivent pas faire tomber l'ecran — ils sont ignores, et le chien de garde tranchera.
 */
export function lireMessageDuLecteur(donnees: string): MessageDuLecteur | null {
    let brut: unknown;
    try {
        brut = JSON.parse(donnees);
    } catch {
        return null;
    }
    if (brut === null || typeof brut !== 'object') return null;

    const message = brut as { type?: unknown; pages?: unknown; detail?: unknown };
    if (message.type === 'rendu' && typeof message.pages === 'number') return { type: 'rendu', pages: message.pages };
    if (message.type === 'echec') return { type: 'echec', detail: typeof message.detail === 'string' ? message.detail : 'sans detail' };
    return null;
}

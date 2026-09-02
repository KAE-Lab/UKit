/**
 * La lecture d'une piece : la strategie de rendu, son contenu verifie, et les verdicts que la vue
 * rapporte.
 *
 * Sortie de `DocumentViewerScreen` pour que l'ecran ne fasse que composer — c'est la regle du depot,
 * et c'est aussi ce qui garde lisible un aiguillage a trois strategies. Tout ce qui decide vit ici ;
 * l'ecran pose un bandeau, une vue, un indicateur, et l'ecran de repli.
 *
 * Les trois strategies et leurs bascules sont racontees dans l'en-tete de l'ecran. Ce qu'il faut
 * savoir ici :
 *
 *   - **`fichier`** se juge a l'URL rapportee a la fin du chargement — une page vide du natif charge
 *     « avec succes » sous une autre adresse ;
 *   - **`inline`** et **`pdfjs`** attendent le contenu lu et verifie avant de monter la vue : une
 *     WebView montee sur `html: ''` puis remplacee charge deux fois, et la premiere ne dit rien ;
 *   - **`pdfjs`** conclut par le message de sa page, jamais par la fin du chargement, et un chien de
 *     garde tranche si la page ne conclut pas.
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';

import type { TranslationKey } from '../../../shared/i18n/Translator';
import {
    LIMITE_BASE64,
    assemblerPageLecteur,
    lireMessageDuLecteur,
    type PiecesDuLecteur,
} from '../services/LecteurPdfPage';
import { useLecteurPdfJs } from './useLecteurPdfJs';

export type Strategie = 'fichier' | 'inline' | 'pdfjs';

export type SourceDeLaVue = { readonly uri: string } | { readonly html: string };

/**
 * Le temps laisse a pdf.js pour rendre une premiere page, pieces comprises. Au-dela, la page n'a rien
 * dit et ne dira rien — une WebView trop ancienne pour un module ES, par exemple, echoue en silence.
 */
const GARDE_PDFJS_MS = 15_000;

/** Le type MIME d'une piece, ou `null` quand aucune strategie ne saura la rendre. */
export function mimeRendable(nom: string): string | null {
    const extension = nom.slice(nom.lastIndexOf('.') + 1).toLowerCase();
    const images: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    };
    if (images[extension] !== undefined) return images[extension];
    // Le PDF, sur les deux plateformes : iOS le rend lui-meme, Android par pdf.js.
    return extension === 'pdf' ? 'application/pdf' : null;
}

/** La strategie de depart : pdf.js pour un PDF sur Android, le fichier partout ailleurs. */
function strategieInitiale(mime: string | null): Strategie {
    return Platform.OS === 'android' && mime === 'application/pdf' ? 'pdfjs' : 'fichier';
}

/**
 * L'adresse telle que la vue peut la charger.
 *
 * Un nom de piece peut porter des espaces — « Certificat 2026-2027.pdf » — et une adresse `file://`
 * qui en porte un traverse trois convertisseurs dont chacun a sa tolerance. Le garde-fou sur `%`
 * evite le double encodage d'une adresse qui arriverait deja propre.
 */
function adresseChargeable(uri: string): string {
    return uri.includes('%') ? uri : encodeURI(uri);
}

/**
 * Le contenu de la piece, lu et verifie.
 *
 * `'illisible'` couvre deux cas qu'un rendu ne distingue pas d'un ecran noir : un fichier **vide**
 * (une ecriture interrompue apres la creation laisse zero octet), et un contenu qui n'a pas la
 * signature de son type — `%PDF` s'encode `JVBERi` en base64. Les refuser ici les rend nommables.
 */
function lireContenu(uri: string, mime: string): string | 'illisible' {
    try {
        const base64 = new File(uri).base64Sync();
        if (base64.length === 0) {
            console.warn('[lecteur] piece vide : zero octet');
            return 'illisible';
        }
        if (mime === 'application/pdf' && !base64.startsWith('JVBERi')) {
            // Le debut du contenu, en clair : c'est ce qui a permis d'identifier le defaut d'ecriture
            // — un « PDF » qui commencait par sa propre base64 reencodee, donc du texte range en 2026.
            console.warn(`[lecteur] signature inattendue : ${base64.slice(0, 12)}… (${base64.length} caracteres)`);
            return 'illisible';
        }
        return base64;
    } catch (erreur) {
        console.warn(`[lecteur] piece illisible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return 'illisible';
    }
}

/**
 * La page de la strategie `inline` : le document en donnee, dans une page que `loadHTMLString` sait
 * rendre — le chemin de l'ecran de carte. Aucun reseau, aucun script.
 */
function pageInline(base64: string, mime: string, fond: string): string {
    const source = `data:${mime};base64,${base64}`;
    const element = mime === 'application/pdf'
        ? `<embed src="${source}" type="application/pdf" />`
        : `<img src="${source}" alt="" />`;

    return `<!DOCTYPE html><html><head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
            html, body { margin: 0; height: 100%; background-color: ${fond}; }
            embed, img { display: block; width: 100%; height: 100%; object-fit: contain; }
        </style>
    </head><body>${element}</body></html>`;
}

/** Ce que la vue charge, selon la strategie — ou `null` tant que ce n'est pas pret. */
function sourceDeLaVue(
    strategie: Strategie,
    uri: string,
    contenu: string | null,
    mime: string,
    pieces: PiecesDuLecteur | null,
    fond: string,
): SourceDeLaVue | null {
    if (strategie === 'fichier') return { uri: adresseChargeable(uri) };
    if (contenu === null) return null;
    if (strategie === 'inline') return { html: pageInline(contenu, mime, fond) };
    return pieces === null ? null : { html: assemblerPageLecteur(pieces, contenu, fond) };
}

export interface LectureDuDocument {
    readonly strategie: Strategie;
    /** L'indicateur tourne tant que la vue n'a pas rendu. */
    readonly chargement: boolean;
    /** La cle du message de repli, ou `null` quand la piece se rend. */
    readonly repli: TranslationKey | null;
    /** Ce que la vue charge, ou `null` tant que ce n'est pas pret. */
    readonly source: SourceDeLaVue | null;
    readonly surFinDeChargement: (url: string) => void;
    readonly surMessage: (donnees: string) => void;
    readonly surErreur: (description: string) => void;
    readonly surFinDuProcessus: () => void;
}

export function useLectureDuDocument(uri: string, nom: string, fond: string): LectureDuDocument {
    const mime = mimeRendable(nom);
    const [chargement, setChargement] = useState(true);
    const [strategie, setStrategie] = useState<Strategie>(() => strategieInitiale(mime));
    const [contenu, setContenu] = useState<string | 'illisible' | null>(null);
    // Une vue qui echoue a charger retombe sur le partage : mieux vaut la feuille du systeme qu'un
    // cadre vide qui a l'air en panne.
    const [enEchec, setEnEchec] = useState(false);
    const lecteur = useLecteurPdfJs(strategie === 'pdfjs');

    // La lecture est courte (un certificat fait 94 Ko) mais elle reste hors du rendu : un montage ne
    // doit pas lire le disque au milieu d'une transition de navigation.
    useEffect(() => {
        if (uri === '' || mime === null) return;
        setContenu(lireContenu(uri, mime));
    }, [uri, mime]);

    // Le chien de garde de pdf.js : la page conclut par un message, et une page qui ne conclut jamais
    // ne doit pas laisser tourner un indicateur pour toujours.
    useEffect(() => {
        if (strategie !== 'pdfjs' || !chargement) return;
        const minuteur = setTimeout(() => {
            console.warn('[lecteur] pdf.js n\'a rien rendu a temps : repli sur le partage');
            setEnEchec(true);
        }, GARDE_PDFJS_MS);
        return () => clearTimeout(minuteur);
    }, [strategie, chargement]);

    // Une page qui tiendrait la bibliotheque ET un document trop lourd ne rend rien, elle tue le
    // processus web : on refuse avant d'assembler, et on le dit.
    const trop = strategie === 'pdfjs' && contenu !== null && contenu !== 'illisible' && contenu.length > LIMITE_BASE64;
    const repli: TranslationKey | null = trop
        ? 'DOCUMENT_PREVIEW_TOO_LARGE'
        : uri === '' || mime === null || contenu === 'illisible' || enEchec || lecteur.indisponible
            ? 'DOCUMENT_PREVIEW_UNAVAILABLE'
            : null;

    /**
     * Le verdict du chargement, lu dans l'evenement et non suppose. Une fin de chargement dont l'URL
     * n'est pas la notre est la page vide du natif — on bascule sur `inline`. En `pdfjs`, la fin du
     * chargement de la page ne dit rien du rendu : c'est son message qui conclut.
     */
    const surFinDeChargement = (url: string) => {
        console.log(`[lecteur] chargement fini : ${url === '' ? '(vide)' : url}`);
        if (strategie === 'pdfjs') return;
        if (strategie === 'fichier' && !url.startsWith('file:')) {
            console.warn('[lecteur] le fichier n\'a pas charge (page vide) : bascule sur le rendu inline');
            setStrategie('inline');
            return;
        }
        setChargement(false);
    };

    const surMessage = (donnees: string) => {
        const message = lireMessageDuLecteur(donnees);
        if (message?.type === 'rendu') {
            console.log(`[lecteur] pdf.js : ${message.pages} page(s)`);
            setChargement(false);
        } else if (message?.type === 'echec') {
            console.warn(`[lecteur] pdf.js : ${message.detail}`);
            setEnEchec(true);
        }
    };

    const surErreur = (description: string) => {
        console.warn(`[lecteur] echec de rendu : ${description}`);
        setEnEchec(true);
    };

    // Le processus web peut mourir en rendant un document. En `pdfjs` il n'y a pas de strategie
    // suivante : le repli est le partage.
    const surFinDuProcessus = () => {
        console.warn('[lecteur] processus web termine : repli');
        if (strategie === 'pdfjs') setEnEchec(true);
        else setStrategie('inline');
    };

    const source = repli !== null || mime === null || contenu === 'illisible'
        ? null
        : sourceDeLaVue(strategie, uri, contenu, mime, lecteur.pieces, fond);

    return { strategie, chargement, repli, source, surFinDeChargement, surMessage, surErreur, surFinDuProcessus };
}

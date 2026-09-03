/**
 * Les pieces du lecteur pdf.js, lues dans les assets de l'application.
 *
 * La couture de plateforme de `LecteurPdfPage.ts` : `expo-asset` rend a chaque asset une adresse
 * locale — `downloadAsync` la garantit, en developpement comme dans un binaire — et le fichier se lit
 * ensuite comme n'importe quel autre. Les deux `.txt` sont la bibliotheque et son worker, copies tels
 * quels du paquet (tools/pdfjs/vendor.mjs, metro.config.js pour l'extension).
 *
 * Lues **une fois** par session d'application : un million et demi de caracteres ne se relisent pas
 * a chaque piece ouverte, et ils ne pesent rien face a la page assemblee qui les recopie.
 */

import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import type { PiecesDuLecteur } from './LecteurPdfPage';

const MODULES = {
    gabarit: require('../../../../assets/pdfjs/viewer.html'),
    bibliotheque: require('../../../../assets/pdfjs/pdf.min.mjs.txt'),
    worker: require('../../../../assets/pdfjs/pdf.worker.min.mjs.txt'),
} as const;

let pieces: Promise<PiecesDuLecteur> | null = null;

async function lireAsset(module: number): Promise<string> {
    const asset = await Asset.fromModule(module).downloadAsync();
    if (asset.localUri === null) throw new Error(`asset sans adresse locale : ${asset.name}`);
    return new File(asset.localUri).text();
}

/** Les trois pieces, ou une erreur — et la prochaine demande reessaie plutot que de rejouer l'echec. */
export function chargerPiecesDuLecteur(): Promise<PiecesDuLecteur> {
    if (pieces === null) {
        pieces = Promise.all([lireAsset(MODULES.gabarit), lireAsset(MODULES.bibliotheque), lireAsset(MODULES.worker)])
            .then(([gabarit, bibliotheque, worker]) => ({ gabarit, bibliotheque, worker }))
            .catch((erreur: unknown) => {
                pieces = null;
                throw erreur;
            });
    }
    return pieces;
}

/**
 * Les pieces du lecteur pdf.js, chargees quand l'ecran en a besoin — et seulement alors.
 *
 * iOS n'en a pas besoin : `WKWebView` rend un PDF tout seul. Charger un million et demi de
 * caracteres pour un ecran qui ne s'en servira pas serait absurde, d'ou `actif`. Un echec de
 * chargement se dit a l'ecran, qui retombe sur la feuille de partage : c'est l'ecran d'avant la 6.1,
 * pas une panne.
 */

import { useEffect, useState } from 'react';

import { chargerPiecesDuLecteur } from '../services/LecteurPdf';
import type { PiecesDuLecteur } from '../services/LecteurPdfPage';

export interface LecteurPdfJs {
    /** Les trois pieces, ou `null` tant qu'elles ne sont pas lues. */
    readonly pieces: PiecesDuLecteur | null;
    /** Les pieces n'ont pas pu etre lues : l'ecran retombe sur le partage. */
    readonly indisponible: boolean;
}

export function useLecteurPdfJs(actif: boolean): LecteurPdfJs {
    const [pieces, setPieces] = useState<PiecesDuLecteur | null>(null);
    const [indisponible, setIndisponible] = useState(false);

    useEffect(() => {
        if (!actif) return;
        let monte = true;
        chargerPiecesDuLecteur()
            .then((lues) => {
                if (monte) setPieces(lues);
            })
            .catch((erreur: unknown) => {
                console.warn(`[lecteur] pdf.js indisponible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
                if (monte) setIndisponible(true);
            });
        return () => {
            monte = false;
        };
    }, [actif]);

    return { pieces, indisponible };
}

/**
 * L'etat des documents rangés sur l'appareil.
 *
 * Le service est **synchrone** (`expo-file-system` version 19 lit le systeme de fichiers sans
 * promesse) ; ce hook n'existe donc pas pour attendre, mais pour tenir trois choses que l'ecran ne
 * doit pas porter : la relecture au retour sur l'onglet, la tolerance aux pannes du systeme de
 * fichiers, et le message d'echec.
 *
 * **La relecture passe par `useFocusEffect` et non par `useEffect`**, et c'est mesure ailleurs dans
 * ce depot : l'onglet Scolarite ne se demonte jamais, donc une lecture au montage ne se rejouerait
 * plus jamais. C'est exactement le defaut qu'un filtre Campus a porte pendant des mois
 * (docs/defauts-fonctionnels.md), et `useFavorites` est le voisin qui avait la bonne reponse.
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
    ajouterDocument, listerDocuments, supprimerDocument, type DocumentScolarite,
} from '../services/DocumentsService';

export interface EtatDocuments {
    readonly documents: readonly DocumentScolarite[];
    /**
     * Relit le repertoire a la demande.
     *
     * Le focus couvre la navigation, pas l'arriere-plan : une piece rangee par le certificat
     * automatique atterrit PENDANT que l'ecran est visible, et sans ce declencheur le compte de la
     * tuile restait perime jusqu'au prochain changement d'onglet (signale sur appareil, 2026-08-29).
     */
    readonly relire: () => void;
    /** Le dernier geste qui a echoue, ou `null`. L'ecran le montre puis l'oublie. */
    readonly echec: string | null;
    readonly oublierEchec: () => void;
    readonly ajouter: (uri: string, nom: string) => void;
    readonly supprimer: (nom: string) => void;
}

export function useDocuments(messageEchec: string): EtatDocuments {
    const [documents, setDocuments] = useState<readonly DocumentScolarite[]>([]);
    const [echec, setEchec] = useState<string | null>(null);

    /**
     * Relire, sans jamais lever.
     *
     * Un repertoire illisible n'est pas un plantage d'ecran : c'est une liste vide. Le cas n'est pas
     * theorique — le systeme peut refuser l'acces pendant que l'appareil est verrouille.
     */
    const relire = useCallback(() => {
        try {
            setDocuments(listerDocuments());
        } catch {
            setDocuments([]);
        }
    }, []);

    useFocusEffect(relire);

    const ajouter = useCallback((uri: string, nom: string) => {
        try {
            ajouterDocument(uri, nom);
            setEchec(null);
            relire();
        } catch {
            setEchec(messageEchec);
        }
    }, [messageEchec, relire]);

    const supprimer = useCallback((nom: string) => {
        try {
            supprimerDocument(nom);
            relire();
        } catch {
            setEchec(messageEchec);
        }
    }, [messageEchec, relire]);

    const oublierEchec = useCallback(() => setEchec(null), []);

    return { documents, relire, echec, oublierEchec, ajouter, supprimer };
}

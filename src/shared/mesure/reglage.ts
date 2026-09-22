/**
 * L'interrupteur « Statistiques anonymes » : actif par defaut, et le couper vide la file.
 *
 * Il vit ici et non dans `SettingsManager`, par decision (docs/phase-7/7-d-la-mesure.md) : un module
 * qui porte sa donnee, son reglage et sa purge se retire d'un bloc, et `AppCore.tsx` est a la limite
 * de ses quatre cents lignes. `AppCore` n'importe que ce fichier, jamais l'index — qui l'importe, lui,
 * pour lire les quatre reglages comptes a chaque session.
 *
 * La valeur vit en memoire pour que `compter` reste synchrone. Tant que le disque n'a pas ete relu,
 * l'interrupteur vaut « actif », son defaut ; si la relecture dit le contraire, les abonnes sont
 * prevenus comme pour un geste, et l'index jette ce qui a ete compte entre-temps.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const CLE = 'mesure-reglage@1';

let actif = true;
const abonnes = new Set<(actif: boolean) => void>();

function prevenir(): void {
    for (const abonne of [...abonnes]) abonne(actif);
}

async function ecrire(valeur: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(CLE, JSON.stringify({ actif: valeur }));
    } catch (erreur) {
        console.warn(`[mesure] reglage non enregistre : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

/** Relit l'interrupteur depuis le disque. Une valeur illisible vaut « actif », le defaut. */
export async function chargerLeReglage(): Promise<boolean> {
    let relu = true;
    try {
        const brut = await AsyncStorage.getItem(CLE);
        const contenu = brut === null ? null : (JSON.parse(brut) as { actif?: unknown });
        relu = contenu?.actif !== false;
    } catch {
        relu = true;
    }
    if (relu !== actif) {
        actif = relu;
        prevenir();
    }
    return actif;
}

export function mesureActive(): boolean {
    return actif;
}

/** Allume ou coupe : la memoire d'abord, les abonnes ensuite — l'index vide la file quand on coupe —, le disque enfin. */
export async function activerLaMesure(valeur: boolean): Promise<void> {
    if (actif === valeur) return;
    actif = valeur;
    prevenir();
    await ecrire(valeur);
}

/** S'abonne aux changements de l'interrupteur ; rend le desabonnement. */
export function onReglageMesure(abonne: (actif: boolean) => void): () => void {
    abonnes.add(abonne);
    return () => {
        abonnes.delete(abonne);
    };
}

/** Le geste de la reinitialisation des reglages : l'interrupteur revient a son defaut, actif. */
export function reinitialiserLaMesure(): Promise<void> {
    return activerLaMesure(true);
}

/** La forme hook, pour la rangee des Reglages : la valeur courante, et le geste qui la change. */
export function useMesureActive(): [boolean, (valeur: boolean) => void] {
    const [valeur, setValeur] = useState(actif);
    useEffect(() => onReglageMesure(setValeur), []);
    return [valeur, (nouvelle) => { void activerLaMesure(nouvelle); }];
}

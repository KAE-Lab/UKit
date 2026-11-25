/**
 * Le magasin des amis (docs/phase-8/8-amis.md) : la liste, dans AsyncStorage, sur ce telephone
 * seulement. Rien ne part vers la base ; un ami retire est efface ici, et nulle part ailleurs puisque
 * rien n'est jamais parti. La reinitialisation des Reglages l'oublie (AppCore.resetSettings).
 *
 * La logique est dans `amis.ts` ; ce fichier lit, ecrit et previent les ecrans montes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useEffect, useState } from 'react';

import { maintenantMs } from '../../../shared/services/Temps';
import { ajouterUnAmi, ecrireLesAmis, lireLesAmis, retirerUnAmi, type Ami } from './amis';
import type { Partage } from './lienAmi';

const CLE = 'ukit.amis';
/** Le prenom montre au partage, garde pour le suivant (usePartage). */
export const CLE_DU_PRENOM = 'ukit.amis.prenom';

let amis: Ami[] | null = null;
let chargement: Promise<Ami[]> | null = null;
const abonnes = new Set<(amis: readonly Ami[]) => void>();

function charger(): Promise<Ami[]> {
    if (amis !== null) return Promise.resolve(amis);
    chargement ??= AsyncStorage.getItem(CLE)
        .then((brut) => lireLesAmis(brut))
        .catch((erreur) => {
            console.warn('[amis] lecture en echec', erreur);
            return [];
        })
        .then((lus) => {
            amis ??= lus;
            return amis;
        });
    return chargement;
}

async function poser(suivants: Ami[]): Promise<void> {
    amis = suivants;
    for (const abonne of abonnes) abonne(suivants);
    // Une ecriture en echec se dit dans le journal : la liste en memoire reste juste jusqu'a la relance.
    await AsyncStorage.setItem(CLE, ecrireLesAmis(suivants)).catch((erreur) => console.warn('[amis] ecriture en echec', erreur));
}

/** Ajoute (ou remplace, par le prenom) l'ami d'un lien recu ; rend son identifiant. */
export async function ajouterLAmi(partage: Partage, nom: string): Promise<string> {
    const actuels = await charger();
    const suivants = ajouterUnAmi(actuels, partage, nom, Crypto.randomUUID(), maintenantMs());
    await poser(suivants);
    return suivants[0].id;
}

export async function retirerLAmi(id: string): Promise<void> {
    await poser(retirerUnAmi(await charger(), id));
}

/** Tout oublier : la reinitialisation des Reglages. */
export async function oublierLesAmis(): Promise<void> {
    amis = [];
    chargement = null;
    for (const abonne of abonnes) abonne([]);
    await AsyncStorage.multiRemove([CLE, CLE_DU_PRENOM]).catch((erreur) => console.warn('[amis] effacement en echec', erreur));
}

/** La liste, et `null` tant qu'elle n'est pas lue. */
export function useAmis(): readonly Ami[] | null {
    const [liste, setListe] = useState<readonly Ami[] | null>(amis);
    useEffect(() => {
        let vivant = true;
        abonnes.add(setListe);
        void charger().then((lus) => { if (vivant) setListe(lus); });
        return () => {
            vivant = false;
            abonnes.delete(setListe);
        };
    }, []);
    return liste;
}

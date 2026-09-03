/**
 * L'identifiant d'installation : un UUID genere a la premiere ouverture, qui ne sert qu'a une chose —
 * dire si cet appareil est un testeur.
 *
 * Il vit dans le trousseau et non dans les reglages, parce qu'il doit survivre a « Reinitialiser » :
 * un testeur qui remet ses reglages a zero reste testeur. Seule la reinitialisation complete du menu
 * de developpement l'efface. Sur iOS, le trousseau survit aussi a une desinstallation.
 *
 * **Il ne quitte jamais l'appareil.** L'application lit la liste des testeurs et compare chez elle
 * (`statut.ts`) ; le seul endroit ou il s'affiche est le panneau Testeur du menu de developpement,
 * pour que son proprietaire le recopie dans la console.
 *
 * `uuid.v4()` vient d'`expo-modules-core`, deja dans chaque build : aucun module natif de plus,
 * donc Expo Go reste utilisable pour verifier ce jalon.
 */

import { uuid } from 'expo-modules-core';

import SecureStoreService from '../services/SecureStoreService';

let identifiant: string | null = null;

/** L'identifiant de cet appareil, cree s'il n'existe pas encore. Memoise pour la session. */
export async function identifiantInstallation(): Promise<string> {
    if (identifiant !== null) return identifiant;

    const existant = await SecureStoreService.getInstallationId();
    if (existant !== null) {
        identifiant = existant;
        return existant;
    }

    const neuf = uuid.v4();
    if (!(await SecureStoreService.saveInstallationId(neuf))) {
        // Un trousseau qui refuse l'ecriture donne un identifiant de session : l'appareil en aura un
        // autre au lancement suivant, et ne pourra pas etre enregistre comme testeur. Rien ne casse.
        console.warn('[testeur] identifiant non enregistre dans le trousseau');
    }
    identifiant = neuf;
    return neuf;
}

/** L'identifiant deja lu, sans toucher au trousseau. `null` avant la premiere lecture. */
export function identifiantConnu(): string | null {
    return identifiant;
}

/** Efface l'identifiant, memoire comprise. Reinitialisation complete seulement. */
export async function effacerIdentifiantInstallation(): Promise<void> {
    identifiant = null;
    await SecureStoreService.deleteInstallationId();
}

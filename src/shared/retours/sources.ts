/**
 * Ce que l'application sait de l'instant, pour le contexte d'un retour (lot 3) : la version, l'appareil
 * et son systeme, l'etablissement, la langue et le theme, le reseau, les derniers echecs de source et
 * le parcours de la session. La couture de plateforme du contexte, que `contexte.ts` met en blocs.
 */

import NetInfo from '@react-native-community/netinfo';
import * as Device from 'expo-device';

import { versionApplication } from '../ciblage/contexte';
import { getEtablissementActif } from '../etablissements/catalogue';
import { SettingsManager } from '../services/AppCore';
import type { EchecJoint, Reseau, SourcesDuContexte } from './contexte';
import { echecsRecents, parcoursRecent } from './journalDeSession';

/** Les ecrans du formulaire lui-meme : ils ne disent rien de ce qui s'est passe avant. */
const ECRANS_DU_FORMULAIRE = new Set(['Retour', 'MesRetours']);

/** « iOS 18.5 », « Android 15 » ; `null` quand l'appareil ne se nomme pas. */
function systemeDeLAppareil(): string | null {
    const parties = [Device.osName, Device.osVersion].filter((partie): partie is string => typeof partie === 'string' && partie !== '');
    return parties.length === 0 ? null : parties.join(' ');
}

async function reseau(): Promise<Reseau | null> {
    try {
        const etat = await NetInfo.fetch();
        if (etat.isConnected === false) return 'hors_ligne';
        if (etat.type === 'wifi') return 'wifi';
        if (etat.type === 'cellular') return 'cellulaire';
        return 'autre';
    } catch {
        return null;
    }
}

export async function sourcesDuContexte(onglet: string | null, erreur: EchecJoint | null): Promise<SourcesDuContexte> {
    return {
        version: versionApplication(),
        appareil: Device.modelName,
        systeme: systemeDeLAppareil(),
        // Le nom affiche, pas le code : c'est une personne qui lira la console (idee du 2026-09-21).
        etablissement: getEtablissementActif().nom,
        langue: SettingsManager.getLanguage(),
        theme: SettingsManager.getTheme(),
        onglet,
        reseau: await reseau(),
        echecs: echecsRecents(),
        // Sans les ecrans du formulaire, puis sans les repetitions que leur retrait rapproche.
        parcours: parcoursRecent().filter((ecran) => !ECRANS_DU_FORMULAIRE.has(ecran))
            .filter((ecran, i, tous) => i === 0 || tous[i - 1] !== ecran),
        erreur,
    };
}

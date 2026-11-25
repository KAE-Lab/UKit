/**
 * La notation de UKit (phase 8, lot 4 ; docs/phase-8/4-sondages-idees-notation.md) : la fiche native du
 * systeme, sans quitter l'application (`expo-store-review`), proposee apres un usage reussi selon la
 * cadence de `cadence.ts` ; et la page d'avis du store, ouverte par la rangee « Noter UKit ».
 *
 * Le module natif se charge a la demande : un build qui ne le porte pas ne propose rien, sans planter.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

import { jourDeParis } from '../communaute/donnees';
import { lireMemoire, noterAvis, noterUsage, peutDemander, type MemoireDeNotation } from './cadence';

const CLE = 'notation@1';
/** L'App Store : la page qui ouvre directement l'ecriture d'un avis. Google Play : la fiche, ou l'avis s'ecrit. */
const PAGE_D_AVIS = Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/id1394708917?action=write-review'
    : 'https://play.google.com/store/apps/details?id=com.bordeaux1.emplois';
const FICHE_PLAY = 'market://details?id=com.bordeaux1.emplois';

async function lire(): Promise<MemoireDeNotation> {
    try {
        return lireMemoire(JSON.parse((await AsyncStorage.getItem(CLE)) ?? 'null'));
    } catch {
        return lireMemoire(null);
    }
}

async function ecrire(memoire: MemoireDeNotation): Promise<void> {
    await AsyncStorage.setItem(CLE, JSON.stringify(memoire)).catch(() => undefined);
}

let enCours: Promise<unknown> = Promise.resolve();

/** Une modification de la memoire a la fois : un usage et un avis du meme instant ne s'effacent pas. */
function modifier(changer: (memoire: MemoireDeNotation, jour: string) => MemoireDeNotation): Promise<MemoireDeNotation> {
    const suivante = enCours.then(async () => {
        const memoire = changer(await lire(), jourDeParis(new Date()));
        await ecrire(memoire);
        return memoire;
    });
    enCours = suivante.catch(() => undefined);
    return suivante;
}

/** Une question d'avis vient d'etre posee — un vote, un « moi aussi », un retour : pas de note ce jour-la. */
export function noterUneQuestionDAvis(): void {
    void modifier(noterAvis);
}

/**
 * Un usage vient de reussir — un menu lu, une fiche de bibliotheque ouverte. Le jour compte ; et si la
 * cadence le permet, la fiche du systeme est demandee, que le systeme borne encore (et peut taire).
 * Ne leve jamais.
 */
export async function apresUnUsageReussi(): Promise<void> {
    try {
        const jour = jourDeParis(new Date());
        const memoire = await modifier(noterUsage);
        if (!peutDemander(memoire, jour)) return;
        const StoreReview = await import('expo-store-review');
        if (!(await StoreReview.isAvailableAsync())) return;
        await modifier((m) => ({ ...m, demandee: jour }));
        await StoreReview.requestReview();
    } catch (erreur) {
        console.warn(`[notation] non demandee : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

/** « Noter UKit » : la page d'avis du store, hors de l'application. Sur Android, l'application Play d'abord. */
export async function ouvrirLaPageDAvis(): Promise<void> {
    if (Platform.OS === 'android') {
        try {
            await Linking.openURL(FICHE_PLAY);
            return;
        } catch {
            // Sans l'application Play (un appareil sans services Google), la fiche web.
        }
    }
    await Linking.openURL(PAGE_D_AVIS).catch(() => undefined);
}

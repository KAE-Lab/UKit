/**
 * Les evenements du campus dans le Planning : le magasin de l'appareil, la lecture des annonces, et ce
 * que les ecrans en tirent (phase 8, lot 5 ; docs/phase-8/5-evenements.md). Les regles vivent dans
 * `evenements.ts`, pur et teste ; ce module ne fait que garder, lire et prevenir.
 *
 * Rien ne part vers la base : l'ajout, le masquage et l'abonnement s'ecrivent dans AsyncStorage. La
 * seule requete est une lecture anonyme des annonces d'evenement, comme celle du Campus.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type moment from 'moment';

import BdeService, { type BdeAnnonce } from '../../features/Campus/services/BdeService';
import type { PlanningEvent } from '../../features/Planning/services/PlanningAssembly';
import { maintenantMs } from '../services/Temps';
import style from '../theme/Theme';
import {
    aRelire,
    ajouter,
    choisirAbonnement,
    doitProposer,
    estAjoute,
    ETAT_VIDE,
    evenementsDeLAgenda,
    evenementsParJour,
    lireEtat,
    masquer,
    oublierLesAnciens,
    reconcilier,
    signatureDeLAgenda,
    suiviDe,
    visibles,
    type EtatDesEvenements,
    type EvenementSuivi,
} from './evenements';

const CLE = 'evenements-planning@1';

let etat: EtatDesEvenements = ETAT_VIDE;
let chargement: Promise<void> | null = null;
let lecture: Promise<void> | null = null;
const abonnes = new Set<(etat: EtatDesEvenements) => void>();
const abonnesDeLAgenda = new Set<() => void>();

/**
 * L'etat **courant**, une fois le magasin lu. La promesse de lecture ne sert qu'a attendre : sa valeur
 * serait celle du premier chargement, et un geste applique dessus effacerait les precedents.
 */
async function charger(): Promise<EtatDesEvenements> {
    chargement ??= AsyncStorage.getItem(CLE)
        .then((brut) => { etat = oublierLesAnciens(lireEtat(brut === null ? null : JSON.parse(brut)), maintenantMs()); })
        .catch((erreur: unknown) => {
            console.warn(`[evenements] magasin illisible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        });
    await chargement;
    return etat;
}

async function ecrire(suivant: EtatDesEvenements): Promise<void> {
    const agendaChange = signatureDeLAgenda(etat) !== signatureDeLAgenda(suivant);
    etat = suivant;
    for (const abonne of abonnes) abonne(etat);
    if (agendaChange) for (const abonne of abonnesDeLAgenda) abonne();
    try {
        await AsyncStorage.setItem(CLE, JSON.stringify(etat));
    } catch (erreur) {
        console.warn(`[evenements] magasin non ecrit : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

async function modifier(geste: (courant: EtatDesEvenements) => EtatDesEvenements): Promise<EtatDesEvenements> {
    await ecrire(geste(await charger()));
    return etat;
}

/** Prevenu a chaque changement : le Planning se remele, la fiche et les Reglages se redessinent. */
export function abonnerAuxEvenements(abonne: (etat: EtatDesEvenements) => void): () => void {
    abonnes.add(abonne);
    return () => { abonnes.delete(abonne); };
}

/**
 * Prevenu quand ce que l'agenda du telephone doit porter change — un ajout, un retrait, une annonce
 * modifiee ou annulee —, et seulement alors : une relecture qui ne change rien ne resynchronise pas.
 */
export function abonnerALAgenda(abonne: () => void): () => void {
    abonnesDeLAgenda.add(abonne);
    return () => { abonnesDeLAgenda.delete(abonne); };
}

/**
 * Relit les evenements publies si une lecture est due — ou tout de suite, `force`. Un echec garde ce que
 * l'appareil sait : un evenement ajoute ne disparait jamais sur la foi d'une base injoignable. Ne leve pas.
 */
export function rafraichirLesEvenements(force = false): Promise<void> {
    lecture ??= (async () => {
        const courant = await charger();
        if (!force && !aRelire(courant, maintenantMs())) return;
        const resultat = await BdeService.fetchEvenements();
        if (resultat.ok === false) return;
        const publies = resultat.annonces.map(suiviDe).filter((suivi): suivi is EvenementSuivi => suivi !== null);
        await modifier((dernier) => reconcilier(dernier, publies, maintenantMs()));
    })()
        .catch((erreur: unknown) => { console.warn(`[evenements] lecture impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`); })
        .finally(() => { lecture = null; });
    return lecture;
}

/** Les evenements a montrer les jours donnes, par jour : instantane, sans reseau. */
export async function evenementsDuCampus(jours: readonly moment.Moment[]): Promise<Map<string, PlanningEvent[]>> {
    return evenementsParJour(visibles(await charger()), jours, style.colors.brand);
}

/** Ce que la synchronisation ecrit dans l'agenda : les ajoutes un par un. */
export async function evenementsASynchroniser(): Promise<PlanningEvent[]> {
    return evenementsDeLAgenda(await charger());
}

/**
 * « Ajouter a mon planning » : l'evenement entre, et la reponse dit s'il faut proposer l'abonnement —
 * une fois, apres le premier ajout, jamais a qui l'a deja.
 */
export async function ajouterAuPlanning(annonce: BdeAnnonce): Promise<{ readonly proposer: boolean }> {
    const suivi = suiviDe(annonce);
    if (suivi === null) return { proposer: false };
    const proposer = doitProposer(await charger());
    await modifier((courant) => ajouter(courant, suivi));
    return { proposer };
}

export async function masquerDuPlanning(id: string): Promise<void> {
    await modifier((courant) => masquer(courant, id));
}

/** L'abonnement, dans la proposition ou les Reglages ; le prendre lit tout de suite ce qu'il montre. */
export async function choisirLAbonnement(actif: boolean): Promise<void> {
    await modifier((courant) => choisirAbonnement(courant, actif));
    if (actif) await rafraichirLesEvenements(true);
}

/** Une reinitialisation repart de rien, comme une reinstallation. */
export async function oublierLesEvenements(): Promise<void> {
    // Apres la lecture du magasin : une lecture en vol reecrirait l'ancien etat par-dessus.
    await charger();
    await ecrire(ETAT_VIDE);
    try {
        await AsyncStorage.removeItem(CLE);
    } catch {
        // Le magasin vide en memoire suffit : la prochaine ecriture le remplace.
    }
}

/** L'etat, suivi : `null` tant que le magasin n'est pas lu. */
function useEtatDesEvenements(): EtatDesEvenements | null {
    const [courant, setCourant] = useState<EtatDesEvenements | null>(null);
    useEffect(() => {
        let vivant = true;
        void charger().then((lu) => { if (vivant) setCourant(lu); });
        const desabonner = abonnerAuxEvenements(setCourant);
        return () => { vivant = false; desabonner(); };
    }, []);
    return courant;
}

/** Le reglage « Evenements du campus » : l'abonnement, desactive par defaut. */
export function useAbonnementAuxEvenements(): [boolean, (actif: boolean) => void] {
    const courant = useEtatDesEvenements();
    const choisir = useCallback((actif: boolean) => { void choisirLAbonnement(actif); }, []);
    return [courant?.abonnement ?? false, choisir];
}

export interface EvenementDeLaFiche {
    /** Ajoute un par un ; `null` tant que le magasin n'est pas lu : le bouton attend plutot que de mentir. */
    readonly ajoute: boolean | null;
    /** Ajoute l'evenement, et dit s'il faut proposer l'abonnement — une fois, apres le premier ajout. */
    readonly ajouter: () => Promise<{ readonly proposer: boolean }>;
    readonly retirer: () => Promise<void>;
    /** La reponse a la proposition ; « pas maintenant » la ferme aussi pour de bon. */
    readonly repondre: (abonner: boolean) => Promise<void>;
}

/** « Ajouter a mon planning », sur la fiche d'une annonce d'evenement. */
export function useEvenementDeLaFiche(annonce: BdeAnnonce): EvenementDeLaFiche {
    const courant = useEtatDesEvenements();
    const ajouterLeSuivi = useCallback(() => ajouterAuPlanning(annonce), [annonce]);
    const retirer = useCallback(() => masquerDuPlanning(annonce.id), [annonce.id]);
    return { ajoute: courant === null ? null : estAjoute(courant, annonce.id), ajouter: ajouterLeSuivi, retirer, repondre: choisirLAbonnement };
}

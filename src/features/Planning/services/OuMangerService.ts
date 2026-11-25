/**
 * Ou manger, les lectures (docs/phase-8/6-intelligence.md) : la liste des restaurants, ce que la
 * communaute en dit aujourd'hui, puis le menu des deux proposes. Le choix est pur (ouManger.ts) ; ce
 * module ne fait que lire, et garder en memoire.
 *
 * **Le cout est borne** : la carte ne demande midi que le jour meme, un trou de midi a venir ou en cours.
 * La liste et chaque menu se gardent une demi-heure en memoire, et deux appels simultanes partagent la
 * meme lecture : revenir sur l'onglet ne rejoue rien. Les signalements et les etats officiels passent
 * par les lectures du lot 2, qui ne redemandent que ce qui a bouge.
 */

import { classement, lireLeLieu, lireLesEtatsOfficiels, lireLesSignalementsDuJour, nomDePlat, type EtatOfficiel, type Signalement } from '../../../shared/communaute';
import { jourDeParis } from '../../../shared/communaute/donnees';
import { cibleDuLieu, sujetDeLieu } from '../../../shared/communaute/vocabulaire';
import type { SemanticTone } from '../../../shared/theme/Theme';
import { lignesSurPlace } from '../../Campus/communaute/presentation';
import { platsDuJour } from '../../Campus/communaute/useSurPlaceDuRestaurant';
import { CrousService, type CrousDayMenu, type CrousRestaurant, type CrousRestaurantsResult } from '../../Campus/services/CrousService';
import type { CreneauDeService } from '../../Campus/communaute/service';
import { crousRegionActive } from '../../../shared/etablissements';
import { choisirLesRestaurants, platPrincipal, type Lieu } from './ouManger';
import type { Plage } from './carteDuJour';

const MEMOIRE_MS = 30 * 60 * 1000;

interface Garde<T> {
    readonly quand: number;
    readonly promesse: Promise<T>;
}

/** La liste et la region CROUS qu'elle couvre : un autre etablissement peut en declarer une autre. */
let liste: (Garde<CrousRestaurantsResult> & { readonly region: string | null }) | null = null;
const menus = new Map<string, Garde<readonly CrousDayMenu[]>>();

/** Une lecture gardee une demi-heure ; un echec ne se garde pas, la suivante reessaie. */
function garder<T>(garde: Garde<T> | null | undefined, lire: () => Promise<T>, reussie: (valeur: T) => boolean, poser: (g: Garde<T> | null) => void): Promise<T> {
    const maintenant = Date.now();
    if (garde != null && maintenant - garde.quand < MEMOIRE_MS) return garde.promesse;
    const promesse = lire();
    poser({ quand: maintenant, promesse });
    void promesse.then((valeur) => { if (!reussie(valeur)) poser(null); }, () => poser(null));
    return promesse;
}

function lireLaListe(): Promise<CrousRestaurantsResult> {
    const region = crousRegionActive();
    // Sans position : la distance qui compte est celle du batiment, calculee par le choix. Aucun geste
    // ne demande cette lecture : elle part en automatique, et le disjoncteur la retient (7-C).
    return garder(liste?.region === region ? liste : null, () => CrousService.fetchRestaurantsBordeaux(undefined, undefined, 'automatique'),
        (r) => r.ok === true, (g) => { liste = g === null ? null : { ...g, region }; });
}

function lireLeMenu(id: string): Promise<readonly CrousDayMenu[]> {
    return garder(menus.get(id), async () => {
        const resultat = await CrousService.fetchRestaurantMenu(id, 'automatique');
        return resultat.ok === false ? [] : resultat.menus;
    }, (m) => m.length > 0, (g) => { if (g === null) menus.delete(id); else menus.set(id, g); });
}

/** Ce que la communaute dit de l'attente, tel que la fiche le montre. */
export interface AttenteSignalee {
    readonly valeur: string;
    readonly ton: SemanticTone;
    readonly enRetrait: boolean;
}

export interface Suggestion {
    readonly restaurant: CrousRestaurant;
    readonly distanceKm: number;
    readonly service: CreneauDeService;
    /** Le plat recommande du jour, sinon le premier plat principal du menu ; `null` sans menu. */
    readonly plat: { readonly nom: string; readonly recommande: boolean } | null;
    readonly attente: AttenteSignalee | null;
}

export type ResultatDeMidi =
    | { readonly etat: 'pret'; readonly suggestions: readonly Suggestion[] }
    | { readonly etat: 'indisponible' };

const FERMETURES = new Set(['restaurant.ferme', 'restaurant.ferme_jusqu']);

/** Les lignes « Sur place » d'un restaurant, celles de sa fiche. */
function lignesDu(id: string, signalements: readonly Signalement[], officiels: readonly EtatOfficiel[], instant: number) {
    const cible = cibleDuLieu('restaurant', id);
    if (cible === null) return { cible, lignes: [] };
    // Sans empreinte d'horaires : la carte ne montre pas de correction, elle ne lit que fermetures et attente.
    const etats = lireLeLieu(signalements, officiels, 'restaurant', cible, instant, { empreinteDesHoraires: null });
    return { cible, lignes: lignesSurPlace(etats, { maintenant: instant, empreinteDesHoraires: null }) };
}

/**
 * Les restaurants a proposer pour la fenetre, autour du lieu. `indisponible` quand la liste n'a pas pu
 * etre lue (hors ligne, source en panne, etablissement sans restaurants) : la carte dit alors la
 * fenetre seule.
 */
export async function proposerOuManger(demande: { readonly fenetre: Plage; readonly lieu: Lieu; readonly instant: Date }): Promise<ResultatDeMidi> {
    const instant = demande.instant.getTime();
    const [resultat, jour, officiel] = await Promise.all([
        lireLaListe(),
        lireLesSignalementsDuJour(demande.instant),
        lireLesEtatsOfficiels(instant),
    ]);
    if (resultat.ok === false) return { etat: 'indisponible' };

    const fermes = new Set<string>();
    for (const restaurant of resultat.restaurants) {
        const { lignes } = lignesDu(restaurant.id, jour.signalements, officiel.officiels, instant);
        if (lignes.some((l) => FERMETURES.has(l.sujet.sujet) && l.valeur === 'oui' && !l.enRetrait)) fermes.add(restaurant.id);
    }

    const choix = choisirLesRestaurants(resultat.restaurants, {
        fenetre: demande.fenetre,
        lieu: demande.lieu,
        jourDeLaSemaine: demande.instant.getDay(),
        fermes,
    });
    const aujourdhui = jourDeParis(demande.instant);
    const sujetDuPlat = sujetDeLieu('restaurant.plat');

    const suggestions = await Promise.all(choix.map(async ({ restaurant, distanceKm, service }): Promise<Suggestion> => {
        const menu = (await lireLeMenu(restaurant.id)).find((un) => un.date === aujourdhui);
        const { cible, lignes } = lignesDu(restaurant.id, jour.signalements, officiel.officiels, instant);
        const permis = new Set(platsDuJour(menu));
        const recommande = cible === null || sujetDuPlat === undefined || permis.size === 0
            ? undefined
            : classement(jour.signalements, sujetDuPlat, cible, instant, permis)[0];
        const principal = platPrincipal(menu);
        const plat = recommande !== undefined
            ? { nom: nomDePlat(recommande.valeur), recommande: true }
            : principal === null ? null : { nom: principal, recommande: false };
        const ligneDAttente = lignes.find((l) => l.sujet.sujet === 'restaurant.attente');
        const attente = ligneDAttente === undefined ? null : { valeur: ligneDAttente.valeur, ton: ligneDAttente.ton, enRetrait: ligneDAttente.enRetrait };
        return { restaurant, distanceKm, service, plat, attente };
    }));
    return { etat: 'pret', suggestions };
}

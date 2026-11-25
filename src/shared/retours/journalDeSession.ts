/**
 * Ce que la session retient pour un retour (lot 3) : les derniers ecrans parcourus, par leur nom de
 * route, et les derniers echecs de source, par leur hote et leur famille. En memoire seulement : rien ne
 * s'ecrit sur le disque, rien ne part sans que l'etudiant envoie un retour et laisse le bloc joint.
 *
 * Pur, sinon l'abonnement aux echecs de run, que `brancherLeJournal` pose une fois.
 */

import { onEchecDeRun } from '../aetherius/observateurs';
import type { EchecJoint } from './contexte';

/** Le parcours garde : la fonction en accepte quinze, l'ecran en montre autant. */
export const TAILLE_DU_PARCOURS = 15;
export const TAILLE_DES_ECHECS = 5;
/** Un echec plus vieux ne dit plus rien de l'instant. */
export const FRAICHEUR_DES_ECHECS_MS = 60 * 60_000;

interface EchecDate {
    readonly hote: string;
    readonly famille: string;
    readonly at: number;
}

let parcours: string[] = [];
let echecs: EchecDate[] = [];

/** Le parcours apres un ecran : un ecran repete ne s'ajoute pas, le plus ancien sort. */
export function ajouterAuParcours(courant: readonly string[], ecran: string): string[] {
    if (ecran === '' || courant[courant.length - 1] === ecran) return [...courant];
    return [...courant, ecran].slice(-TAILLE_DU_PARCOURS);
}

/** Les ecrans du formulaire lui-meme : ils ne disent rien de ce qui s'est passe avant. */
const ECRANS_DU_FORMULAIRE = new Set(['Retour', 'MesRetours']);

/** Le parcours joint a un retour : sans les ecrans du formulaire, puis sans les repetitions que leur retrait rapproche. */
export function parcoursAJoindre(courant: readonly string[]): string[] {
    return courant.filter((ecran) => !ECRANS_DU_FORMULAIRE.has(ecran))
        .filter((ecran, i, tous) => i === 0 || tous[i - 1] !== ecran);
}

/** Les echecs a joindre : les plus recents d'abord gardes, chacun une fois par hote et famille, en minutes. */
export function echecsAJoindre(liste: readonly EchecDate[], maintenant: number): EchecJoint[] {
    const vus = new Set<string>();
    const sortie: EchecJoint[] = [];
    for (const echec of [...liste].reverse()) {
        const cle = `${echec.hote}|${echec.famille}`;
        if (vus.has(cle) || maintenant - echec.at > FRAICHEUR_DES_ECHECS_MS || echec.at > maintenant) continue;
        vus.add(cle);
        sortie.push({ hote: echec.hote, famille: echec.famille, minutes: Math.round((maintenant - echec.at) / 60_000) });
        if (sortie.length === TAILLE_DES_ECHECS) break;
    }
    return sortie;
}

export function noterEcran(nom: string | undefined): void {
    if (nom !== undefined) parcours = ajouterAuParcours(parcours, nom);
}

export function parcoursRecent(): readonly string[] {
    return parcours;
}

export function echecsRecents(maintenant: number = Date.now()): EchecJoint[] {
    return echecsAJoindre(echecs, maintenant);
}

/** Le dernier echec d'une famille, pour l'erreur d'une carte : la carte connait la famille, pas l'hote. */
export function dernierEchecDeFamille(famille: string, maintenant: number = Date.now()): EchecJoint | null {
    return echecsAJoindre(echecs.filter((e) => e.famille === famille), maintenant)[0] ?? null;
}

let branche = false;

/** S'abonne une fois aux echecs de run ; les echecs silencieux n'arrivent pas jusqu'ici. */
export function brancherLeJournal(): void {
    if (branche) return;
    branche = true;
    onEchecDeRun((echec) => {
        echecs = [...echecs, { hote: echec.hote, famille: echec.famille, at: Date.now() }].slice(-4 * TAILLE_DES_ECHECS);
    });
}

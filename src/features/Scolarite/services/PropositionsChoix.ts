/**
 * Ce que l'etudiant **choisit** dans une proposition d'UE, et ce qu'on compare pour la faire.
 *
 * La premiere version acceptait en lot : « Appliquer » masquait toutes les UE du complement. Deux
 * retours du formulaire (tries le 2026-11-10) disent ce que ca coute — un vrai cours masque, et rien
 * pour le retrouver. Le complement n'est pas une certitude : l'annuaire liste les inscriptions
 * **pedagogiques**, qui arrivent souvent apres la rentree et ne portent pas les options choisies en
 * cours de semestre, et un meme cours peut vivre sous deux codes (`MI601A`, filtresUe.ts). Aucune UE
 * du complement n'est donc sure, et **aucune n'est cochee d'office** : l'etudiant coche ce qu'il ne
 * suit pas.
 *
 * Pur, sans dependance de plateforme : PropositionsChoix.test.ts.
 *
 * Voir docs/features/scolarite.md.
 */

import type { Proposition } from './PropositionsDecision';

/**
 * Les UE de l'annee des favoris, telles que la modale les a demandees.
 *
 * `en-cours` n'est pas `echec` : tant que la lecture de l'annee court, la proposition attend, sans
 * quoi elle s'afficherait sur la liste partielle puis changerait sous les yeux de l'etudiant.
 */
export type AnneeDesFavoris =
    | { readonly etat: 'sans-objet' }
    | { readonly etat: 'en-cours' }
    | { readonly etat: 'echec' }
    | { readonly etat: 'lue'; readonly ues: readonly string[] };

/**
 * Les UE contre lesquelles comparer le dossier, ou `null` pour attendre.
 *
 * L'annee des favoris d'abord : la liste des UE rencontrees s'accumule sur **tous** les plannings
 * affiches, et consulter le groupe d'un ami y versait ses UE — la modale proposait alors de masquer
 * des cours qui ne sont pas dans le planning de l'etudiant, et sa phrase d'explication mentait. La
 * liste accumulee reste le repli quand l'annee n'a pas pu etre lue : mieux vaut une proposition
 * qu'aucune, puisque rien n'y est coche.
 */
export function uesAComparer(annee: AnneeDesFavoris, rencontrees: readonly string[]): readonly string[] | null {
    if (annee.etat === 'en-cours') return null;
    if (annee.etat === 'lue') return annee.ues;
    return rencontrees;
}

/** Le choix au moment ou la modale s'ouvre : vide, toujours. Voir l'en-tete. */
export function choixInitial(): ReadonlySet<string> {
    return new Set();
}

/** Coche ou decoche une UE, sans muter le choix precedent : c'est un etat React. */
export function basculer(choix: ReadonlySet<string>, code: string): ReadonlySet<string> {
    const suivant = new Set(choix);
    if (suivant.has(code)) suivant.delete(code);
    else suivant.add(code);
    return suivant;
}

/**
 * Ce que « Appliquer » pose : les UE cochees, dans l'ordre de la proposition, et l'emploi du temps.
 *
 * Une UE cochee qui n'est plus proposee (la proposition a ete redecidee entre-temps) ne part pas :
 * on ne masque que ce que l'ecran montrait.
 */
export function aAppliquer(proposition: Proposition, choix: ReadonlySet<string>): Proposition {
    return { ues: proposition.ues.filter((code) => choix.has(code)), edt: proposition.edt };
}

/** Rien a appliquer : aucune UE cochee et aucun emploi du temps. Le bouton principal se desactive. */
export function estVide(proposition: Proposition): boolean {
    return proposition.ues.length === 0 && proposition.edt === null;
}

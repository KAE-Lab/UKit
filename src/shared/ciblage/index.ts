/**
 * Le ciblage d'un contenu publie — audience, campus, fenetre de versions — partage par les annonces
 * et les messages de service (jalon 6.1-B). Voir docs/pilotage.md.
 */

export { CIBLAGE_TOUS, estCible, projeterCiblage } from './ciblage';
export type { Audience, Ciblage, ContexteDeCiblage } from './ciblage';
export { contexteDeCiblage, versionApplication } from './contexte';
export { comparerVersions, lireVersion, versionDansFenetre } from './versions';

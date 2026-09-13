/**
 * L'audience « testeurs » : un identifiant par appareil, et la reponse « en fais-tu partie ? ».
 *
 * Voir docs/pilotage.md.
 */

export { identifiantConnu, identifiantInstallation, lireIdentifiant } from './identifiant';
export type { Identifiant, SourceDIdentifiant } from './identifiant';
export { chargerStatutTesteur, estTesteur, rafraichirStatutTesteur } from './statut';
export type { RapportTesteur } from './statut';

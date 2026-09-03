/**
 * L'audience « testeurs » : un identifiant par appareil, et la reponse « en fais-tu partie ? ».
 *
 * Voir docs/pilotage.md.
 */

export { effacerIdentifiantInstallation, identifiantConnu, identifiantInstallation } from './identifiant';
export { chargerStatutTesteur, estTesteur, rafraichirStatutTesteur } from './statut';
export type { RapportTesteur } from './statut';

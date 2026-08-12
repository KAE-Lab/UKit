/**
 * Le socle Aetherius de UKit : la porte d'entree unique des services vers le moteur.
 *
 * Un service importe d'ici, jamais des paquets directement — c'est ce qui garde la surface petite
 * et ce qui permettra d'en changer sans repasser sur chaque appelant.
 *
 * Vue d'ensemble : docs/blueprints.md · Cadrage : docs/phase-6/README.md
 */

export { getAetheriusClient } from './client';
export { describeUkitFailure, reportFailure, serviceAbsent, ukitFailure, FAILURE_PRESENTATION } from './failures';
export type { FailurePresentation, UkitFailure, UkitFailureKind } from './failures';
export {
    describeDelivery,
    estNomDePortail,
    lastRefreshReport,
    listBlueprints,
    refreshBlueprints,
    resolveBlueprint,
    revertBlueprints,
} from './registry';
export type {
    BlueprintLine,
    BlueprintOrigin,
    BlueprintStatus,
    RefreshReport,
    ResolvedBlueprint,
    RunnableBlueprintName,
} from './registry';
export { runBlueprint } from './runBlueprint';
export type { BlueprintRun, RunBlueprintOptions, RunInputs } from './runBlueprint';
export { ukitSecrets } from './secrets';
export type { CredentialStore, SecretResolver } from './secrets';
export { BLUEPRINT, REMOTE_NAME_PREFIX } from '../../../blueprints';
export type { BlueprintName, PortailBlueprintName } from '../../../blueprints';

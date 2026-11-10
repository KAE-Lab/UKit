/**
 * Le lien d'abonnement **lu sur le compte** : quand le lire, et ce qu'on accepte d'en garder.
 *
 * La suite que le jalon 6-J avait reservee. Chez un etablissement dont l'emploi du temps n'existe que
 * par un abonnement personnel — l'IUT de Bordeaux, sous PRONOTE —, coller son lien est un geste que
 * personne n'a envie de faire, et que le compte universitaire rend inutile : une fois connecte, un
 * Blueprint de portail lit l'adresse dans l'espace de l'etudiant (`edt.abonnement.blueprint_lien`), et
 * l'application la range **exactement** la ou la saisie manuelle la rangeait. Rien en aval ne sait d'ou
 * elle vient.
 *
 * Pur, sans plateforme : la regle « quand lire » se trompe en silence — un etudiant qui recolle un lien
 * que son compte savait lire, ou une lecture rejouee a chaque lancement — et la regle « que garder »
 * se trompe pire, en rangeant comme emploi du temps une adresse qui n'en est pas un. Les deux se
 * verrouillent donc par des tests (LienDuCompte.test.ts).
 *
 * Voir docs/features/planning.md et docs/campus/bordeaux-iut.md.
 */

import { REMOTE_NAME_PREFIX, type PortailBlueprintName } from '../../../../blueprints';
import { sourceEdt } from '../../../shared/etablissements/edt';

/**
 * Le Blueprint qui lit le lien sur le compte, **s'il y a lieu de le jouer maintenant** — sinon `null`.
 *
 * Trois conditions, et chacune evite un run inutile sur un portail qui n'est pas a nous :
 *
 *   - l'emploi du temps de l'etablissement attend **un lien qu'on n'a pas** (`lien-attendu`). Un lien
 *     deja range — lu ou colle — ne se relit pas : l'adresse PRONOTE est stable d'une session a l'autre
 *     (mesure du 2026-11-10), et la relire a chaque lancement couterait un parcours de navigateur pour
 *     rien. Un etablissement dont la source est Celcat ou un referentiel ne passe pas par la non plus :
 *     le lien n'y serait jamais joue ;
 *   - le catalogue **nomme** un Blueprint de lecture. Sans lui, le collage reste le seul chemin ;
 *   - le nom est sous le **prefixe reserve**. Une ligne mal ecrite nommerait un Blueprint que le registre
 *     refuserait d'ajouter, et l'echec arriverait au milieu d'une session ; le refuser ici le rend lisible.
 */
export function blueprintDuLienALire(): PortailBlueprintName | null {
    const source = sourceEdt();
    if (source.kind !== 'lien-attendu') return null;

    // `?? null` : un cache de catalogue ecrit avant que le champ n'existe rend `undefined`.
    const nom = source.config.blueprintLien ?? null;
    if (nom === null) return null;
    if (!nom.startsWith(REMOTE_NAME_PREFIX)) {
        console.warn(`[lienEdt] '${nom}' n est pas sous le prefixe reserve, ignore`);
        return null;
    }
    return nom as PortailBlueprintName;
}

/**
 * Une adresse d'abonnement plausible : `https`, un hote, un chemin, aucun blanc.
 *
 * La forme seule, et c'est volontaire : l'hote et le chemin sont propres a l'etablissement et vivent
 * dans son Blueprint, qui affirme deja la forme PRONOTE avant de rendre. Ce motif est la seconde
 * ceinture, celle qui garantit que ce qu'on range **est une adresse** — un gabarit non resolu
 * (`{{ … }}`), une chaine vide ou un `None` venu d'une valeur absente ne passent pas.
 */
const ADRESSE = /^https:\/\/[^\s/?#{}]+\/[^\s{}]+$/;

/**
 * L'adresse rendue par le run, ou `null` si elle n'est pas exploitable.
 *
 * `null` n'est pas une panne a afficher : c'est « le compte n'a rien donne », et l'etudiant retrouve
 * alors l'etat qu'il avait avant ce mecanisme — l'invitation a coller son lien.
 */
export function projeterLienLu(outputs: Readonly<Record<string, unknown>>): string | null {
    const lien = outputs.lien;
    if (typeof lien !== 'string') return null;

    const nettoye = lien.trim();
    return ADRESSE.test(nettoye) ? nettoye : null;
}

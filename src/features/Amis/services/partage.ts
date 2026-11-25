/**
 * Ce qui part quand on partage son emploi du temps (docs/phase-8/8-amis.md), sans React ni reseau.
 *
 * **Des groupes, seulement s'ils sont publics un par un.** Un favori se compare au referentiel publie
 * de l'etablissement (`sourcePubliqueDe`, sans le groupe personnel), pas a la table personnelle en
 * memoire : celle-ci peut etre vide quand le trousseau n'a pas pu etre lu au demarrage, alors que le
 * favori personnel — le nom et le prenom lus dans le dossier — est toujours la. Le comparer a la table
 * le faisait partir comme un code de groupe (relecture du lot). Chez Celcat, la liste est vivante et il
 * n'existe pas de groupe personnel : tout favori est public.
 *
 * **Et seulement si le lien qui les porte se relit** : plus de dix favoris, un nom trop long, un filtre
 * qui n'est pas un code d'UE donneraient un lien que l'ami verrait illisible. L'instantane, qui ne porte
 * que des heures, prend alors le relais.
 */

import { lienDu, lireLeLien, type ContenuPartage } from './lienAmi';

export function partageParGroupes(demande: {
    readonly source: 'celcat' | 'ical' | 'abonnement';
    readonly etablissement: string;
    readonly favoris: readonly string[];
    readonly filtres: readonly string[];
    /** Les noms du referentiel publie ; `null` chez Celcat, dont la liste est vivante. */
    readonly groupesPublics: readonly string[] | null;
}): ContenuPartage | null {
    const { source, etablissement, favoris, filtres, groupesPublics } = demande;
    if (source === 'abonnement' || favoris.length === 0) return null;
    if (groupesPublics !== null && !favoris.every((favori) => groupesPublics.includes(favori))) return null;
    const contenu: ContenuPartage = { genre: 'groupes', groupes: [...favoris], filtres: [...filtres] };
    const lien = lienDu({ etablissement, nom: null, contenu });
    return lien !== null && lireLeLien(lien).ok === true ? contenu : null;
}

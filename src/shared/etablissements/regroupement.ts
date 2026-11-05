/**
 * La liste des etablissements, regroupee par campus et cherchee par alias (jalon 7-J, lot des
 * Reglages ; le cote application des colonnes `campus` et `alias` que la 6.2.2 a posees en base).
 *
 * **Par campus**, parce que les campus arrivent par trois (IUT de Bordeaux, Victoire, Bordeaux
 * Montaigne, [7-B](../../../docs/phase-7/7-b-nouveaux-campus.md)) et qu'une liste plate de lignes au
 * meme portail se lirait comme des doublons. Les groupes gardent l'ordre du catalogue (`ordre`, puis le
 * nom) : la curation de la console decide, un tri alphabetique la defairait. Un etablissement qui ne
 * nomme pas de campus va dans un groupe sans titre, a sa place.
 *
 * **Par alias**, parce qu'un etudiant tape « UB » ou « ENSEIRB », pas le nom du catalogue. La recherche
 * ignore la casse et les accents, et lit le nom, le code, le campus et les alias.
 *
 * Pur : il recoit la liste, ce qui le rend jouable sous vitest.
 */

import type { Etablissement } from './catalogue';

export interface GroupeDEtablissements {
    /** Le campus du groupe, ou `null` pour ceux qui n'en nomment pas. */
    readonly campus: string | null;
    readonly etablissements: readonly Etablissement[];
}

/** En minuscules et sans accents : « Médecine » se trouve en tapant « medecine ». */
export function normaliser(texte: string): string {
    return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** L'etablissement repond-il a la recherche ? Une recherche vide laisse tout passer. */
export function correspond(etablissement: Etablissement, recherche: string): boolean {
    const cle = normaliser(recherche);
    if (cle === '') return true;
    const champs = [etablissement.nom, etablissement.code, etablissement.campus ?? '', ...etablissement.alias];
    return champs.some((champ) => normaliser(champ).includes(cle));
}

/** Les etablissements qui repondent, regroupes par campus dans l'ordre de leur premiere apparition. */
export function regrouperParCampus(liste: readonly Etablissement[], recherche = ''): GroupeDEtablissements[] {
    const groupes = new Map<string | null, Etablissement[]>();
    for (const etablissement of liste) {
        if (!correspond(etablissement, recherche)) continue;
        const campus = etablissement.campus;
        const groupe = groupes.get(campus);
        if (groupe === undefined) groupes.set(campus, [etablissement]);
        else groupe.push(etablissement);
    }
    const tous = [...groupes.entries()].map(([campus, etablissements]) => ({ campus, etablissements }));
    // Le groupe sans campus ferme la liste : c'est celui de « Autre campus » et des lignes generiques.
    return [...tous.filter((g) => g.campus !== null), ...tous.filter((g) => g.campus === null)];
}

/**
 * Les credits d'un etablissement : les personnes que UKit remercie sur la ligne de leur campus — le
 * volontaire qui a prete son compte, celui qui a releve les salles (docs/adaptation-campus.md).
 *
 * Un module a part, pur et strict, parce que deux cotes lisent la meme forme : l'application, qui
 * projette la ligne (catalogue.ts), et la console, qui refuse d'ecrire un credit que cette projection
 * jetterait (console/src/schema/tables/publiees.ts). Une seule regle, donc aucune divergence possible
 * entre ce que la console accepte et ce que le telephone affiche.
 */

/** Une personne creditee. Le nom seul est obligatoire : un role ou un lien sans nom ne remercie personne. */
export interface Credit {
    readonly nom: string;
    readonly role: string | null;
    readonly lien: string | null;
}

function texteOuNull(valeur: unknown): string | null {
    return typeof valeur === 'string' && valeur !== '' ? valeur : null;
}

/**
 * Les credits d'une ligne, reduits aux entrees exploitables.
 *
 * Defensive comme les projections voisines : la colonne est un `jsonb` libre, et une entree mal
 * formee ne doit pas faire tomber le catalogue entier. Une entree sans nom est **ignoree** plutot que
 * retenue vide — l'ecran afficherait un remerciement adresse a personne.
 */
export function projeterCredits(valeur: unknown): readonly Credit[] {
    if (!Array.isArray(valeur)) return [];

    const credits: Credit[] = [];
    for (const brut of valeur) {
        if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) continue;

        const source = brut as Record<string, unknown>;
        const nom = texteOuNull(source.nom);
        if (nom === null) continue;

        credits.push({ nom, role: texteOuNull(source.role), lien: texteOuNull(source.lien) });
    }
    return credits;
}

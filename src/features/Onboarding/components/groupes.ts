/**
 * Un groupe tel que la source le nomme, en deux : son code (« 31BI701S ») et son libelle
 * (« M1 Groupe 1 »). Le libelle se lit, le code se reconnait : en pastilles, les deux se melaient en
 * un mur de codes (review du 2026-11-06). Sans tiret, le nom entier est le libelle.
 */
export function partiesDuGroupe(nom: string): { libelle: string; code: string | null } {
    const tiret = nom.indexOf(' - ');
    if (tiret <= 0) return { libelle: nom.trim(), code: null };
    const libelle = nom.slice(tiret + 3).trim();
    // Un nom qui finit sur son tiret n'a pas de libelle : il reste entier, plutot qu'un titre vide.
    if (libelle === '') return { libelle: nom.trim(), code: null };
    return { libelle, code: nom.slice(0, tiret).trim() };
}

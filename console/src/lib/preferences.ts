/**
 * Les preferences de poste : ce qui se retient d'une page a l'autre sans etre une donnee — le campus
 * du filtre global. En `localStorage`, parce que c'est une preference de la personne devant l'ecran,
 * pas un etat de la base (docs/phase-7/7-e-console-socle.md).
 */

const CLE_CAMPUS = 'console.campus@1';

function lire(cle: string): string | null {
    try {
        return window.localStorage.getItem(cle);
    } catch {
        return null;
    }
}

function ecrire(cle: string, valeur: string | null): void {
    try {
        if (valeur === null) window.localStorage.removeItem(cle);
        else window.localStorage.setItem(cle, valeur);
    } catch {
        // Un stockage indisponible (navigation privee stricte) ne doit pas casser la console.
    }
}

export function campusRetenu(): string | null {
    const valeur = lire(CLE_CAMPUS);
    return valeur === null || valeur === '' ? null : valeur;
}

export function retenirCampus(code: string | null): void {
    ecrire(CLE_CAMPUS, code);
}

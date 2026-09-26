/**
 * Les resumes en une ligne des saisies structurees (7-F) : ce qu'une liste ou une lecture seule
 * montre d'une focale, de creneaux, d'une galerie ou d'un partenaire, sans le JSON brut.
 *
 * Pur : joue par `npm test` a la racine du depot (resumes.test.ts).
 */

import { lireCreneauxSaisis, lireFocale, lirePartenaire } from './schemas';

/** Les jours ISO, en abrege, 1 = lundi. */
export const JOURS: readonly { readonly numero: number; readonly court: string; readonly long: string }[] = [
    { numero: 1, court: 'lun', long: 'lundi' },
    { numero: 2, court: 'mar', long: 'mardi' },
    { numero: 3, court: 'mer', long: 'mercredi' },
    { numero: 4, court: 'jeu', long: 'jeudi' },
    { numero: 5, court: 'ven', long: 'vendredi' },
    { numero: 6, court: 'sam', long: 'samedi' },
    { numero: 7, court: 'dim', long: 'dimanche' },
];

function pourcent(fraction: number): string {
    return `${Math.round(fraction * 100)} %`;
}

export function resumeDeFocale(valeur: unknown): string {
    const focale = lireFocale(valeur);
    return `x ${pourcent(focale.x)}, y ${pourcent(focale.y)}`;
}

/** « lun, mar, mer 11:00–14:00 ; sam 20:00–02:00 », ou le tiret. */
export function resumeDeCreneaux(valeur: unknown): string {
    const plages = lireCreneauxSaisis(valeur);
    if (plages.length === 0) return '—';
    return plages.map((plage) => {
        const jours = plage.jours.map((numero) => JOURS.find((jour) => jour.numero === numero)?.court ?? String(numero)).join(', ');
        return `${jours} ${plage.de}–${plage.a}`;
    }).join(' ; ');
}

export function resumeDeGalerie(valeur: unknown): string {
    const nombre = Array.isArray(valeur) ? valeur.filter((url) => typeof url === 'string' && url !== '').length : 0;
    if (nombre === 0) return '—';
    return nombre === 1 ? '1 image' : `${nombre} images`;
}

export function resumeDePartenaire(valeur: unknown): string {
    const partenaire = lirePartenaire(valeur);
    return partenaire.nom === '' ? '—' : partenaire.nom;
}

/** Le resume d'une saisie structuree par le type de son champ ; `null` pour les autres types. */
export function resumeStructure(type: string, valeur: unknown): string | null {
    switch (type) {
        case 'focale': return resumeDeFocale(valeur);
        case 'creneaux': return resumeDeCreneaux(valeur);
        case 'galerie': return resumeDeGalerie(valeur);
        case 'partenaire': return resumeDePartenaire(valeur);
        default: return null;
    }
}

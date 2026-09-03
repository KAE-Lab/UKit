/**
 * Les dates de la console : ce que la base rend (ISO 8601, UTC), ce que le navigateur saisit
 * (`datetime-local`, heure locale), et ce qu'on lit dans une liste.
 */

const LOCALE = 'fr-FR';

/** ISO -> la valeur d'un `<input type="datetime-local">`, en heure locale. Vide si nul. */
export function versSaisie(iso: unknown): string {
    if (typeof iso !== 'string' || iso === '') return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

/** La valeur d'un `datetime-local` -> ISO, ou `null` si vide. */
export function depuisSaisie(valeur: string): string | null {
    if (valeur === '') return null;
    const date = new Date(valeur);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formaterDate(iso: unknown): string {
    if (typeof iso !== 'string' || iso === '') return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** « il y a 3 h », « depuis 2 j » : la duree depuis un instant, en clair. */
export function depuis(iso: unknown, maintenant: Date = new Date()): string {
    if (typeof iso !== 'string' || iso === '') return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const minutes = Math.round((maintenant.getTime() - date.getTime()) / 60_000);
    if (minutes < 60) return `${Math.max(minutes, 0)} min`;
    const heures = Math.round(minutes / 60);
    if (heures < 48) return `${heures} h`;
    return `${Math.round(heures / 24)} j`;
}

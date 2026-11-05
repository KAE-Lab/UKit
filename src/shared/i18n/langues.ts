/**
 * Le choix de la langue de l'application depuis les locales du systeme — la partie pure de
 * `langueDuSysteme.ts`, qui lit le systeme et importe `react-native`.
 */

export type LangueProposee = 'fr' | 'es' | 'en';

/** La langue de l'application pour la premiere locale lisible ; l'anglais par defaut. */
export function langueDesLocales(candidates: readonly (string | null | undefined)[]): LangueProposee {
    const locale = candidates.find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim() !== '');
    const code = (locale ?? 'en').toLowerCase();
    if (code.startsWith('fr')) return 'fr';
    if (code.startsWith('es')) return 'es';
    return 'en';
}

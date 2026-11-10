/**
 * Le choix de la langue de l'application depuis les locales du systeme — la partie pure de
 * `langueDuSysteme.ts`, qui lit le systeme et importe `react-native`.
 */

export type LangueProposee = 'fr' | 'es' | 'en';

/**
 * Les langues s'ecrivent dans leur propre langue, comme dans tout selecteur de langue : on doit
 * reconnaitre la sienne meme quand l'ecran est dans une autre. Ce ne sont donc pas des libelles a
 * traduire. L'accueil et les Reglages les partagent depuis le 2026-11-10 : les Reglages proposaient
 * « Anglais » et « Espagnol » a qui ne lisait pas le francais.
 */
export const AUTONYMES: Readonly<Record<LangueProposee, string>> = { fr: 'Français', en: 'English', es: 'Español' };

/** La langue de l'application pour la premiere locale lisible ; l'anglais par defaut. */
export function langueDesLocales(candidates: readonly (string | null | undefined)[]): LangueProposee {
    const locale = candidates.find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim() !== '');
    const code = (locale ?? 'en').toLowerCase();
    if (code.startsWith('fr')) return 'fr';
    if (code.startsWith('es')) return 'es';
    return 'en';
}

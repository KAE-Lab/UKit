/**
 * Les tables que le journal ecrit : celles qui portent le declencheur `journaliser` dans
 * supabase/fonctions.sql. La console ne peut pas le demander a la base (aucune vue ne l'expose), et
 * une liste deduite des descripteurs oublierait ce qui n'a pas de page ; la constante est donc ici,
 * a tenir d'accord avec fonctions.sql, et journal.test.ts verifie qu'elle couvre au moins les
 * ressources de la console qui s'ecrivent.
 */

export const TABLES_JOURNALISEES: readonly string[] = [
    'annonces',
    'service_messages',
    'etablissements',
    'visuels',
    'salutations',
    'batiments',
    'testeurs',
    'app_release',
    'retours',
];

/** Ce qui s'ecrit depuis la console sans laisser de trace : ce n'est pas un oubli, c'est ecrit. */
export const TABLES_SANS_JOURNAL: readonly string[] = ['jetons_push', 'sondes', 'mesures'];

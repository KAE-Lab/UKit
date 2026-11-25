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
    // Depuis 7-H : qui a donne quel role a qui. Ses lignes, comme celles des retours, ne se lisent que
    // par un admin (policies.sql).
    'editeurs',
    // Depuis le lot 2 de la phase 8 : les etats officiels publies sur un lieu, par leur declencheur ; et les
    // gestes de la moderation, ecrits par leurs portes sans la cle de l'appareil — un signalement masque ou
    // retabli, un appareil bloque ou debloque, designe par l'un de ses signalements.
    'etats_officiels',
    'signalements',
    'appareils',
    // Depuis le lot 3 : les problemes connus publies, et les reponses d'un admin a un retour.
    'problemes_connus',
    'retours_reponses',
    // Depuis le lot 4 : les idees de la boite a idees.
    'idees',
];

/** Les tables dont le journal ne se lit que par un admin : un retour y copie l'adresse laissee, l'equipe ses membres (7-H). */
export const TABLES_DU_JOURNAL_DES_ADMINS: readonly string[] = ['retours', 'editeurs'];

/** Ce qui s'ecrit depuis la console sans laisser de trace : ce n'est pas un oubli, c'est ecrit. */
export const TABLES_SANS_JOURNAL: readonly string[] = ['jetons_push', 'sondes', 'mesures'];

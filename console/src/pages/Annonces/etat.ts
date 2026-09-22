/**
 * L'etat d'une annonce, lu sur ce que le formulaire tient — pas seulement sur la ligne enregistree :
 * l'apercu dit ce que la saisie en cours donnera. La regle est celle de la politique de lecture de
 * la base (7-C) : visible si active, publiee, deja publiee et pas expiree ; programmee si publiee
 * mais pas encore ; et une phrase lisible pour la programmation, « publiée le 3 octobre à 11 h ».
 *
 * Pur : joue par `npm test` a la racine du depot (etat.test.ts).
 */

export type EtatDAnnonce = 'brouillon' | 'archivee' | 'inactive' | 'programmee' | 'active' | 'expiree';

export interface EtatLisible {
    readonly etat: EtatDAnnonce;
    readonly libelle: string;
    readonly ton: 'ok' | 'panne' | 'avert' | 'accent' | 'neutre';
    /** Ce qui explique l'etat, quand une date le fait : la programmation, l'expiration. */
    readonly phrase: string | null;
}

/** Une date ISO ou une saisie `datetime-local` : les deux se lisent ; le reste vaut rien. */
function instant(valeur: unknown): Date | null {
    if (typeof valeur !== 'string' || valeur === '') return null;
    const date = new Date(valeur);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** « 3 octobre à 11 h », « 3 octobre à 11 h 30 », l'annee si elle n'est pas celle du moment. */
export function phraseDeDate(date: Date, maintenant: Date): string {
    const jour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', ...(date.getFullYear() === maintenant.getFullYear() ? {} : { year: 'numeric' }) }).format(date);
    const heures = date.getHours();
    const minutes = date.getMinutes();
    return `${jour} à ${heures} h${minutes === 0 ? '' : ` ${String(minutes).padStart(2, '0')}`}`;
}

export function etatDAnnonce(
    ligne: { readonly statut?: unknown; readonly active?: unknown; readonly publiee_le?: unknown; readonly expire_le?: unknown },
    maintenant: Date,
): EtatLisible {
    if (ligne.statut === 'brouillon') return { etat: 'brouillon', libelle: 'Brouillon', ton: 'avert', phrase: 'Invisible tant que le statut n’est pas « publiée ».' };
    if (ligne.statut === 'archivee') return { etat: 'archivee', libelle: 'Archivée', ton: 'neutre', phrase: 'Retirée des téléphones ; sa trace et ses chiffres restent.' };
    if (ligne.active !== true) return { etat: 'inactive', libelle: 'Inactive', ton: 'neutre', phrase: 'Décochée : retirée des téléphones maintenant.' };
    const debut = instant(ligne.publiee_le);
    const fin = instant(ligne.expire_le);
    if (fin !== null && fin.getTime() <= maintenant.getTime()) return { etat: 'expiree', libelle: 'Expirée', ton: 'neutre', phrase: `Expirée le ${phraseDeDate(fin, maintenant)}.` };
    if (debut !== null && debut.getTime() > maintenant.getTime()) return { etat: 'programmee', libelle: 'Programmée', ton: 'accent', phrase: `Publiée le ${phraseDeDate(debut, maintenant)}.` };
    return { etat: 'active', libelle: 'Visible', ton: 'ok', phrase: fin === null ? null : `Jusqu’au ${phraseDeDate(fin, maintenant)}.` };
}

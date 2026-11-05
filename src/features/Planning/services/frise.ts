/**
 * La frise d'une journee (jalon 7-J) : ce que la vue jour pose entre ses cartes, et l'etat de chacune.
 *
 * Une journee de cours a une forme, et la liste de cartes la taisait. La frise la rend lisible d'un
 * regard : l'etat de chaque creneau (passe, en cours, a venir), la **pause cotee** entre deux cours, et
 * aujourd'hui le **repere de l'heure** a sa place, avec le temps qui reste avant le cours suivant. C'est
 * l'Epure appliquee au temps : une trace ne dit qu'une mesure, et une pause est une cote de la journee.
 *
 * Pur : les heures arrivent en minutes depuis minuit, l'instant aussi — `null` quand le jour affiche
 * n'est pas aujourd'hui, et rien alors ne depend de l'heure. Le composant lit l'heure par
 * `maintenant()`, que le menu de developpement simule.
 */

/** Ce que la frise lit d'un cours : ses deux heures, ecrites `HH:mm`. */
export interface CoursHoraire {
    readonly starttime: string;
    readonly endtime: string;
}

export type EtatDeCreneau = 'passe' | 'en-cours' | 'a-venir';

export type ElementDeFrise<G> =
    | { readonly genre: 'groupe'; readonly groupe: G }
    | { readonly genre: 'pause'; readonly minutes: number }
    | {
        readonly genre: 'maintenant';
        /** L'heure du repere, en minutes depuis minuit. */
        readonly minutes: number;
        /** Les minutes avant le cours suivant ; `null` apres le dernier. */
        readonly prochainDans: number | null;
        /** Le repere precede le premier cours de la journee. */
        readonly avantLePremier: boolean;
    };

/**
 * La plus courte pause qui merite sa cote. En dessous, deux cours qui s'enchainent — le quart d'heure
 * academique, un changement de salle — se lisent comme une suite, et une cote de cinq minutes entre
 * chaque paire ne dirait rien de plus que l'heure.
 */
export const PAUSE_MINIMALE = 15;

/** `09:30` en minutes depuis minuit ; `null` pour une heure que la source n'a pas su ecrire. */
export function minutesDe(heure: string): number | null {
    const morceaux = /^(\d{1,2}):(\d{2})$/.exec((heure ?? '').trim());
    if (morceaux === null) return null;
    const h = Number(morceaux[1]);
    const m = Number(morceaux[2]);
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
}

export interface EtatDUnCours {
    readonly etat: EtatDeCreneau;
    /** La part ecoulee d'un cours en cours, de 0 a 1 ; `null` sinon. */
    readonly progression: number | null;
    /** Les minutes qui restent d'un cours en cours ; `null` sinon. */
    readonly resteMinutes: number | null;
}

const A_VENIR: EtatDUnCours = { etat: 'a-venir', progression: null, resteMinutes: null };

/**
 * L'etat d'**un** cours a l'instant donne — et non celui de son groupe : deux cours superposes ne
 * finissent pas forcement ensemble, et la carte du premier annoncait le temps qui restait au second
 * (releve sur le banc le 2026-11-05, « 1 h 52 » sur un cours qui finissait une heure plus tot).
 * `minute` nul — un autre jour que le jour meme — ou une heure illisible : « a venir », sans rien.
 */
export function etatDuCours(cours: CoursHoraire, minute: number | null): EtatDUnCours {
    const debut = minutesDe(cours.starttime);
    const fin = minutesDe(cours.endtime);
    if (minute === null || debut === null || fin === null || fin <= debut) return A_VENIR;
    if (minute >= fin) return { etat: 'passe', progression: null, resteMinutes: null };
    if (minute < debut) return A_VENIR;
    return { etat: 'en-cours', progression: (minute - debut) / (fin - debut), resteMinutes: fin - minute };
}

/** Le debut et la fin d'un groupe de cours superposes : le plus tot et le plus tard. */
function bornes(groupe: readonly CoursHoraire[]): { debut: number; fin: number } | null {
    let debut = Infinity;
    let fin = -Infinity;
    for (const cours of groupe) {
        const d = minutesDe(cours.starttime);
        const f = minutesDe(cours.endtime);
        if (d === null || f === null) return null;
        debut = Math.min(debut, d);
        fin = Math.max(fin, f);
    }
    return Number.isFinite(debut) && fin > debut ? { debut, fin } : null;
}

/**
 * Les elements de la frise, dans l'ordre d'affichage.
 *
 * Les groupes arrivent tries par heure de debut (`groupOverlappingCourses`). Le repere de l'heure se
 * pose avant le premier groupe qui n'a pas commence ; il **remplace** la pause ou il tombe, puisqu'il
 * en dit deja la fin. Pendant un cours, il n'y a pas de repere : c'est la carte en cours qui porte le
 * temps qui reste. Un groupe dont une heure est illisible reste a sa place, sans etat ni cote autour.
 */
export function construireFrise<G extends readonly CoursHoraire[]>(
    groupes: readonly G[],
    maintenant: number | null,
): ElementDeFrise<G>[] {
    const elements: ElementDeFrise<G>[] = [];
    let repereAPoser = maintenant !== null;
    let finPrecedente: number | null = null;

    groupes.forEach((groupe, index) => {
        const b = bornes(groupe);
        if (b === null) {
            elements.push({ genre: 'groupe', groupe });
            finPrecedente = null;
            return;
        }

        if (repereAPoser && maintenant !== null && maintenant < b.debut) {
            elements.push({ genre: 'maintenant', minutes: maintenant, prochainDans: b.debut - maintenant, avantLePremier: index === 0 });
            repereAPoser = false;
        } else if (finPrecedente !== null && b.debut - finPrecedente >= PAUSE_MINIMALE) {
            elements.push({ genre: 'pause', minutes: b.debut - finPrecedente });
        }

        // Pendant un groupe, pas de repere : ce sont ses cartes qui portent le temps qui reste.
        if (maintenant !== null && maintenant >= b.debut && maintenant < b.fin) repereAPoser = false;
        elements.push({ genre: 'groupe', groupe });
        finPrecedente = Math.max(finPrecedente ?? b.fin, b.fin);
    });

    if (repereAPoser && maintenant !== null && elements.length > 0) {
        elements.push({ genre: 'maintenant', minutes: maintenant, prochainDans: null, avantLePremier: false });
    }
    return elements;
}

/**
 * Une duree, dans la forme la plus courte qui se lit d'un coup : `45 min`, `2 h`, `1 h 05`. Les
 * espaces sont insecables : une cote ne se coupe pas en fin de ligne.
 */
export function formaterDuree(minutes: number): string {
    const total = Math.max(0, Math.round(minutes));
    if (total < 60) return `${total} min`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Une heure en minutes depuis minuit, ecrite `HH:mm`. */
export function formaterHeure(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

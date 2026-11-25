/**
 * Le sondage d'une annonce (phase 8, lot 4 ; docs/phase-8/4-sondages-idees-notation.md) : sa forme, lue
 * de la colonne `annonces.sondage`, son ouverture, et les resultats que rend `resultats_sondage`.
 *
 * Partage avec la console, qui compose le sondage et le valide avant la base : les bornes sont celles de
 * `private.sondage_valide` (migration 20261125070000_sondages_idees.sql). Pur : l'instant arrive en
 * parametre.
 */

export interface ChoixDeSondage {
    readonly id: string;
    readonly libelle: string;
}

export interface Sondage {
    readonly question: string;
    readonly choix: readonly ChoixDeSondage[];
    /** La cloture, en millisecondes. */
    readonly closLe: number;
}

export const BORNES_DU_SONDAGE = { question: { min: 4, max: 140 }, choix: { min: 2, max: 6 }, libelle: { min: 1, max: 60 } } as const;
export const FORME_D_IDENTIFIANT = /^[a-z0-9]{1,8}$/;
const FORME_D_INSTANT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}([.][0-9]{1,6})?)?(Z|[+-][0-9]{2}:[0-9]{2})$/;

function longueur(texte: string, bornes: { readonly min: number; readonly max: number }): boolean {
    const n = texte.trim().length;
    return n >= bornes.min && n <= bornes.max;
}

function lireUnChoix(brut: unknown): ChoixDeSondage | null {
    const c = brut as { id?: unknown; libelle?: unknown } | null;
    if (c === null || typeof c !== 'object' || typeof c.id !== 'string' || !FORME_D_IDENTIFIANT.test(c.id)) return null;
    if (typeof c.libelle !== 'string' || !longueur(c.libelle, BORNES_DU_SONDAGE.libelle)) return null;
    return { id: c.id, libelle: c.libelle.trim() };
}

/** Les choix, aux identifiants distincts, dans leurs bornes ; `null` sinon. */
function lireLesChoix(brut: unknown): ChoixDeSondage[] | null {
    if (!Array.isArray(brut) || brut.length < BORNES_DU_SONDAGE.choix.min || brut.length > BORNES_DU_SONDAGE.choix.max) return null;
    const choix = (brut as unknown[]).map(lireUnChoix);
    if (choix.some((c) => c === null)) return null;
    const lus = choix as ChoixDeSondage[];
    return new Set(lus.map((c) => c.id)).size === lus.length ? lus : null;
}

/** La colonne, ou `null` : absente, ou hors de la forme que la base exige. */
export function lireSondage(brut: unknown): Sondage | null {
    if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return null;
    const s = brut as Record<string, unknown>;
    if (typeof s.question !== 'string' || !longueur(s.question, BORNES_DU_SONDAGE.question)) return null;
    if (typeof s.clos_le !== 'string' || !FORME_D_INSTANT.test(s.clos_le)) return null;
    const closLe = Date.parse(s.clos_le);
    const choix = lireLesChoix(s.choix);
    if (!Number.isFinite(closLe) || choix === null) return null;
    return { question: s.question.trim(), choix, closLe };
}

export function estOuvert(sondage: Sondage, maintenant: number): boolean {
    return maintenant < sondage.closLe;
}

/**
 * Les resultats publics : seules les voix attestees comptent. `parts` donne un pourcentage entier par
 * choix, ou `null` sous cinq voix (« moins de 5 ») ; `total` n'est connu que quand aucune case n'est
 * masquee. `assez` est faux sous cinq voix en tout : rien ne se montre alors.
 */
export interface ResultatsDeSondage {
    readonly assez: boolean;
    readonly total: number | null;
    readonly parts: Readonly<Record<string, number | null>>;
}

/** La reponse de `resultats_sondage`, ou `null` : une annonce sans sondage visible, ou une forme inattendue. */
export function lireResultats(brut: unknown, sondage: Sondage): ResultatsDeSondage | null {
    if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return null;
    const r = brut as { total?: unknown; parts?: unknown };
    const total = typeof r.total === 'number' && Number.isInteger(r.total) && r.total >= 0 ? r.total : null;
    if (typeof r.parts !== 'object' || r.parts === null || Array.isArray(r.parts)) return null;
    const lues = r.parts as Record<string, unknown>;
    const parts: Record<string, number | null> = {};
    for (const { id } of sondage.choix) {
        const part = lues[id];
        parts[id] = typeof part === 'number' && part >= 0 && part <= 100 ? Math.round(part) : null;
    }
    return { assez: Object.keys(lues).length > 0, total, parts };
}

/**
 * L'erreur de la base, traduite : une ecriture refusee par la politique (42501) dit « les droits de ce
 * compte ne le permettent pas » plutot que « new row violates row-level security policy », parce que
 * c'est ce que la personne devant l'ecran peut comprendre. Depuis le jalon 7-H, le refus ne veut plus
 * dire « pas editeur » : un redacteur est editeur, et n'ecrit que les annonces de ses campus.
 *
 * Pur : joue par `npm test` a la racine du depot (erreurs.test.ts).
 */

export interface ErreurPostgrest {
    readonly code: string | null | undefined;
    readonly message: string;
}

export class ErreurDeBase extends Error {
    constructor(message: string, readonly code: string | null) {
        super(message);
        this.name = 'ErreurDeBase';
    }
}

/**
 * Une ligne modifiee entre-temps par quelqu'un d'autre (7-H) : l'ecriture n'est pas partie, et la ligne
 * telle que la base la porte maintenant voyage avec l'erreur, pour que le formulaire propose de la
 * recharger.
 */
export class ErreurDeConflit extends ErreurDeBase {
    constructor(message: string, readonly fraiche: Readonly<Record<string, unknown>>) {
        super(message, 'CONFLIT');
        this.name = 'ErreurDeConflit';
    }
}

const TRADUCTIONS: Readonly<Record<string, (erreur: ErreurPostgrest) => string>> = {
    '42501': () => 'Refusé : les droits de ce compte ne le permettent pas.',
    '23505': () => 'Une ligne porte déjà cette clé.',
    '23514': (erreur) => `Une valeur ne respecte pas une contrainte de la table : ${erreur.message}`,
    '23503': (erreur) => `Une valeur renvoie à une ligne qui n’existe pas : ${erreur.message}`,
    'PGRST116': () => 'Cette ligne n’existe pas, ou plus.',
    // Une garde de la base qui parle d'elle-meme — la console garde toujours un admin : son message est
    // ecrit pour etre lu (supabase/fonctions.sql).
    'P0001': (erreur) => erreur.message,
};

export function traduire(erreur: ErreurPostgrest): ErreurDeBase {
    const code = erreur.code ?? null;
    const traduction = code === null ? undefined : TRADUCTIONS[code];
    if (traduction !== undefined) return new ErreurDeBase(traduction(erreur), code);
    return new ErreurDeBase(`${code ?? 'erreur'} : ${erreur.message}`, code);
}

export function messageDErreur(erreur: unknown): string {
    return erreur instanceof Error ? erreur.message : String(erreur);
}

/** Un echec reseau — la base injoignable — n'a pas de code : on le reconnait a son message. */
export function estHorsLigne(erreur: unknown): boolean {
    const message = messageDErreur(erreur).toLowerCase();
    return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('load failed');
}

/**
 * Les regles de la fonction `editeurs` (jalon 7-H) : lire une demande de la page Equipe, et tirer un
 * mot de passe provisoire. Pures et **sans aucun import** — Deno exige des extensions explicites et ne
 * lit pas le `tsconfig` de l'application —, jouees par le `npm test` de la racine (`regles.test.ts`).
 *
 * La fonction est la frontiere : la console valide deja sa saisie, mais une requete faite a la main ne
 * passe pas par elle. Chaque demande est donc relue ici, et refusee en le disant.
 */

export const ROLES = ['admin', 'redacteur', 'lecteur'] as const;
export type Role = (typeof ROLES)[number];

export type Demande =
    | { readonly action: 'inviter'; readonly email: string; readonly role: Role; readonly etablissements: readonly string[] | null }
    | { readonly action: 'reinitialiser'; readonly email: string }
    | { readonly action: 'revoquer'; readonly email: string };

export interface Refus {
    readonly erreur: string;
}

const FORME_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Une adresse telle que l'authentification la range : sans espaces, en minuscules. */
export function normaliserEmail(valeur: unknown): string | null {
    if (typeof valeur !== 'string') return null;
    const email = valeur.trim().toLowerCase();
    return FORME_EMAIL.test(email) ? email : null;
}

function lireRole(valeur: unknown): Role | null {
    return ROLES.find((role) => role === valeur) ?? null;
}

/**
 * La borne d'un redacteur : nulle — tous les campus — ou des codes du catalogue, sans doublon. Les
 * autres roles n'en ont pas, et un tableau vide ne veut rien dire : « tous » s'ecrit `null`, comme le
 * `check` de la table l'exige. Enveloppee, pour que le refus se distingue sans compter sur le typage
 * strict, que le depot n'active pas.
 */
function lireBorne(role: Role, valeur: unknown, codesConnus: readonly string[]): { readonly borne: readonly string[] | null } | Refus {
    if (valeur === null || valeur === undefined) return { borne: null };
    if (role !== 'redacteur') return { erreur: 'Seul un rédacteur a des campus confiés.' };
    if (!Array.isArray(valeur) || !valeur.every((code) => typeof code === 'string')) return { erreur: 'Les campus confiés sont une liste de codes.' };
    if (valeur.length === 0) return { erreur: 'Aucun campus coché veut dire tous les campus : la liste est alors nulle, pas vide.' };
    const inconnus = valeur.filter((code) => !codesConnus.includes(code));
    if (inconnus.length > 0) return { erreur: `Campus inconnu du catalogue : ${inconnus.join(', ')}.` };
    return { borne: [...new Set(valeur as string[])] };
}

/** Une demande de la page Equipe, relue ; ou la raison de la refuser. */
export function lireDemande(corps: unknown, codesConnus: readonly string[]): Demande | Refus {
    if (typeof corps !== 'object' || corps === null) return { erreur: 'Demande illisible.' };
    const brut = corps as { readonly action?: unknown; readonly email?: unknown; readonly role?: unknown; readonly etablissements?: unknown };
    const email = normaliserEmail(brut.email);
    if (email === null) return { erreur: 'Adresse e-mail invalide.' };
    switch (brut.action) {
        case 'reinitialiser':
        case 'revoquer':
            return { action: brut.action, email };
        case 'inviter': {
            const role = lireRole(brut.role);
            if (role === null) return { erreur: `Rôle inconnu : ${ROLES.join(', ')}.` };
            const lue = lireBorne(role, brut.etablissements, codesConnus);
            if ('erreur' in lue) return lue;
            return { action: 'inviter', email, role, etablissements: lue.borne };
        }
        default:
            return { erreur: 'Action inconnue : inviter, reinitialiser ou revoquer.' };
    }
}

/**
 * Trente-deux signes sans ambiguite a l'oral ni a l'ecrit — ni I ni O, ni 0 ni 1 —, parce que le mot de
 * passe provisoire se transmet de vive voix. 256 est un multiple de 32 : prendre chaque octet modulo 32
 * ne favorise aucun signe.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Seize signes de cinq bits : quatre-vingts bits d'entropie, pour un mot de passe qui ne vit que jusqu'a la premiere connexion. */
export const OCTETS_DU_MOT_DE_PASSE = 16;

/** Le mot de passe provisoire tire de `octets` (aleatoires) : quatre groupes de quatre, qui se dictent. */
export function motDePasseProvisoire(octets: Uint8Array): string {
    if (octets.length !== OCTETS_DU_MOT_DE_PASSE) throw new Error(`${OCTETS_DU_MOT_DE_PASSE} octets attendus`);
    const signes = Array.from(octets, (octet) => ALPHABET[octet % ALPHABET.length]);
    return [0, 4, 8, 12].map((debut) => signes.slice(debut, debut + 4).join('')).join('-');
}

/**
 * Les droits d'un compte de la console (jalon 7-H) : son role, et la borne d'un redacteur.
 *
 * C'est une copie de ce que la base decide (supabase/fonctions.sql, policies.sql), tenue ici pour le
 * DIRE avant d'essayer : un bandeau, un bouton inerte, un formulaire en lecture seule. Elle ne protege
 * rien — une requete faite a la main passe outre la console, et c'est la politique qui la refuse — ; si
 * elle se trompait, la console montrerait un bouton que la base refuse, jamais l'inverse. droits.test.ts
 * rejoue les cas du plan de test de 7-H pour que les deux disent la meme chose.
 *
 * Pur : joue par `npm test` a la racine du depot.
 */

export type Role = 'admin' | 'redacteur' | 'lecteur';

export interface Droits {
    readonly role: Role;
    /** La borne d'un redacteur : les campus dont il publie les annonces ; `null`, tous. Toujours nulle pour les autres roles. */
    readonly etablissements: readonly string[] | null;
}

/**
 * Les droits tels que la session les connait : `undefined` tant que la reponse n'est pas revenue,
 * `null` pour un compte connecte qui n'est pas dans l'equipe.
 */
export type DroitsDeSession = Droits | null | undefined;

export const ROLES: readonly { readonly valeur: Role; readonly libelle: string }[] = [
    { valeur: 'admin', libelle: 'Admin' },
    { valeur: 'redacteur', libelle: 'Rédacteur' },
    { valeur: 'lecteur', libelle: 'Lecteur' },
];

/** Les tables qu'un redacteur ecrit : les annonces de ses campus, et rien d'autre. */
const TABLES_DU_REDACTEUR: readonly string[] = ['annonces'];

/** La ligne d'`editeurs` d'un compte, lue : ses droits, ou `null` si elle n'en donne aucun. */
export function lireDroits(ligne: { readonly role?: unknown; readonly etablissements?: unknown } | null): Droits | null {
    const role = ROLES.find((r) => r.valeur === ligne?.role)?.valeur;
    if (role === undefined) return null;
    const codes = Array.isArray(ligne?.etablissements) ? ligne.etablissements.filter((code): code is string => typeof code === 'string' && code !== '') : [];
    return { role, etablissements: role === 'redacteur' && codes.length > 0 ? codes : null };
}

export function estAdmin(droits: DroitsDeSession): boolean {
    return droits?.role === 'admin';
}

/** Ce compte ecrit-il dans cette table ? L'admin partout, le redacteur les annonces, le lecteur nulle part. */
export function peutEcrire(droits: DroitsDeSession, table: string): boolean {
    if (droits === null || droits === undefined) return false;
    if (droits.role === 'admin') return true;
    return droits.role === 'redacteur' && TABLES_DU_REDACTEUR.includes(table);
}

/**
 * La copie de `private.peut_publier` : un admin, toujours ; un redacteur sans borne, toujours ; un
 * redacteur borne, si la cible est non vide et incluse dans sa borne. « Tous les campus » — nul — reste
 * le fait d'un admin ou d'un redacteur sans borne.
 */
export function peutPublier(droits: DroitsDeSession, cibles: unknown): boolean {
    if (droits === null || droits === undefined) return false;
    if (droits.role === 'admin') return true;
    if (droits.role !== 'redacteur') return false;
    const borne = droits.etablissements;
    if (borne === null) return true;
    return Array.isArray(cibles) && cibles.length > 0 && cibles.every((code) => typeof code === 'string' && borne.includes(code));
}

/** Peut-il modifier CETTE ligne ? Une annonce, si elle vise ses campus ; toute autre ligne, si la table est a lui. */
export function peutModifierLigne(droits: DroitsDeSession, table: string, ligne: { readonly etablissements?: unknown }): boolean {
    if (table === 'annonces') return peutPublier(droits, ligne.etablissements);
    return peutEcrire(droits, table);
}

/** Supprimer est un geste d'admin, partout : une annonce s'archive, un membre de l'equipe se revoque. */
export function peutSupprimer(droits: DroitsDeSession): boolean {
    return estAdmin(droits);
}

/** La borne a respecter dans un formulaire : celle d'un redacteur borne, `null` pour tout autre compte. */
export function borneDe(droits: DroitsDeSession): readonly string[] | null {
    return droits?.role === 'redacteur' ? droits.etablissements : null;
}

function liste(noms: readonly string[]): string {
    if (noms.length <= 1) return noms.join('');
    return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
}

/** Le role, en une phrase : « Rédacteur pour Collège Sciences et Technologies ». */
export function libelleDesDroits(droits: Droits, nomDe: (code: string) => string): string {
    const libelle = ROLES.find((r) => r.valeur === droits.role)?.libelle ?? droits.role;
    if (droits.role !== 'redacteur') return libelle;
    return droits.etablissements === null ? `${libelle}, tous les campus` : `${libelle} pour ${liste(droits.etablissements.map(nomDe))}`;
}

/** Ce que le role permet, dit a la personne : la page Compte, et le bandeau des annonces d'un redacteur. */
export function phraseDesDroits(droits: DroitsDeSession, nomDe: (code: string) => string): string {
    if (droits === undefined) return '';
    if (droits === null) return 'Ce compte n’est pas dans l’équipe : il se connecte, mais ne lit ni n’écrit rien. Un admin l’invite depuis la page Équipe.';
    switch (droits.role) {
        case 'admin':
            return 'Admin : tout ce que la console permet, l’équipe comprise. Chaque écriture est journalisée à ton nom.';
        case 'lecteur':
            return 'Lecteur : tu lis toute la console, sauf les adresses laissées dans les retours, et tu n’y écris rien.';
        case 'redacteur':
            return droits.etablissements === null
                ? 'Rédacteur : tu crées, modifies, programmes et archives les annonces de tous les campus. Le reste de la console se lit.'
                : `Rédacteur pour ${liste(droits.etablissements.map(nomDe))} : tu crées, modifies, programmes et archives les annonces de ${droits.etablissements.length > 1 ? 'ces campus' : 'ce campus'}. Les autres annonces et le reste de la console se lisent.`;
    }
}

/** Pourquoi cette page est en lecture seule pour ce compte ; `null` quand il y ecrit, ou tant qu'on ne sait pas. */
export function raisonDeLectureSeule(droits: DroitsDeSession, table: string): string | null {
    if (droits === undefined || peutEcrire(droits, table)) return null;
    if (droits === null) return 'Lecture seule : ce compte n’est pas dans l’équipe. Un admin l’invite depuis la page Équipe.';
    if (droits.role === 'lecteur') return 'Lecture seule : un lecteur consulte la console, il n’y écrit pas.';
    return 'Lecture seule : cette page est un geste d’admin. Un rédacteur publie les annonces.';
}

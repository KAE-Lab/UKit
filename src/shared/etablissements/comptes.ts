/**
 * La session universitaire, **cloisonnee par etablissement** — la table et ses regles.
 *
 * Le jalon 6-G effacait les identifiants et le dossier a chaque changement de fac, pour une raison
 * juste : melanger les donnees de deux universites serait pire que tout redemander. Le remede l'etait
 * moins. Le depot a tranche le meme dilemme deux fois depuis — les groupes favoris au 6-I, les liens
 * d'abonnement au 6-J — et la formule qui en est sortie vaut ici mot pour mot : **effacer repond a la
 * mauvaise question, la regle est que les donnees de deux facs ne se melangent pas, pas qu'il faille
 * les oublier.**
 *
 * Cloisonner tient les deux bouts : le nom d'un etudiant d'une fac ne peut plus s'afficher sous une
 * autre, puisqu'on ne lit jamais que l'entree de l'etablissement actif ; et un aller-retour ne coute
 * plus une reconnexion. La session universitaire etait le dernier morceau a ne pas avoir suivi, et
 * c'est ce qui la faisait passer pour un defaut : tout le reste survivait, elle seule sautait.
 *
 * Ce fichier ne touche **ni** au trousseau **ni** au reseau : il tient des tables et sait les
 * fusionner. La couture vit dans `SecureStoreService`, comme `lienEdt.ts` face a elle — et pour la
 * meme raison, qui n'est pas du gout : une regle de cloisonnement qui se trompe fait perdre la
 * session de quelqu'un **sans rien dire**, et il faut donc qu'elle soit jouable sous Node
 * (docs/qualite.md).
 *
 * Voir docs/features/scolarite.md et docs/features/settings.md.
 */

/** Les identifiants d'un portail, tels que le trousseau les garde. */
export interface CompteEnregistre {
    readonly username: string;
    readonly password: string;
}

/** Les comptes enregistres, indexes par code d'etablissement. */
export type ComptesParEtablissement = Readonly<Record<string, CompteEnregistre>>;

/** Les dossiers froids, indexes par code d'etablissement. Leur forme appartient a la scolarite. */
export type DossiersParEtablissement = Readonly<Record<string, unknown>>;

/**
 * Lit une table persistee, en ecartant tout ce qui n'est pas un objet.
 *
 * Une valeur illisible rend une table **vide** plutot qu'une exception : le trousseau n'est ecrit que
 * par nous, donc un contenu aberrant veut dire qu'une version anterieure ecrivait autre chose, et le
 * bon comportement est alors de redemander la connexion — pas d'empecher l'application de demarrer.
 */
function lireTable(brut: string | null, quoi: string): Record<string, unknown> {
    if (brut === null || brut === '') return {};

    let contenu: unknown;
    try {
        contenu = JSON.parse(brut);
    } catch {
        console.warn(`[comptes] ${quoi} illisible, ignore`);
        return {};
    }

    if (contenu === null || typeof contenu !== 'object' || Array.isArray(contenu)) return {};
    return contenu as Record<string, unknown>;
}

/** Un compte exploitable : les deux champs, non vides. Un compte partiel ne connecte personne. */
function estCompte(valeur: unknown): valeur is CompteEnregistre {
    if (valeur === null || typeof valeur !== 'object') return false;
    const candidat = valeur as Record<string, unknown>;
    return (
        typeof candidat.username === 'string' &&
        candidat.username !== '' &&
        typeof candidat.password === 'string' &&
        candidat.password !== ''
    );
}

/** Les comptes enregistres, entrees inexploitables ecartees. */
export function lireComptes(brut: string | null): ComptesParEtablissement {
    const table: Record<string, CompteEnregistre> = {};
    for (const [code, valeur] of Object.entries(lireTable(brut, 'table des comptes'))) {
        if (estCompte(valeur)) table[code] = { username: valeur.username, password: valeur.password };
    }
    return table;
}

/** Les dossiers enregistres. Aucune validation de forme : elle appartient a la scolarite. */
export function lireDossiers(brut: string | null): DossiersParEtablissement {
    const table: Record<string, unknown> = {};
    for (const [code, valeur] of Object.entries(lireTable(brut, 'table des dossiers'))) {
        if (valeur !== null && valeur !== undefined) table[code] = valeur;
    }
    return table;
}

/**
 * Pose — ou retire, avec `null` — l'entree d'un etablissement **sans toucher aux autres**.
 *
 * C'est toute la regle du cloisonnement, et elle tient en une fonction pour qu'il n'y ait qu'un
 * endroit ou se tromper. Ecrire la seule entree courante effacerait celles des autres : un
 * aller-retour Bordeaux → INP → Bordeaux ferait ressaisir des identifiants deja donnes, ce qui est
 * exactement la punition qu'on cherche a supprimer.
 */
export function fusionnerEntree<T>(
    table: Readonly<Record<string, T>>,
    etablissement: string,
    valeur: T | null,
): Readonly<Record<string, T>> {
    const fusion: Record<string, T> = { ...table };
    if (valeur === null || etablissement === '') delete fusion[etablissement];
    else fusion[etablissement] = valeur;
    return fusion;
}

/**
 * Convertit une valeur ecrite **avant** le cloisonnement vers la table indexee.
 *
 * Sans cette conversion, la correction deconnecterait tout le parc installe le jour de sa mise a
 * jour — c'est-a-dire qu'elle produirait, une fois, exactement le defaut qu'elle supprime. La valeur
 * d'avant appartient a l'etablissement **selectionne** : c'est le seul auquel on ait pu se connecter.
 *
 * Rend `null` quand il n'y a rien a convertir, ce que l'appelant distingue d'une table vide : la
 * premiere ne demande aucune ecriture, la seconde en demanderait une pour rien.
 */
export function migrerVersTable<T>(ancienne: T | null, etablissement: string): Readonly<Record<string, T>> | null {
    if (ancienne === null || ancienne === undefined || etablissement === '') return null;
    return { [etablissement]: ancienne };
}

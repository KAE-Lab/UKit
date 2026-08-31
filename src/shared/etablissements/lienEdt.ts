/**
 * Le lien d'abonnement a un emploi du temps, colle par l'etudiant — la table en memoire et ses regles.
 *
 * C'est le **repli universel** du jalon 6-J : la ou 6-I demandait un referentiel de groupes releve par
 * un auteur, celui-ci ne demande rien du tout. L'etudiant colle le lien que son etablissement lui
 * donne, et l'application le joue. C'est le seul chemin qui ajoute un emploi du temps sans qu'on ait
 * rien a porter, et c'est pourquoi il existe : porter chaque produit de planning un par un serait sans
 * fin, alors que tous — ADE, Hyperplanning, Celcat, uPortal — savent exporter en iCal.
 *
 * Ce fichier ne touche **ni** au trousseau **ni** au reseau : il tient une table en memoire et sait la
 * fusionner. La couture de plateforme vit dans `index.ts`, comme `catalogue.ts` face a elle et comme
 * `delivery.ts` face a `registry.ts` — et pour la meme raison, qui n'est pas du gout : une regle de
 * cloisonnement qui se trompe fait perdre le lien de quelqu'un **sans rien dire**, et il faut donc
 * qu'elle soit jouable sous Node (docs/qualite.md).
 *
 * L'accesseur est **synchrone**, comme tout le catalogue : `sourceEdt()` le lit avant d'emettre un
 * run, et un `await` de plus sur ce chemin ne servirait personne.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-j-compte-et-sources-par-etablissement.md.
 */

import { getCodeEtablissementActif } from './catalogue';

/** Les liens enregistres, indexes par code d'etablissement. */
export type LiensEdt = Readonly<Record<string, string>>;

/**
 * Lit la table persistee, en ecartant tout ce qui n'est pas exploitable.
 *
 * Une valeur illisible rend une table **vide** plutot qu'une exception : le trousseau est ecrit par
 * nous seuls, donc un contenu aberrant veut dire qu'une version anterieure ecrivait autre chose, et le
 * bon comportement est alors de redemander le lien — pas d'empecher l'application de demarrer.
 */
export function lireLiens(brut: string | null): LiensEdt {
    if (brut === null || brut === '') return {};

    let contenu: unknown;
    try {
        contenu = JSON.parse(brut);
    } catch {
        console.warn('[lienEdt] table illisible, ignoree');
        return {};
    }

    if (contenu === null || typeof contenu !== 'object' || Array.isArray(contenu)) return {};

    const table: Record<string, string> = {};
    for (const [code, lien] of Object.entries(contenu as Record<string, unknown>)) {
        if (typeof lien === 'string' && lien !== '') table[code] = lien;
    }
    return table;
}

/**
 * Pose — ou retire, avec `null` — le lien d'un etablissement **sans toucher aux autres**.
 *
 * C'est toute la regle du cloisonnement, et elle tient en une fonction pour qu'il n'y ait qu'un
 * endroit ou se tromper. Ecrire la seule entree courante effacerait celles des autres etablissements :
 * un aller-retour Bordeaux → Autre → Bordeaux ferait recoller un lien que l'etudiant avait deja
 * donne, ce qui est exactement la punition que la separation des reglages par etablissement a
 * supprimee ailleurs (`reglagesParEtablissement.ts`).
 */
export function fusionnerLiens(table: LiensEdt, etablissement: string, lien: string | null): LiensEdt {
    const fusion: Record<string, string> = { ...table };
    if (lien === null || lien === '') delete fusion[etablissement];
    else fusion[etablissement] = lien;
    return fusion;
}

/** La table courante. Posee au demarrage par la couture, et a chaque enregistrement. */
let liens: LiensEdt = {};

/** Installe la table lue du trousseau. Sans argument, revient a « aucun lien connu ». */
export function appliquerLiensEdt(table?: LiensEdt | null): void {
    liens = table ?? {};
}

/** La table courante, pour la couture qui doit la fusionner puis l'ecrire. */
export function liensEdt(): LiensEdt {
    return liens;
}

/**
 * Le lien de l'etablissement selectionne, ou `null`.
 *
 * `null` n'est pas une panne : c'est « il manque un geste », et c'est `edt.ts` qui en fait un etat
 * d'ecran distinct de « cette universite n'a pas d'emploi du temps ». Les deux appellent des gestes
 * opposes de la part d'un etudiant, et les confondre annulerait le benefice du jalon.
 */
export function lienEdtActif(): string | null {
    return liens[getCodeEtablissementActif()] ?? null;
}

/**
 * Ce que le parcours froid a **trouve** dans le dossier, et qu'il proposera d'appliquer.
 *
 * Une connexion universitaire traverse des pages qui en savent bien plus que l'identite : chez
 * l'Universite de Bordeaux, l'annuaire du compte liste les **unites d'enseignement** auxquelles
 * l'etudiant est inscrit ; chez Bordeaux INP, ADE **preselectionne sa fiche** dans l'arbre des
 * ressources, ce qui designe son emploi du temps personnel. Les deux etaient sous nos yeux sans etre
 * lus, et les deux evitent une configuration a la main.
 *
 * **Rien ne s'applique tout seul.** Ce module ne fait que projeter ce qui a ete lu ; c'est un ecran
 * qui demande confirmation, et c'est deliberé — deviner juste dans le dos de quelqu'un reste deviner
 * dans son dos, et une proposition fausse serait alors indetectable pour lui.
 *
 * Pur, sans dependance de plateforme : une projection fausse ne se voit pas a l'ecran — elle
 * proposerait des filtres plausibles mais faux, ou l'emploi du temps de quelqu'un d'autre. Ca se
 * verrouille par des tests (PropositionsDossier.test.ts).
 *
 * Voir docs/features/scolarite.md.
 */

/** Le prefixe que l'arbre GXT d'ADE colle a l'identifiant de ressource dans l'attribut `id`. */
const PREFIXE_ADE = 'Direct Planning Tree_';

/** Le prefixe LDAP des appartenances qui designent une unite d'enseignement, chez Bordeaux. */
const PREFIXE_UE = 'ubx:etud:ue:';

/**
 * Un code d'unite d'enseignement, tel que le planning le reconnait deja.
 *
 * **Le meme motif que `separerCodeUE`**, volontairement : ce qu'on propose comme filtre doit etre ce
 * que le filtre sait comparer. Un chiffre en tete, au moins une lettre ensuite — la lettre obligatoire
 * vient d'une mesure du jalon 6-I, ou un titre commencant par une annee (`2025-2026 …`) devenait une
 * UE fantome.
 */
const CODE_UE = /^[0-9][A-Z0-9]*[A-Z][A-Z0-9]*$/;

/** L'emploi du temps personnel qu'ADE designe, quand il en designe un. */
export interface EdtPropose {
    /** L'identifiant de ressource ADE, tel que l'export anonyme l'accepte. */
    readonly ressource: string;
    /** Le nom affiche par l'arbre, pour que l'ecran nomme ce qu'il propose. */
    readonly libelle: string;
}

/** Ce qu'un dossier a livre en plus de l'identite. Les deux champs sont independants. */
export interface PropositionsDossier {
    /** Les unites d'enseignement inscrites, en majuscules et sans doublon. */
    readonly ues: readonly string[];
    /** L'emploi du temps designe par la source, ou `null` quand elle n'en designe aucun. */
    readonly edt: EdtPropose | null;
}

function premiereChaine(valeur: unknown): string {
    if (typeof valeur === 'string') return valeur.trim();
    if (Array.isArray(valeur)) {
        for (const element of valeur) {
            if (typeof element === 'string' && element.trim() !== '') return element.trim();
        }
    }
    return '';
}

/**
 * Les unites d'enseignement inscrites, depuis les appartenances de l'annuaire.
 *
 * L'annuaire rend une quarantaine d'entrees LDAP dont la plupart n'ont rien de scolaire — des droits
 * applicatifs, des listes de diffusion, des niveaux. Seul le prefixe des UE est retenu, et le code
 * qui en sort est **verifie contre le motif du planning** : une entree exotique ne doit pas devenir
 * un filtre qui ne correspondra jamais a aucun cours, ce qui viderait l'emploi du temps sans rien
 * dire.
 *
 * Trie et dedoublonne : l'ordre de l'annuaire n'a pas de sens, et l'ecran affiche cette liste.
 */
export function projeterUes(appartenances: unknown): string[] {
    if (!Array.isArray(appartenances)) return [];

    const codes = new Set<string>();
    for (const brut of appartenances) {
        if (typeof brut !== 'string' || !brut.startsWith(PREFIXE_UE)) continue;
        const code = brut.slice(PREFIXE_UE.length).trim().toUpperCase();
        if (CODE_UE.test(code)) codes.add(code);
    }

    return [...codes].sort();
}

/**
 * L'emploi du temps personnel, depuis la fiche qu'ADE preselectionne.
 *
 * L'identifiant arrive habille par l'arbre GXT (`Direct Planning Tree_4087`). Le deshabillage vit
 * **ici** et non dans le Blueprint : un fichier decrit la requete et ce qu'on en retient, la
 * transformation reste applicative — et celle-ci se verrouille par un test, ce qu'un fichier ne
 * permet pas.
 *
 * Un identifiant qui n'est pas un nombre rend `null` plutot qu'une valeur douteuse. C'est la garde
 * qui compte : l'export anonyme d'ADE accepte **n'importe quel** identifiant de ressource et rend
 * l'emploi du temps correspondant. Proposer un identifiant mal lu afficherait donc, sans la moindre
 * erreur, le planning de quelqu'un d'autre.
 */
export function projeterEdt(ressource: unknown, libelle: unknown): EdtPropose | null {
    const brut = premiereChaine(ressource);
    if (brut === '') return null;

    const identifiant = brut.startsWith(PREFIXE_ADE) ? brut.slice(PREFIXE_ADE.length) : brut;
    if (!/^\d+$/.test(identifiant)) return null;

    return { ressource: identifiant, libelle: premiereChaine(libelle) };
}

/**
 * Ce qu'un dossier propose, tous etablissements confondus.
 *
 * Les deux champs sont **independants** et vides par defaut : un etablissement qui ne publie ni l'un
 * ni l'autre rend des propositions vides, et l'ecran ne demande alors rien. C'est ce qui permet
 * d'ajouter une troisieme universite sans toucher a l'ecran.
 */
export function projeterPropositions(outputs: Readonly<Record<string, unknown>>): PropositionsDossier {
    return {
        ues: projeterUes(outputs.appartenances),
        edt: projeterEdt(outputs.edt_ressource, outputs.edt_libelle),
    };
}

/** Y a-t-il quelque chose a proposer ? Sans quoi l'ecran ne doit poser aucune question. */
export function aQuelqueChoseAProposer(propositions: PropositionsDossier): boolean {
    return propositions.ues.length > 0 || propositions.edt !== null;
}

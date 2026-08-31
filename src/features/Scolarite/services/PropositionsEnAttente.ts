/**
 * Les propositions **en attente d'une reponse**, gardees d'un lancement a l'autre.
 *
 * La premiere version ne gardait rien, et l'argument tenait : une proposition vit le temps de la
 * session qui a lu le dossier, une nouvelle lecture la repropose, et l'ecart — fermer l'application
 * entre la lecture du dossier et le premier chargement du planning — paraissait etroit.
 *
 * **La mesure du 2026-08-24 a montre qu'il ne l'est pas.** Les UE a masquer se calculent contre le
 * planning du groupe, et le planning d'une universite est **vide tout l'ete** : mesure sur le groupe
 * INF601A5, 33 cours la semaine du 12 janvier, **zero** les semaines du 24 aout et du 14 septembre.
 * Or c'est exactement la periode ou l'on installe l'application. Quelqu'un qui se connecte en aout lit
 * donc son dossier alors qu'il n'y a rien a comparer, et sans persistance la proposition est perdue au
 * prochain demarrage — definitivement, puisque les lancements suivants sont des parcours **chauds**
 * qui ne relisent pas le dossier. La fonctionnalite ne se serait jamais declenchee pour lui.
 *
 * La table garde donc ce qui n'a pas encore recu de reponse, **cloisonne par etablissement** comme
 * tout le reste du trousseau. Une entree disparait quand l'etudiant a tranche — accepte ou refuse —
 * et pas avant. Elle est relue a chaque lancement et **redecidee** contre le planning et les filtres
 * du moment : une proposition qui n'a plus lieu d'etre ne s'affiche pas, elle s'eteint toute seule.
 *
 * Pur, sans dependance de plateforme : la couture vit dans `CredentialsContext`, comme la lecture du
 * trousseau qu'il fait deja.
 *
 * Voir docs/features/scolarite.md.
 */

import { projeterEdt, type PropositionsDossier } from './PropositionsDossier';

/** Les propositions en attente, indexees par code d'etablissement. */
export type PropositionsParEtablissement = Readonly<Record<string, PropositionsDossier>>;

/** Le meme motif que le planning reconnait, la aussi : un filtre qui ne masque rien serait inerte. */
const CODE_UE = /^[0-9][A-Z0-9]*[A-Z][A-Z0-9]*$/;

function lireUes(valeur: unknown): string[] {
    if (!Array.isArray(valeur)) return [];
    return valeur.filter((code): code is string => typeof code === 'string' && CODE_UE.test(code));
}

/**
 * Lit la table persistee, en revalidant **tout** ce qu'elle porte.
 *
 * Les valeurs ont deja passe la projection avant d'etre ecrites ; les reverifier ici est la seconde
 * ceinture, et elle a une raison precise du cote de l'emploi du temps : l'export anonyme d'ADE accepte
 * n'importe quel identifiant de ressource, donc une entree corrompue afficherait le planning de
 * quelqu'un d'autre sans la moindre erreur. `projeterEdt` porte deja cette garde : on la rejoue plutot
 * que de la recopier.
 *
 * Un contenu illisible rend une table **vide** : le trousseau n'est ecrit que par nous, donc un
 * contenu aberrant veut dire qu'une version anterieure ecrivait autre chose. Ne rien proposer est
 * alors le bon comportement — la prochaine lecture du dossier reproposera.
 */
export function lirePropositionsEnAttente(brut: string | null): PropositionsParEtablissement {
    if (brut === null || brut === '') return {};

    let contenu: unknown;
    try {
        contenu = JSON.parse(brut);
    } catch {
        console.warn('[propositions] table illisible, ignoree');
        return {};
    }

    if (contenu === null || typeof contenu !== 'object' || Array.isArray(contenu)) return {};

    const table: Record<string, PropositionsDossier> = {};
    for (const [code, valeur] of Object.entries(contenu as Record<string, unknown>)) {
        if (valeur === null || typeof valeur !== 'object') continue;
        const entree = valeur as { ues?: unknown; edt?: unknown };
        const edtBrut = entree.edt as { ressource?: unknown; libelle?: unknown } | null | undefined;

        const propositions: PropositionsDossier = {
            ues: lireUes(entree.ues),
            edt: edtBrut === null || edtBrut === undefined
                ? null
                : projeterEdt(edtBrut.ressource, edtBrut.libelle),
        };
        // Une entree qui ne porte plus rien n'a pas a etre gardee : elle ferait croire a une attente.
        if (propositions.ues.length > 0 || propositions.edt !== null) table[code] = propositions;
    }
    return table;
}

/**
 * L'entree d'un etablissement, ou `null`.
 *
 * `null` veut dire « rien en attente ici », ce qui est le cas ordinaire : la table ne porte que ce
 * qui n'a pas encore recu de reponse.
 */
export function propositionsDe(
    table: PropositionsParEtablissement,
    etablissement: string,
): PropositionsDossier | null {
    return table[etablissement] ?? null;
}

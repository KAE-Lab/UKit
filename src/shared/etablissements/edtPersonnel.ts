/**
 * L'emploi du temps **personnel** trouve dans le dossier — la table, et sa fusion au referentiel.
 *
 * ADE preselectionne la fiche de l'etudiant connecte dans son arbre de ressources : le portail de
 * scolarite y lit un identifiant (`Direct Planning Tree_4087`) qui designe **son** emploi du temps,
 * la ou le referentiel du catalogue ne connait que des promotions. Cet identifiant ne peut pas vivre
 * dans le catalogue publie — il est propre a une personne — mais tout le reste de l'application ne
 * sait interroger qu'un `GroupeEdt`. La table le range donc a cote, et `sourceEdt()` le **fusionne**
 * au referentiel au moment de le lire : le groupe personnel se resout alors exactement comme un
 * autre, sans qu'aucun service, aucun ecran ni aucun favori n'apprenne qu'il existe.
 *
 * **Il vit au trousseau et non dans les reglages**, et c'est une mesure et non un principe : l'export
 * anonyme d'ADE accepte n'importe quel identifiant de ressource et rend l'emploi du temps
 * correspondant, sans authentification. Ce nombre vaut donc un secret, au meme titre qu'un lien
 * d'abonnement nominatif (`lienEdt.ts`).
 *
 * Ce fichier ne touche **ni** au trousseau **ni** au reseau : il tient une table en memoire et sait
 * la fusionner. La couture vit dans `index.ts`, comme pour les liens d'abonnement et pour la meme
 * raison, qui n'est pas du gout : une regle de cloisonnement qui se trompe fait perdre l'emploi du
 * temps de quelqu'un **sans rien dire**, et il faut donc qu'elle soit jouable sous Node
 * (docs/qualite.md).
 *
 * Voir docs/features/planning.md et docs/features/scolarite.md.
 */

import { getCodeEtablissementActif, type EdtIcal, type GroupeEdt } from './catalogue';
import { fusionnerEntree } from './comptes';

/** Les emplois du temps personnels enregistres, indexes par code d'etablissement. */
export type EdtsPersonnels = Readonly<Record<string, GroupeEdt>>;

/**
 * Une entree exploitable : un nom affichable, et un identifiant de ressource **numerique**.
 *
 * La verification du nombre est deja faite a la lecture du dossier (`PropositionsDossier.projeterEdt`)
 * et elle est refaite ici, volontairement : c'est la seconde ceinture d'une donnee qui, mal lue,
 * afficherait sans la moindre erreur le planning de quelqu'un d'autre. Le nom, lui, est requis parce
 * qu'il **est** la cle du favori : un groupe sans nom ne peut ni s'afficher, ni se retenir.
 */
function estGroupe(valeur: unknown): valeur is GroupeEdt {
    if (valeur === null || typeof valeur !== 'object') return false;
    const candidat = valeur as Record<string, unknown>;
    return (
        typeof candidat.nom === 'string' &&
        candidat.nom !== '' &&
        typeof candidat.ressource === 'string' &&
        /^\d+$/.test(candidat.ressource)
    );
}

/**
 * Lit la table persistee, en ecartant tout ce qui n'est pas exploitable.
 *
 * Une valeur illisible rend une table **vide** plutot qu'une exception : le trousseau n'est ecrit que
 * par nous, donc un contenu aberrant veut dire qu'une version anterieure ecrivait autre chose, et le
 * bon comportement est alors de reproposer l'emploi du temps a la prochaine lecture du dossier — pas
 * d'empecher l'application de demarrer.
 */
export function lireEdtsPersonnels(brut: string | null): EdtsPersonnels {
    if (brut === null || brut === '') return {};

    let contenu: unknown;
    try {
        contenu = JSON.parse(brut);
    } catch {
        console.warn('[edtPersonnel] table illisible, ignoree');
        return {};
    }

    if (contenu === null || typeof contenu !== 'object' || Array.isArray(contenu)) return {};

    const table: Record<string, GroupeEdt> = {};
    for (const [code, valeur] of Object.entries(contenu as Record<string, unknown>)) {
        if (estGroupe(valeur)) table[code] = { nom: valeur.nom, ressource: valeur.ressource };
    }
    return table;
}

/**
 * Pose — ou retire, avec `null` — l'entree d'un etablissement **sans toucher aux autres**.
 *
 * La regle du cloisonnement est celle de la session universitaire, au mot pres, et elle est donc
 * appelee la-bas plutot que recopiee ici : il n'y a qu'un endroit ou se tromper (`comptes.ts`).
 */
export function fusionnerEdtsPersonnels(
    table: EdtsPersonnels,
    etablissement: string,
    groupe: GroupeEdt | null,
): EdtsPersonnels {
    return fusionnerEntree(table, etablissement, groupe);
}

/** La table courante. Posee au demarrage par la couture, et a chaque enregistrement. */
let personnels: EdtsPersonnels = {};

/** Installe la table lue du trousseau. Sans argument, revient a « aucun emploi du temps personnel ». */
export function appliquerEdtsPersonnels(table?: EdtsPersonnels | null): void {
    personnels = table ?? {};
}

/** La table courante, pour la couture qui doit la fusionner puis l'ecrire. */
export function edtsPersonnels(): EdtsPersonnels {
    return personnels;
}

/** L'emploi du temps personnel de l'etablissement selectionne, ou `null`. */
export function edtPersonnelActif(): GroupeEdt | null {
    return personnels[getCodeEtablissementActif()] ?? null;
}

/**
 * Le referentiel du catalogue, **augmente** du groupe personnel.
 *
 * En tete de liste, parce que c'est celui qu'on cherche : l'ecran de choix des groupes affiche le
 * referentiel dans l'ordre ou il arrive, et le sien doit se voir sans defiler.
 *
 * Rend la configuration **telle quelle** quand il n'y a rien a fusionner. Ce n'est pas une economie
 * de calcul mais une garantie d'identite : `sourceEdt()` est appelee a chaque rendu par plusieurs
 * ecrans, et rendre un objet neuf a chaque fois ferait travailler des comparaisons de reference qui
 * ne s'attendent pas a changer.
 *
 * Un nom deja present gagne : le referentiel publie fait foi, et deux entrees de meme nom en
 * rendraient une inatteignable — `resoudreRessources` resout par le nom.
 */
export function fusionnerGroupePersonnel(config: EdtIcal, personnel: GroupeEdt | null): EdtIcal {
    if (personnel === null) return config;
    if (config.groupes.some((groupe) => groupe.nom === personnel.nom)) return config;

    return { ...config, groupes: [personnel, ...config.groupes] };
}

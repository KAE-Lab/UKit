/**
 * Les documents de scolarite : des fichiers que l'etudiant range lui-meme, sur son appareil.
 *
 * C'est la seule partie de l'onglet qui **fonctionne sans compte**, et c'est ce qui la justifie :
 * un etablissement sans portail publie — « Autre universite » — rendait jusqu'ici l'onglet
 * entierement mort. Voir docs/features/scolarite.md.
 *
 * ## Ou vivent ces fichiers, et pourquoi pas ailleurs
 *
 * Dans le **repertoire privé de l'application** (`Paths.document`), isole des autres applications et
 * couvert par le chiffrement de l'appareil quand celui-ci est verrouille. **Pas dans le trousseau** :
 * `expo-secure-store` est fait pour de petites valeurs — quelques kilo-octets — et refuserait un PDF.
 *
 * La formulation exacte, a reprendre telle quelle dans PRIVACY.md : *les documents restent sur
 * l'appareil, dans l'espace prive de l'application, et ne sont envoyes nulle part.* Ecrire
 * « chiffres par UKit » serait faux — une cle qui vivrait a cote du fichier ne protege de rien, et
 * le vrai rempart est celui du systeme.
 *
 * ## Ce qui n'est pas fait, et c'est une limite ecrite
 *
 * **Rien n'est recupere automatiquement depuis le portail.** Un Blueprint ne sait pas telecharger un
 * binaire — l'Act II n'ecrit pas de fichier, et l'extraction texte du jalon 3-I ne rend que du texte
 * decode. La sonde du 2026-08-25 a de plus montre que les PDF de Bordeaux INP (certificat de
 * scolarite, attestation de paiement, releves de notes) portent une URL dont l'UUID et l'horodatage
 * sont **regeneres a chaque rendu de page** : meme telechargeables, ils ne seraient pas rejouables.
 * Ce sont des portes, jamais des donnees.
 *
 * ## Pas d'index a cote des fichiers
 *
 * Le repertoire **est** la liste. Tenir un index JSON en parallele creerait deux verites a
 * reconcilier — un fichier supprime par le systeme, un index qui le mentionne encore — pour ne
 * gagner que des metadonnees que `info()` donne deja.
 */

import { Directory, File, Paths } from 'expo-file-system';

/** Le sous-repertoire, nomme une seule fois. */
const DOSSIER = 'scolarite-documents';

/** Une piece rangee, telle que l'ecran la montre. */
export interface DocumentScolarite {
    /** Le nom de fichier, qui sert aussi de cle : deux pieces ne peuvent pas le partager. */
    readonly nom: string;
    readonly uri: string;
    /** En octets. `null` quand le systeme ne le dit pas. */
    readonly taille: number | null;
    /** Millisecondes depuis l'epoque, ou `null`. */
    readonly ajouteLe: number | null;
}

/** Le repertoire, cree a la demande.  couvre la course entre le test et la creation. */
function repertoire(): Directory {
    const dossier = new Directory(Paths.document, DOSSIER);
    if (!dossier.exists) dossier.create({ intermediates: true, idempotent: true });
    return dossier;
}

/**
 * Les pieces rangees, de la plus recente a la plus ancienne.
 *
 * Le tri est **applicatif** et non un ordre de systeme de fichiers : `list()` ne promet aucun ordre,
 * et une liste qui se reordonne d'un affichage a l'autre se lit comme un defaut.
 */
export function listerDocuments(): DocumentScolarite[] {
    const entrees = repertoire().list().filter((entree): entree is File => entree instanceof File);

    return entrees
        .map((fichier) => {
            const info = fichier.info();
            return {
                nom: fichier.name,
                uri: fichier.uri,
                taille: info.size ?? null,
                ajouteLe: info.modificationTime ?? null,
            };
        })
        .sort((gauche, droite) => (droite.ajouteLe ?? 0) - (gauche.ajouteLe ?? 0));
}

/**
 * Un nom libre dans le repertoire, en suffixant si besoin.
 *
 * Sans ca, ajouter deux fois « certificat.pdf » ecraserait le premier **en silence**. Le suffixe se
 * pose avant l'extension pour que le systeme continue de reconnaitre le type au moment d'ouvrir.
 */
function nomLibre(dossier: Directory, souhaite: string): string {
    const point = souhaite.lastIndexOf('.');
    const base = point > 0 ? souhaite.slice(0, point) : souhaite;
    const extension = point > 0 ? souhaite.slice(point) : '';

    let candidat = souhaite;
    let rang = 2;
    while (new File(dossier, candidat).exists) {
        candidat = `${base} (${rang})${extension}`;
        rang += 1;
    }
    return candidat;
}

/**
 * Range une piece choisie par l'etudiant, et rend son nom definitif.
 *
 * On **copie** plutot que de deplacer : le fichier choisi vit dans un cache que le selecteur possede,
 * et le deplacer laisserait a l'application la responsabilite d'un fichier qui ne lui appartient pas.
 */
export function ajouterDocument(uriSource: string, nomSouhaite: string): DocumentScolarite {
    const dossier = repertoire();
    const nom = nomLibre(dossier, nomSouhaite);
    const destination = new File(dossier, nom);

    new File(uriSource).copy(destination);

    const info = destination.info();
    return {
        nom,
        uri: destination.uri,
        taille: info.size ?? null,
        ajouteLe: info.modificationTime ?? Date.now(),
    };
}

/** Supprime une piece. Un fichier deja disparu n'est pas une erreur : le resultat voulu est atteint. */
export function supprimerDocument(nom: string): void {
    const fichier = new File(repertoire(), nom);
    if (fichier.exists) fichier.delete();
}

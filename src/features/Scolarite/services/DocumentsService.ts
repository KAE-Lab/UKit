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
 * ## Ce qui vient du portail, et ce qui n'en viendra pas
 *
 * **Le certificat de scolarite se range tout seul, chez les etablissements qui le permettent.** Il
 * arrive par `certificat.ts`, qui joue un Blueprint et appelle `enregistrerDocument` ci-dessous.
 * Ce module ne sait rien de ce chemin : il ecrit des octets sous un nom, d'ou qu'ils viennent.
 *
 * **La condition n'est PAS que l'adresse soit rejouable**, et cette phrase a ete fausse un jour ici :
 * le Blueprint lit le lien frais dans le DOM a chaque run et telecharge depuis la page, donc une
 * adresse regeneree a chaque rendu (Bordeaux INP) se rapporte aussi bien qu'une adresse deterministe
 * (ReNARD). La seule condition est qu'un Blueprint sache trouver le lien — c'est le catalogue qui
 * tranche (`portail_documents`), pas ce fichier.
 *
 * **Un Blueprint n'ecrit toujours pas de fichier** : il rapporte le contenu, l'application l'ecrit.
 * La limite n'a pas bouge, c'est la repartition qui est devenue explicite.
 *
 * ## Un dossier par etablissement
 *
 * Les pieces sont cloisonnees par etablissement (`scolarite-documents/<code>/`), comme la session et
 * les liens d'abonnement le sont dans le trousseau : une bascule n'efface rien, un aller-retour
 * retrouve tout, et le certificat du College ST ne s'affiche plus sous un compte de l'INP.
 *
 * ## Pas d'index a cote des fichiers
 *
 * Le repertoire **est** la liste. Tenir un index JSON en parallele creerait deux verites a
 * reconcilier — un fichier supprime par le systeme, un index qui le mentionne encore — pour ne
 * gagner que des metadonnees que `info()` donne deja.
 */

import { Directory, File, Paths } from 'expo-file-system';

import { decoderBase64 } from '../../../shared/services/Base64';
import { getCodeEtablissementActif } from '../../../shared/etablissements';
import { ecrireEtVerifier } from './EcritureVerifiee';

/** Le sous-repertoire racine, nomme une seule fois. Chaque etablissement y a son propre dossier. */
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

/**
 * Les fichiers restes a la racine relevent d'une disposition d'avant le cloisonnement : ils sont
 * effaces une fois par lancement. Voir `repertoire` — le nettoyage n'existe que parce que des
 * appareils de test ont ecrit dans l'ancienne disposition ; en production, la racine n'a jamais
 * porte de fichier.
 */
let racineNettoyee = false;

/**
 * Le repertoire des pieces de **l'etablissement selectionne**, cree a la demande.
 *
 * Cloisonne par etablissement, et c'est une correction mesuree : les pieces vivaient dans un seul
 * dossier, et basculer vers Bordeaux INP montrait le certificat de scolarite du College ST — la
 * regle du depot dit pourtant que *les donnees de deux universites ne se melangent pas* (signale sur
 * appareil le 2026-08-29). Le modele est celui du trousseau : chaque fac a son entree, une bascule
 * n'efface rien, et un aller-retour retrouve ses pieces. Effacer a la bascule, comme le font les
 * caches, serait ici une perte — ce sont des fichiers personnels, pas des donnees rejouables.
 */
function repertoire(): Directory {
    const racine = new Directory(Paths.document, DOSSIER);
    if (!racine.exists) racine.create({ intermediates: true, idempotent: true });

    if (!racineNettoyee) {
        racineNettoyee = true;
        try {
            const relics = racine.list().filter((entree): entree is File => entree instanceof File);
            for (const relic of relics) relic.delete();
            if (relics.length > 0) {
                // Sans regret : la disposition a plat n'a jamais ete livree, et le certificat — la
                // seule piece rangee automatiquement — se retelecharge seul au parcours froid.
                console.warn(`[documents] ${relics.length} piece(s) de l'ancienne disposition effacee(s)`);
            }
        } catch (erreur) {
            console.warn(`[documents] nettoyage de racine impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        }
    }

    const dossier = new Directory(racine, getCodeEtablissementActif());
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

/**
 * Range des octets rapportes par un run, et rend la piece.
 *
 * Le pendant de `ajouterDocument` pour ce qui ne vient pas d'un fichier : la meme regle de nommage,
 * le meme repertoire, la meme absence d'index. Le contenu arrive en **base64** parce que c'est la
 * seule forme sous laquelle un binaire traverse le pont d'une WebView.
 *
 * **Le decodage se fait ici, en JavaScript, et l'ecriture est verifiee par relecture — c'est la
 * lecon la plus chere de ce module.** La premiere version deleguait au natif
 * (`write(base64, { encoding: 'base64' })`), une option qui n'existe que depuis expo-file-system
 * 19.0.16 — et le natif qui tourne est celui **embarque dans Expo Go**, pas celui de node_modules.
 * Le releve sur l'appareil touche (2026-08-29) : un fichier de **zero octet** sous un nom en `.pdf`,
 * que la WebView chargeait « avec succes » et rendait en ecran noir — cinq essais pour le nommer,
 * parce qu'aucune etape n'avait echoue bruyamment. D'ou la regle qui structure `ecrireEtVerifier` :
 * **aucun appel d'ecriture n'est cru sur parole**, la seule preuve est la relecture.
 *
 * **Une ecriture qui echoue ne laisse rien derriere elle.** Un fichier partiel porterait le nom qui
 * sert de cle d'idempotence : le rangement automatique le croirait fait et ne retenterait jamais.
 */
export async function enregistrerDocument(nomSouhaite: string, base64: string): Promise<DocumentScolarite> {
    const dossier = repertoire();
    const nom = nomLibre(dossier, nomSouhaite);
    const destination = new File(dossier, nom);

    const octets = decoderBase64(base64);
    if (octets.length === 0) throw new Error('contenu vide');

    try {
        await ecrireEtVerifier(destination, octets, base64);
    } catch (erreur) {
        if (destination.exists) destination.delete();
        throw erreur;
    }

    const info = destination.info();
    return {
        nom,
        uri: destination.uri,
        taille: info.size ?? null,
        ajouteLe: info.modificationTime ?? Date.now(),
    };
}

/** La signature d'un PDF : `%PDF`. Le seul type que le rangement automatique ecrit aujourd'hui. */
function estUnPdf(octets: Uint8Array): boolean {
    return octets.length >= 4
        && octets[0] === 0x25 && octets[1] === 0x50 && octets[2] === 0x44 && octets[3] === 0x46;
}

/**
 * Une piece **saine** de ce nom est-elle deja rangee ?
 *
 * C'est ce qui tient l'idempotence du rangement automatique, **sans index** : le repertoire est la
 * liste, donc la question se pose au systeme de fichiers. Un nom deja pris veut dire « on l'a deja »,
 * la ou `nomLibre` en aurait fait un doublon suffixe a chaque lancement.
 *
 * « Saine » et pas seulement « presente », et la nuance est une reparation : le defaut d'ecriture
 * ci-dessus a laisse sur de vrais appareils un fichier du bon nom au contenu faux — du texte base64
 * la ou un PDF etait attendu. Presente seule, la cle d'idempotence **verrouillait le defaut** : la
 * piece corrompue bloquait toute nouvelle tentative, pour toujours. Une piece dont le contenu ne
 * porte pas la signature de son type est donc **supprimee ici**, et la reponse « non » declenche le
 * rangement propre — l'appareil se repare tout seul au parcours froid suivant.
 */
export function pieceSaineRangee(nom: string): boolean {
    try {
        const fichier = new File(repertoire(), nom);
        if (!fichier.exists) return false;

        const octets = fichier.bytesSync();
        const saine = octets.length > 0 && (!nom.toLowerCase().endsWith('.pdf') || estUnPdf(octets));
        if (!saine) {
            console.warn(`[documents] piece corrompue supprimee pour reprise : ${nom} (${octets.length} octets)`);
            fichier.delete();
            return false;
        }
        return true;
    } catch {
        // Un repertoire illisible se comporte comme un repertoire vide partout ailleurs ici. Repondre
        // « non » fait au pire retenter une ecriture qui echouera proprement, la ou repondre « oui »
        // ferait manquer le certificat en silence.
        return false;
    }
}

/** Supprime une piece. Un fichier deja disparu n'est pas une erreur : le resultat voulu est atteint. */
export function supprimerDocument(nom: string): void {
    const fichier = new File(repertoire(), nom);
    if (fichier.exists) fichier.delete();
}

/**
 * Le certificat de scolarite, range tout seul.
 *
 * C'est la premiere fois qu'un run rapporte un **fichier** dans cette application, et la repartition
 * qui rend ca possible est la meme que partout ailleurs : le Blueprint sait ou aller et rapporte le
 * contenu, l'application ecrit. Un Blueprint n'ecrit toujours pas de binaire ; il n'en a pas besoin.
 *
 * ## Ce qui rend un portail rapportable
 *
 * Qu'un Blueprint sache **trouver le lien dans la page** — rien d'autre. La premiere version de ce
 * commentaire exigeait une adresse rejouable, et c'etait une erreur d'analyse : le Blueprint lit le
 * lien frais dans le DOM a chaque run et telecharge depuis la page meme, donc les adresses ephemeres
 * de PC-Scol (Bordeaux INP, regenerees a chaque rendu) se rapportent aussi bien que les adresses
 * deterministes de ReNARD. Les deux etablissements declarent leur source au catalogue depuis le
 * 2026-08-29 — et l'utilisateur du produit a repere l'erreur avant l'auteur du commentaire.
 *
 * ## Trois regles de comportement, et aucune n'est cosmetique
 *
 *   - **Ca ne bloque jamais rien.** L'appel est lance apres le parcours froid, sans etre attendu, et
 *     ne leve pas. Un portail muet, un moteur occupe, une piece absente : le compte est connecte
 *     quand meme, et la page ne montre rien de different.
 *   - **Ca n'ecrit jamais deux fois la meme piece.** Le nom du fichier est la cle, et il vient du
 *     LIBELLE DU PORTAIL — « Certificat 2026/2027 ». Sans cette garde, chaque parcours froid
 *     ajouterait « Certificat 2026-2027 (2).pdf », puis (3), et le repertoire de l'etudiant
 *     deviendrait une decharge.
 *
 *     La verification a lieu **apres** le run et pas avant, et c'est un choix contre une optimisation
 *     tentante : deviner le nom d'avance demanderait de connaitre a la fois la formulation du portail
 *     et l'annee qu'il sert. La seconde n'est pas celle du calendrier — un etudiant pas encore
 *     reinscrit se voit servir l'annee precedente —, donc un nom devine serait faux precisement dans
 *     le cas ou il compte. On paie un run pour ne pas ranger une piece sous une mauvaise annee, et le
 *     run n'a lieu qu'au parcours froid : une connexion, ou un « Actualiser mon dossier ».
 *
 *     L'inconvenient qui reste est assume et il est le bon sens de l'erreur : **une piece supprimee a
 *     la main revient au prochain parcours froid**, ce qui est genant une fois, la ou l'inverse
 *     remplirait l'appareil tout seul.
 *   - **Ca ne dit rien a l'utilisateur — en mots.** Ni reussite ni echec : un certificat qui
 *     apparait se remarque de lui-meme, et un message pour annoncer qu'on n'a pas su le chercher
 *     transformerait un service rendu en passif affiche. Mais ca **se montre** : la tuile des
 *     documents pose l'indicateur de lecture des widgets pendant ce run (`useCertificat`, dans le
 *     provider). La nuance vient d'un constat d'appareil (2026-08-29) — ce run est le dernier de la
 *     chaine et le plus long, il continue apres la barre du parcours froid, et un silence total se
 *     lisait comme un echec.
 *
 * Voir docs/features/scolarite.md.
 */

import Translator from '../../../shared/i18n/Translator';
import { documentsPublies } from '../../../shared/etablissements';
import {
    estNomDePortail,
    reportFailure,
    runBlueprint,
    type RunnableBlueprintName,
} from '../../../shared/aetherius';
import { enregistrerDocument, pieceSaineRangee } from './DocumentsService';
import { surLeNavigateur } from './MoteurNavigateur';
import { nomDuCertificat, projeterCertificat, type RefusCertificat } from './CertificatProjection';

/** Ce qu'un rangement a fait, en un mot. Rendu pour les tests et la trace, jamais affiche. */
export type IssueCertificat =
    | 'range'
    /** Le portail sert une piece qu'on a deja rangee sous ce nom. */
    | 'deja-la'
    /** L'etablissement ne declare pas de source de documents. Le cas general. */
    | 'sans-source'
    /** Le moteur navigateur etait encore pris apres l'attente. Rien a rattraper : ca retentera. */
    | 'moteur-occupe'
    /** Le run a echoue. Deja signale par `reportFailure`. */
    | 'echec'
    | RefusCertificat;

export interface OptionsCertificat {
    readonly signal?: AbortSignal;
}

/**
 * Va chercher le certificat de scolarite et le range, si tout s'y prete.
 *
 * Ne leve jamais et ne rend qu'un mot : l'appelant n'a rien a en faire, sinon le journaliser. C'est
 * volontaire — voir « ca ne dit rien a l'utilisateur » en tete de fichier.
 */
export async function rangerCertificat(options: OptionsCertificat = {}): Promise<IssueCertificat> {
    const publie = documentsPublies();
    if (publie === null || !estNomDePortail(publie)) {
        // Journalise **toutes** les sorties, y compris celle-ci. Un rangement qui n'a rien dit est
        // indiscernable d'un rangement qui n'a pas eu lieu : c'est exactement la question qu'on s'est
        // posee le 2026-08-29 devant une section Documents restee vide.
        console.log(`[certificat] pas de source publiee ici (${publie ?? 'aucune'})`);
        return 'sans-source';
    }

    const blueprint = publie as RunnableBlueprintName;
    const reserve = await surLeNavigateur(
        blueprint,
        (signal) => runBlueprint(blueprint, { signal }),
        // `arriere-plan`, comme les widgets, et c'est ici que ca compte le plus : ce run dure une
        // vingtaine de secondes, et il se declenche juste apres une connexion — c'est-a-dire au moment
        // exact ou l'utilisateur est le plus susceptible d'appuyer sur quelque chose. Il patiente
        // derriere les lectures, et **s'efface** devant le moindre geste.
        {
            priorite: 'arriere-plan',
            ...(options.signal !== undefined ? { signal: options.signal } : {}),
        },
    );

    if (reserve.ok === false) {
        console.log(`[certificat] saute : le moteur joue ${reserve.occupePar}`);
        return 'moteur-occupe';
    }

    const run = reserve.valeur;
    if (run.ok === false) {
        reportFailure(blueprint, run.failure);
        console.log(`[certificat] run en echec : ${run.failure.kind}${run.failure.code === undefined ? '' : ` [${run.failure.code}]`}`);
        return 'echec';
    }

    const projection = projeterCertificat(run.outputs);
    if (projection.ok === false) {
        console.log(`[certificat] rien a ranger : ${projection.refus}`);
        return projection.refus;
    }

    const nom = nomDuCertificat(projection.certificat.libelle, Translator.get('DOCUMENT_CERTIFICATE'));
    // « Saine » et pas seulement presente : une piece corrompue par l'ancien defaut d'ecriture est
    // supprimee par ce test, et le rangement propre se joue dans la foulee (DocumentsService).
    if (pieceSaineRangee(nom)) {
        console.log(`[certificat] deja range : ${nom}`);
        return 'deja-la';
    }

    try {
        await enregistrerDocument(nom, projection.certificat.contenu);
    } catch (erreur) {
        console.warn(`[certificat] ecriture impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return 'echec';
    }

    console.log(`[certificat] range : ${nom} (${projection.certificat.octets} octets)`);
    return 'range';
}

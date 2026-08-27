/**
 * La projection des sorties de Blueprint vers ce que les ecrans de Scolarite attendent.
 *
 * Separe du service pour la raison qui vaut partout dans ce depot : ce module ne depend d'aucune
 * plateforme, donc il se joue sous vitest, alors que le service importe le moteur (docs/qualite.md).
 * Les trois decisions ci-dessous ne se voient pas a la relecture et coutent une donnee fausse dans le
 * trousseau si on les prend a l'envers — c'est pour elles que le test existe.
 *
 * Voir docs/features/scolarite.md et docs/phase-6/6-f-scolarite.md.
 */

import type { UkitFailure } from '../../../shared/aetherius/failures';
import type { TranslationKey } from '../../../shared/i18n/Translator';

/**
 * Les donnees froides, telles que `SecureStore` les porte. Les cinq cles historiques ne changent pas.
 *
 * Les quatre suivantes sont **facultatives**, et le type le dit : une entree de trousseau ecrite par
 * une version anterieure ne les porte pas. Les declarer obligatoires ferait mentir le compilateur sur
 * des donnees qui existent deja sur les appareils, et l'ecran afficherait un libelle vide plutot que
 * de faire disparaitre sa ligne.
 */
export interface ScolariteColdData {
    readonly firstName: string;
    readonly studentNumber: string;
    readonly ine: string;
    readonly emailAddress: string;
    readonly dateOfBirth: string;
    /** L'intitule de l'inscription courante : « M1 Informatique », « Annee 2 - Ingenieur ... ». */
    readonly formation?: string;
    /** Son annee, telle que la source l'ecrit : « 2026/2027 » a Bordeaux, « 2026-2027 » a l'INP. */
    readonly formationAnnee?: string;
    /** Le second intitule, plus long : la composante a Bordeaux, le diplome officiel a l'INP. */
    readonly formationDetail?: string;
    /** Quand le dossier a ete lu, en ISO. Pose par l'appelant : l'heure ne se lit pas ici. */
    readonly luLe?: string;
}

/** Les donnees chaudes : le compteur, et rien d'autre. */
export interface ScolariteMailData {
    readonly unreadCount: number | null;
}

function texte(valeur: unknown): string {
    return typeof valeur === 'string' ? valeur.trim() : '';
}

/**
 * La premiere valeur d'une sortie qui peut etre une chaine, une liste, ou rien.
 *
 * Les deux portails ne rendent pas la meme forme, et c'est deliberé : une lecture **obligatoire**
 * descend en `as: "text"`, qui leve si le noeud manque ; une lecture **bonus** descend en
 * `as: "list"`, qui rend `[]` et ne leve jamais. L'INE en est l'illustration — il est obligatoire a
 * Bordeaux, facultatif a l'INP ou il vit sur un onglet a part. Normaliser ici plutot que dans les
 * fichiers evite d'imposer a un portail la fragilite de l'autre.
 *
 * Meme role que `commeListe` cote bibliotheques, dans l'autre sens (LibraryMapping.ts).
 */
function premierTexte(valeur: unknown): string {
    if (Array.isArray(valeur)) return valeur.length > 0 ? texte(valeur[0]) : '';
    return texte(valeur);
}

/**
 * Le libelle d'une formation, debarrasse des glyphes d'icone que la source y colle.
 *
 * Mesure du 2026-08-25 : le tableau des inscriptions de Bordeaux rend « M1 Informatique\uf002 » —
 * la ligne courante porte une icone FontAwesome dans la meme cellule que son intitule, et le texte
 * de l'element l'emporte avec lui. Ces glyphes vivent dans la zone d'usage prive d'Unicode, ou rien
 * de legitime ne s'ecrit : les retirer ne peut pas amputer un vrai libelle.
 */
function libelleFormation(valeur: unknown): string {
    return premierTexte(valeur).replace(/[\uE000-\uF8FF]/g, '').trim();
}

/**
 * Le prenom, tire de l'identite complete.
 *
 * Le dossier administratif rend `PRENOM NOM` en capitales sous le libelle **« Prenom et Nom »** — et
 * c'est ce libelle, lu et asserte par le Blueprint, qui autorise a prendre le premier mot. Sans lui
 * l'ordre serait une supposition, et une supposition sur un nom propre s'affiche en toutes lettres
 * sur le tableau de bord.
 *
 * La casse est refaite parce que la source crie : `KYLIAN` deviendrait une salutation en capitales.
 * Les segments composes (`JEAN-PIERRE`, `D'ARTAGNAN`) sont capitalises segment par segment, ce que le
 * `toLowerCase` seul ne ferait pas.
 *
 * Limite assumee : un etudiant a deux prenoms n'en voit que le premier. C'est le bon resultat pour
 * une salutation, et le mauvais pour un etat civil — le second n'est pas ce que cet ecran affiche.
 */
export function prenomDepuisIdentite(identite: unknown): string {
    const complet = texte(identite);
    if (complet === '') return '';

    const premier = complet.split(/\s+/)[0];
    return premier.replace(
        /[^\s\-']+/g,
        (segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    );
}

/**
 * Les donnees froides, depuis les sorties de `ukit.portail.bordeaux.dossier`.
 *
 * Aucun repli sur une valeur inventee : un champ absent reste vide, et c'est l'`assert` du Blueprint
 * qui a deja refuse le cas ou les libelles ont bouge. Reconstruire ici ce que la page n'a pas donne
 * reintroduirait exactement la donnee fausse que ce jalon supprime.
 */
export function projeterDossier(
    outputs: Readonly<Record<string, unknown>>,
    luLe: string,
): ScolariteColdData {
    return {
        firstName: prenomDepuisIdentite(outputs.identite),
        studentNumber: texte(outputs.numero_etudiant),
        // `premierTexte` et non `texte` : l'INE est une chaine a Bordeaux et une liste a l'INP, ou
        // il vit sur un onglet a part donc se lit en `as: "list"` pour ne jamais lever.
        ine: premierTexte(outputs.ine),
        emailAddress: texte(outputs.email),
        dateOfBirth: texte(outputs.naissance),
        formation: libelleFormation(outputs.formation_libelle),
        formationAnnee: premierTexte(outputs.formation_annee),
        formationDetail: libelleFormation(outputs.formation_detail),
        // Pose par l'appelant, jamais lu ici : ce module ne connait pas l'heure courante, c'est ce
        // qui le garde rejouable sous vitest (docs/blueprints.md).
        luLe,
    };
}

/**
 * Le compteur de messages non lus, depuis les sorties de `ukit.portail.bordeaux.messagerie`.
 *
 * `as: "number"` lit le premier nombre du libelle et rend un **entier**, la ou le code d'origine
 * rendait la chaine capturee par une expression reguliere. Une difference en decoule et se decide
 * ici : un libelle **sans parenthese** — « Reception » tout court — donnait `'0'` avant et donnerait
 * `null` maintenant. La boite descend donc en sortie a cote du nombre, et sa presence tranche :
 *
 *   - un nombre lu           -> ce nombre ;
 *   - une boite sans nombre  -> `0`, comme avant : la boite existe, elle n'a rien de non lu ;
 *   - pas de boite du tout   -> `null`, qui veut dire « on ne sait pas » et non « zero ».
 *
 * Le troisieme cas ne devrait pas arriver — un `wait_for` vient de prouver l'element — mais le
 * confondre avec le deuxieme afficherait « aucun message non lu » sur une lecture qui a echoue.
 */
export function projeterMessagerie(outputs: Readonly<Record<string, unknown>>): ScolariteMailData {
    const nombre = outputs.non_lus;
    if (typeof nombre === 'number' && Number.isFinite(nombre)) {
        return { unreadCount: nombre };
    }
    return { unreadCount: texte(outputs.boite_de_reception) === '' ? null : 0 };
}

/**
 * Les echecs que **ces** Blueprints savent nommer, projetes sur un message.
 *
 * La table vit ici et non dans `shared/aetherius/failures.ts` : celle-la range les familles du
 * moteur, qui valent pour toute source, alors que `LOGIN_FAILED` ou `MESSAGERIE_INDISPONIBLE` sont
 * des codes que ce portail-ci se donne. Faire remonter des codes de portail dans la table generique
 * la ferait grossir a chaque etablissement ajoute (jalon 6-G).
 *
 * Un code inconnu retombe sur la famille : un Blueprint publie peut nommer un echec que cette
 * version de l'application n'a jamais vu, et « la demande n'a pas pu aboutir » vaut mieux qu'un
 * libelle brut affiche a un etudiant.
 */
const CLE_PAR_CODE: Readonly<Record<string, { readonly titre: TranslationKey; readonly message: TranslationKey }>> = {
    LOGIN_FAILED: { titre: 'LOGIN_FAILED_TITLE', message: 'LOGIN_FAILED' },
    CAS_INDISPONIBLE: { titre: 'ERROR_CAS_UNAVAILABLE_TITLE', message: 'ERROR_CAS_UNAVAILABLE' },
    MESSAGERIE_INDISPONIBLE: { titre: 'ERROR_MAILBOX_UNAVAILABLE_TITLE', message: 'ERROR_MAILBOX_UNAVAILABLE' },
};

// `PORTAIL_ABSENT` n'est volontairement **pas** dans cette table (jalon 6-G) : ce n'est pas un code
// de portail mais un code de catalogue — aucun run n'est parti, l'etablissement ne publie simplement
// pas ce service. Il porte donc deja sa cle, posee par `serviceAbsent` (shared/aetherius/failures.ts),
// et le repli de `cleDeMessage` la rend telle quelle. L'inscrire ici creerait un second endroit ou
// changer le message.

export function cleDeMessage(failure: UkitFailure): TranslationKey {
    if (failure.code !== undefined && CLE_PAR_CODE[failure.code] !== undefined) {
        return CLE_PAR_CODE[failure.code].message;
    }
    return failure.messageKey;
}

/**
 * Le **titre** du meme echec, suivant exactement le meme chemin que son message.
 *
 * Les deux se decident ensemble ou pas du tout : un titre de famille (« Demande interrompue ») pose
 * au-dessus d'un message de code (« Le portail de ton universite ne repond pas ») dirait deux choses
 * differentes du meme echec.
 */
export function cleDeTitre(failure: UkitFailure): TranslationKey {
    if (failure.code !== undefined && CLE_PAR_CODE[failure.code] !== undefined) {
        return CLE_PAR_CODE[failure.code].titre;
    }
    return failure.titleKey;
}

/**
 * Les codes qui decrivent un service momentanement absent, et non un refus.
 *
 * Ils sont **reessayables** alors que leur famille (`blocked`) ne l'est pas, et l'ecart est mesure,
 * pas theorique : sur un appareil, une source injoignable ne produit **jamais** `unavailable`. Une
 * connexion refusee fait rendre a iOS sa propre page d'erreur, dans laquelle l'agent s'injecte et
 * s'annonce — donc `navigate` reussit, et c'est l'attente suivante qui echoue, avec le nom que le
 * Blueprint lui a donne. Un nom qui ne resout pas, lui, ne produit aucun document et retombe en
 * `engine`. Dans les deux cas la famille `unavailable`, seule porteuse d'un bouton Reessayer, est
 * hors d'atteinte.
 *
 * Constate sur iPhone en verifiant le jalon 6-F. La limite est celle du moteur et elle est ecrite
 * (docs/features/scolarite.md) ; ce qui suit n'est pas un contournement mais une decision d'ecran :
 * un portail qui ne repond pas repondra peut-etre dans dix secondes, et refuser de proposer de
 * reessayer serait faux. `LOGIN_FAILED`, lui, reste non reessayable — rejouer le meme mot de passe
 * donnera le meme refus.
 */
const CODES_REESSAYABLES: readonly string[] = ['CAS_INDISPONIBLE', 'MESSAGERIE_INDISPONIBLE'];

/**
 * L'echec tel qu'un ecran de scolarite doit le montrer : son message, et s'il vaut la peine d'etre
 * rejoue.
 *
 * Passer par ici plutot que de lire `failure` directement — c'est le seul endroit qui connait les
 * codes de ce portail.
 */
export function presenterEchec(failure: UkitFailure): UkitFailure {
    const reessayable = failure.retryable
        || (failure.code !== undefined && CODES_REESSAYABLES.includes(failure.code));

    return { ...failure, titleKey: cleDeTitre(failure), messageKey: cleDeMessage(failure), retryable: reessayable };
}

/**
 * Un echec qui appelle une **ressaisie**, et non une reprise.
 *
 * `LOGIN_FAILED` reste a juste titre non reessayable — rejouer le meme mot de passe donnera le meme
 * refus. Mais l'ecran de connexion n'apparaissait que si le trousseau etait **vide** : quelqu'un dont
 * le mot de passe a change a l'universite voyait une erreur definitive, sans formulaire, et devait
 * deviner qu'il fallait passer par les Reglages pour se deconnecter.
 *
 * C'est exactement la distinction que porte `NoticeAction` : reessayer repare une panne, une action
 * repare une **absence** — et un mot de passe perime est une absence (jalon 6-K,
 * docs/defauts-fonctionnels.md).
 */
export function demandeUneRessaisie(failure: UkitFailure | null): boolean {
    return failure !== null && failure.code === 'LOGIN_FAILED';
}

/**
 * Le modele d'erreur : traduire un echec de run en ce qu'un ecran doit faire.
 *
 * C'est le vrai livrable du jalon 6-A, et le changement le plus structurant de la phase. Avant elle,
 * tous les services rendaient `null` ou `[]` en cas d'echec, et leur propre documentation le disait :
 * « une panne du fournisseur et une reponse legitimement vide sont indistinguables ». Un ecran
 * « aucun resultat » pouvait donc masquer une source morte.
 *
 * Le moteur leve des erreurs **typees** et ne decide pas a la place de l'application ;
 * `describeFailure` les range dans neuf familles. Ce fichier dit ce que chaque famille veut dire
 * **pour un ecran de UKit** : quel message, et si l'on propose de reessayer.
 *
 * Le pendant, qui est la moitie du sujet : **une liste vide n'est pas une erreur**. Un run reussi
 * dont les sorties portent une liste vide a reellement trouve une liste vide.
 *
 * Ce module importe `describeFailure` du **moteur** et non du paquet React Native, qui le
 * re-exporte : le modele d'erreur ne depend d'aucune plateforme, et c'est ce qui le rend jouable
 * hors appareil (failures.test.ts).
 *
 * Voir docs/blueprints.md et docs/phase-6/6-a-socle.md.
 */

import { describeFailure, type FailureKind } from '@aetherius/engine';

import type { BlueprintName, PortailBlueprintName } from '../../../blueprints';
import type { TranslationKey } from '../i18n/Translator';
// Import **de type seulement** : `Theme.ts` importe `react-native` et n'est pas jouable sous Node,
// alors que ce module l'est et doit le rester (failures.test.ts). Un `import type` est efface a la
// compilation, il n'introduit donc aucune dependance a l'execution.
import type { SemanticTone } from '../theme/Theme';

/** Les familles d'echec, telles que le moteur les rend. */
export type UkitFailureKind = FailureKind;

/** Ce qu'un ecran a besoin de savoir, et rien de plus. */
export interface FailurePresentation {
    /**
     * Cle de traduction du **titre** affiche : ce qui s'est passe, en trois mots.
     *
     * Elle existe parce qu'un etat plein ecran sans titre est un aplat gris — un glyphe et une ligne
     * de texte secondaire, ce que l'application montrait jusqu'ici. Le titre porte le fait, le
     * message porte la consequence et le geste ; les deux niveaux de lecture valent plus qu'une
     * phrase unique qui essaie de tenir les deux.
     *
     * Elle est portee par la **famille**, comme le message : un ecran branche sur `UkitFailure` n'a
     * pas a savoir de quelle source vient l'echec. Les deux endroits qui la precisent sont les deux
     * qui precisent deja le message — `serviceAbsent` et la table de codes de la scolarite.
     */
    readonly titleKey: TranslationKey;
    /**
     * Le ton de l'echec, tel qu'un ecran le **colore**.
     *
     * Il porte la distinction qui fonde la Phase 6, et il la rend lisible avant les mots : ce qui est
     * **casse** est `danger`, ce qui est simplement **absent** est `neutral`. Un etablissement qui ne
     * publie pas d'emploi du temps n'est pas en panne, et le peindre en rouge dirait le contraire —
     * c'est exactement la confusion que la phase a passe sept jalons a supprimer.
     *
     * Le ton, et non la couleur : une table qui ne sait pas quel theme est actif n'a rien a faire d'un
     * hexadecimal (docs/theme.md, « un service rend un ton »).
     */
    readonly tone: SemanticTone;
    /**
     * Cle de traduction du message affiche.
     *
     * Typee `TranslationKey` : la presence de la cle dans les trois dictionnaires devient une
     * garantie du compilateur plutot qu'une ligne de checklist.
     */
    readonly messageKey: TranslationKey;
    /** Proposer un bouton Reessayer n'a de sens que si reessayer peut changer quelque chose. */
    readonly retryable: boolean;
    /** Ne rien afficher : l'utilisateur est deja parti, ou le run a ete remplace. */
    readonly silent: boolean;
}

/**
 * La table de correspondance.
 *
 * Trois distinctions valent d'etre lues avant d'etre « simplifiees » :
 *
 *   - `config` n'est pas `data`. Un secret absent du trousseau n'est pas une page qui a change : les
 *     deux appellent des ecrans opposes, l'un dit « on s'en occupe », l'autre « saisis tes
 *     identifiants ». C'est une campagne sur appareil qui a tranche, cote Aetherius.
 *   - `blocked` porte le nom que le Blueprint a donne a son echec (`fail:LOGIN_FAILED`). L'ecran
 *     branche dessus au lieu de deviner ; c'est le seul cas ou le message vient du fichier.
 *   - `rejected` est **non reessayable ici**, alors que le moteur le marque reessayable. L'ecart est
 *     voulu : le moteur parle d'un statut HTTP qui peut etre transitoire, UKit parle d'une source
 *     qui a change de contrat. Rejouer la meme requete redonnera la meme reponse, et un bouton
 *     Reessayer qui ne repare rien est pire qu'aucun bouton.
 */
export const FAILURE_PRESENTATION: Readonly<Record<UkitFailureKind, FailurePresentation>> = {
    // La source est en panne : la seule famille qu'il est utile de reessayer.
    unavailable: { tone: 'danger', titleKey: 'ERROR_SERVICE_UNAVAILABLE_TITLE', messageKey: 'ERROR_SERVICE_UNAVAILABLE', retryable: true, silent: false },
    // La source a repondu, mais pas comme `expect` ou `assert` l'exigeait : elle a change.
    rejected: { tone: 'danger', titleKey: 'ERROR_UNEXPECTED_RESPONSE_TITLE', messageKey: 'ERROR_UNEXPECTED_RESPONSE', retryable: false, silent: false },
    // La page ou la reponse n'est plus celle que le Blueprint decrit : fichier a corriger.
    data: { tone: 'danger', titleKey: 'ERROR_CONTENT_NOT_FOUND_TITLE', messageKey: 'ERROR_CONTENT_NOT_FOUND', retryable: false, silent: false },
    // Echec nomme par le Blueprint : le message du cas est affiche tel quel.
    blocked: { tone: 'danger', titleKey: 'ERROR_BLOCKED_TITLE', messageKey: 'ERROR_BLOCKED', retryable: false, silent: false },
    // Il manque une entree ou un secret : ce n'est pas une panne, c'est une demande a l'utilisateur.
    config: { tone: 'neutral', titleKey: 'ERROR_MISSING_CREDENTIALS_TITLE', messageKey: 'ERROR_MISSING_CREDENTIALS', retryable: false, silent: false },
    // Le fichier est faux ou non portable : ne pas reessayer, remonter.
    blueprint: { tone: 'danger', titleKey: 'ERROR_INTERNAL_TITLE', messageKey: 'ERROR_INTERNAL', retryable: false, silent: false },
    // L'utilisateur est parti.
    cancelled: { tone: 'neutral', titleKey: 'ERROR_INTERNAL_TITLE', messageKey: 'ERROR_INTERNAL', retryable: false, silent: true },
    // Une piece de plateforme manque : ne devrait jamais arriver en production.
    unsupported: { tone: 'danger', titleKey: 'ERROR_INTERNAL_TITLE', messageKey: 'ERROR_INTERNAL', retryable: false, silent: false },
    // Un bug : remonter, ne pas masquer.
    engine: { tone: 'danger', titleKey: 'ERROR_INTERNAL_TITLE', messageKey: 'ERROR_INTERNAL', retryable: false, silent: false },
};

/** Ce qu'un service rend a un ecran quand un run a echoue. */
export interface UkitFailure extends FailurePresentation {
    readonly kind: UkitFailureKind;
    /** Le code d'un echec nomme (`LOGIN_FAILED`), quand il y en a un. */
    readonly code?: string;
    /** Le message du moteur, journalise — jamais affiche tel quel sauf pour `blocked`. */
    readonly detail?: string;
}

/**
 * Traduit un echec de run en decision d'ecran.
 *
 * Accepte les deux canaux de sortie du moteur — un `Result` en echec ou une exception levee —
 * precisement pour qu'un service n'ait pas a savoir lequel a parle.
 *
 * Un sujet que le moteur ne reconnait pas comme un echec est range en `engine` : appeler cette
 * fonction sur un succes est un defaut d'appelant, et le taire rendrait un objet qui pretendrait
 * qu'il n'y a rien a signaler.
 */
export function describeUkitFailure(subject: unknown): UkitFailure {
    const failure = describeFailure(subject);
    if (failure === undefined) {
        return { kind: 'engine', detail: 'echec sans cause identifiable', ...FAILURE_PRESENTATION.engine };
    }

    return {
        kind: failure.kind,
        ...(failure.code !== undefined ? { code: failure.code } : {}),
        detail: failure.message,
        ...FAILURE_PRESENTATION[failure.kind],
    };
}

/**
 * Fabrique un echec que le moteur n'a pas leve.
 *
 * Un run peut reussir et rendre autre chose que ce que le service attendait — une sortie qui n'est
 * pas la liste promise, par exemple. C'est un Blueprint a corriger, et le dire vaut mieux que rendre
 * une liste vide qui passerait pour une absence de donnees.
 *
 * Un run peut aussi ne **jamais partir** : depuis le jalon 6-G, un etablissement peut ne pas publier
 * un service — pas de serveur d'emploi du temps interrogeable, pas de messagerie extractible. Le
 * `code` sert alors a ce que l'ecran nomme cette absence au lieu de la confondre avec une panne : les
 * deux appellent des mots differents, et c'est toute la difference entre « reviens plus tard » et
 * « ca n'existe pas ici ».
 *
 * Passer par ce constructeur plutot que d'ecrire l'objet au point d'appel : la table reste le seul
 * endroit qui decide de ce qu'un ecran fait d'une famille.
 */
export function ukitFailure(kind: UkitFailureKind, detail: string, code?: string): UkitFailure {
    return { kind, detail, ...(code !== undefined ? { code } : {}), ...FAILURE_PRESENTATION[kind] };
}

/**
 * L'echec d'un service que l'etablissement selectionne **ne publie pas** (jalon 6-G).
 *
 * C'est le seul echec de l'application qu'aucune famille du moteur ne decrit, et c'est normal :
 * aucun run n'est parti. Une fac sans messagerie extractible, une fac dont le serveur d'emplois du
 * temps n'est pas interrogeable — il n'y a rien en panne, il n'y a rien a joindre.
 *
 * `config` est la famille la moins fausse — ce n'est pas une panne, et ce n'est pas reessayable —
 * mais son message par defaut (« saisis tes identifiants ») serait un contresens. Le message est donc
 * donne par l'appelant, qui est le seul a savoir **quel** service manque : c'est la seule exception a
 * la regle « la table decide », et elle est bornee a ce constructeur.
 *
 * Le **titre** suit la meme logique et il est facultatif : sans lui, celui de la famille s'applique
 * (« Il manque une information »), ce qui reste juste mais generique. Les appelants qui savent nommer
 * l'absence — « Pas d'emploi du temps ici », « Un lien a coller » — le precisent.
 */
export function serviceAbsent(
    messageKey: TranslationKey,
    code: string,
    detail: string,
    titleKey: TranslationKey = FAILURE_PRESENTATION.config.titleKey,
): UkitFailure {
    return { kind: 'config', code, detail, titleKey, messageKey, tone: 'neutral', retryable: false, silent: false };
}

/**
 * Journalise un echec, sans le masquer.
 *
 * C'est le seul canal d'observation du modele d'erreur tant que les ecrans n'y sont pas branches
 * (jalon 6-A : la chaine est prouvee, l'experience ne change pas). La ligne nomme le Blueprint et
 * la famille, ce qui suffit a distinguer les chemins degrades les uns des autres sur un appareil.
 *
 * Les valeurs de secrets sont deja masquees par la facade quand elle rend l'echec : ce qui arrive
 * ici est publiable dans un journal.
 */
export function reportFailure(name: BlueprintName | PortailBlueprintName, failure: UkitFailure): void {
    const code = failure.code !== undefined ? ` [${failure.code}]` : '';
    console.warn(`[aetherius] ${name} : ${failure.kind}${code} — ${failure.detail ?? 'sans detail'}`);
}

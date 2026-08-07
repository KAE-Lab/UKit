/**
 * Le modele d'erreur : traduire un echec de run en ce qu'un ecran doit faire.
 *
 * C'est le vrai livrable du jalon 6-A, et le changement le plus structurant de la phase. Avant elle,
 * tous les services rendaient `null` ou `[]` en cas d'echec, et leur propre documentation le disait :
 * « une panne du fournisseur et une reponse legitimement vide sont indistinguables ». Un ecran
 * « aucun resultat » pouvait donc masquer une source morte.
 *
 * Le moteur leve des erreurs **typees** et ne decide pas a la place de l'application ; `describeFailure`
 * les range dans neuf familles. Ce fichier dit ce que chaque famille veut dire **pour un ecran de
 * UKit** : quel message, et si l'on propose de reessayer.
 *
 * Le pendant, qui est la moitie du sujet : **une liste vide n'est pas une erreur**. Un run reussi
 * dont les sorties portent une liste vide a reellement trouve une liste vide.
 *
 * Voir docs/blueprints.md et docs/phase-6/6-a-socle.md.
 */

/**
 * Les familles d'echec, telles que le moteur les rend.
 *
 * Reproduites ici pour que le squelette compile avant l'installation de la dependance ; le jalon 6-A
 * remplace cette union par le type `FailureKind` du paquet, pour qu'une famille ajoutee un jour
 * casse la compilation plutot que de tomber dans un cas par defaut.
 */
export type UkitFailureKind =
    | 'blueprint'
    | 'unavailable'
    | 'rejected'
    | 'blocked'
    | 'data'
    | 'config'
    | 'cancelled'
    | 'unsupported'
    | 'engine';

/** Ce qu'un ecran a besoin de savoir, et rien de plus. */
export interface FailurePresentation {
    /** Cle de traduction du message affiche. Les trois dictionnaires la portent. */
    readonly messageKey: string;
    /** Proposer un bouton Reessayer n'a de sens que si reessayer peut changer quelque chose. */
    readonly retryable: boolean;
    /** Ne rien afficher : l'utilisateur est deja parti, ou le run a ete remplace. */
    readonly silent: boolean;
}

/**
 * La table de correspondance.
 *
 * Deux distinctions valent d'etre lues avant d'etre « simplifiees » :
 *
 *   - `config` n'est pas `data`. Un secret absent du trousseau n'est pas une page qui a change : les
 *     deux appellent des ecrans opposes, l'un dit « on s'en occupe », l'autre « saisis tes
 *     identifiants ». C'est une campagne sur appareil qui a tranche, cote Aetherius.
 *   - `blocked` porte le nom que le Blueprint a donne a son echec (`fail:LOGIN_FAILED`). L'ecran
 *     branche dessus au lieu de deviner ; c'est le seul cas ou le message vient du fichier.
 */
export const FAILURE_PRESENTATION: Readonly<Record<UkitFailureKind, FailurePresentation>> = {
    // La source est en panne : la seule famille qu'il est utile de reessayer.
    unavailable: { messageKey: 'ERROR_SERVICE_UNAVAILABLE', retryable: true, silent: false },
    // La source a repondu, mais pas comme `expect` l'exigeait : elle a change.
    rejected: { messageKey: 'ERROR_UNEXPECTED_RESPONSE', retryable: false, silent: false },
    // La page ou la reponse n'est plus celle que le Blueprint decrit : fichier a corriger.
    data: { messageKey: 'ERROR_CONTENT_NOT_FOUND', retryable: false, silent: false },
    // Echec nomme par le Blueprint : le message du cas est affiche tel quel.
    blocked: { messageKey: 'ERROR_BLOCKED', retryable: false, silent: false },
    // Il manque une entree ou un secret : ce n'est pas une panne, c'est une demande a l'utilisateur.
    config: { messageKey: 'ERROR_MISSING_CREDENTIALS', retryable: false, silent: false },
    // Le fichier est faux ou non portable : ne pas reessayer, remonter.
    blueprint: { messageKey: 'ERROR_INTERNAL', retryable: false, silent: false },
    // L'utilisateur est parti.
    cancelled: { messageKey: 'ERROR_INTERNAL', retryable: false, silent: true },
    // Une piece de plateforme manque : ne devrait jamais arriver en production.
    unsupported: { messageKey: 'ERROR_INTERNAL', retryable: false, silent: false },
    // Un bug : remonter, ne pas masquer.
    engine: { messageKey: 'ERROR_INTERNAL', retryable: false, silent: false },
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
 * TODO(6-A) : deleguer a `describeFailure` de `@aetherius/react-native` des que la dependance est
 * installee. La table ci-dessus est le seul morceau qui restera propre a UKit.
 */
export function describeUkitFailure(_failure: unknown): UkitFailure {
    const presentation = FAILURE_PRESENTATION.engine;
    return { kind: 'engine', ...presentation };
}

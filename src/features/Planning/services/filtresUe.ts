/**
 * Les unites d'enseignement d'un cours, et le filtre qui les masque.
 *
 * Ce module existe parce qu'un cours peut porter **plusieurs** codes d'UE. Mesure le 2026-09-06 sur
 * Celcat : le groupe `MI601A` compte dix-neuf evenements a plusieurs modules sur l'annee 2025-2026 —
 * `4TTV417U Artificial intelligence || 4TTI607U Artificial Intelligence`, le meme cours sous son code
 * francais et son code anglais. Le filtre ne lisait que le premier : un etudiant inscrit a l'UE en
 * anglais qui masquait celle en francais perdait le TP commun. Un utilisateur l'a signale par mail le
 * 2026-09-06, et sa regle est celle qui est ecrite ici — **un cours reste tant qu'une seule de ses UE
 * n'est pas filtree**.
 *
 * Pur, sans dependance de plateforme : `CourseManager` (shared/services/AppCore) delegue ici, parce
 * que ce fichier-la charge React Native et n'est pas jouable sous Node.
 *
 * Voir docs/features/planning.md.
 */

import { separerCodeUE } from './PlanningAssembly';

/** Ce qu'il faut d'un cours pour en lire les UE : le sujet, les modules declares, et ou les deposer. */
export interface CoursAvecUE {
    subject?: string;
    /** Les intitules de matiere que la source declare (`4TIN602U Techn algorithmiques`), dans l'ordre. */
    modules?: string[];
    /** Le premier code d'UE, celui que la fiche affiche. `null` quand le cours n'en porte aucun. */
    UE?: string | null;
    /** Tous les codes d'UE du cours, sans doublon. Vide quand le cours n'en porte aucun. */
    ues?: string[];
}

/**
 * Les codes d'UE d'un cours, lus dans ses modules, ou dans son sujet a defaut.
 *
 * Le repli sur le sujet couvre les deux cas ou `modules` manque : l'export iCalendar, qui ne le
 * declare pas, et les caches ecrits avant que le champ existe. Le premier code est celui du sujet,
 * puisque le sujet **est** le premier module — c'est ce qui garde `UE` inchange pour la fiche.
 */
export function codesDUE(course: CoursAvecUE): string[] {
    const sources = course.modules !== undefined && course.modules.length > 0
        ? course.modules
        : course.subject !== undefined ? [course.subject] : [];

    const codes: string[] = [];
    for (const source of sources) {
        if (source === '' || source === 'N/C') continue;
        const separe = separerCodeUE(source);
        if (separe !== null && !codes.includes(separe.code)) codes.push(separe.code);
    }
    return codes;
}

/**
 * Pose `UE` et `ues` sur le cours, et retire le code du sujet. Mute en place, comme avant.
 *
 * Idempotent pour de vrai : un second passage rend le cours tel quel. L'ancienne version relisait le
 * sujet deja ampute et remettait `UE` a `null` — sans symptome tant qu'aucun chemin ne repassait
 * deux fois, ce que rien ne garantissait.
 */
export function poserLesUE<T extends CoursAvecUE>(course: T): T {
    if (course.ues !== undefined) return course;

    course.ues = codesDUE(course);
    course.UE = course.ues[0] ?? null;

    if (course.subject && course.subject !== 'N/C') {
        // La regle vit dans `PlanningAssembly`, avec le tri qui l'applique deja : deux copies
        // d'une meme expression, c'est une occasion de n'en corriger qu'une (jalon 6-I).
        const separe = separerCodeUE(course.subject);
        if (separe !== null) course.subject = separe.reste;
    }
    return course;
}

/**
 * Un cours est masque quand **toutes** ses UE sont filtrees. Un cours sans UE ne l'est jamais.
 *
 * La comparaison est verbatim, comme avant : les codes viennent de la source telle quelle, et un
 * filtre s'ecrit avec le code du planning (PropositionsDecision.ts).
 */
export function estMasque(course: CoursAvecUE, filtres: readonly string[]): boolean {
    const codes = course.ues ?? codesDUE(course);
    return codes.length > 0 && codes.every((code) => filtres.includes(code));
}

/**
 * Ce que les ecrans affichent d'une liste de cours : les UE posees, puis le filtre.
 *
 * Le filtre ne s'applique **qu'au planning des favoris** : consulter le planning d'un autre groupe
 * montre tout, volontairement — les filtres decrivent ses UE, pas celles d'autrui. `filtres` accepte
 * `unknown` parce que les ecrans le lisent d'une prop facultative.
 */
export function preparerPourAffichage<T extends CoursAvecUE>(
    cours: readonly T[],
    isFavorite: boolean,
    filtres: unknown,
): T[] {
    const liste = Array.isArray(filtres) ? filtres.filter((f): f is string => typeof f === 'string') : [];
    const prepares = cours.map(poserLesUE);
    if (!isFavorite || liste.length === 0) return prepares;
    return prepares.filter((course) => !estMasque(course, liste));
}

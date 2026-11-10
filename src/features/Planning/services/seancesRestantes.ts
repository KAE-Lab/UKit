/**
 * Combien de seances du meme enseignement restent apres celle-ci dans le semestre (lot 2).
 *
 * Le compte se fait sur l'annee des favoris deja lue (`anneeDesFavoris`), sans requete de plus. La
 * regle qui le gouverne : **un chiffre faux est pire qu'une absence**. Le module rend donc `null` des
 * qu'il ne peut pas compter juste, et la fiche se tait.
 *
 * ## Ce que « le meme enseignement » veut dire, mesure le 2026-11-10 sur Celcat
 *
 * L'annee 2026-2027 du groupe `INF501A1` (356 evenements) a montre trois choses :
 *
 *   - **les codes d'UE et le type ne suffisent pas.** Le planning d'un groupe porte aussi les creneaux
 *     de ses sous-groupes : `4TIN511U` en `Cours/TD` a quatre series, deux le jeudi a 11 h et deux le
 *     vendredi a 8 h (« groupe 3 », « groupe 4 » en texte libre). Un etudiant n'en suit qu'une ; compter
 *     tous les creneaux aurait double le chiffre ;
 *   - **l'identifiant Celcat nomme la serie.** Il s'ecrit `<prefixe>:<evenement>:<occurrence>`, et
 *     toutes les occurrences d'un meme creneau hebdomadaire partagent `<evenement>` (95 series pour
 *     316 evenements). C'est la seule donnee qui rattache une seance a celles de son sous-groupe ;
 *   - **des seances paralleles tombent au meme instant** : l'anglais `4TTV523U` sert trois series le
 *     jeudi a 9 h 30, une par enseignant. Elles ne font qu'une seance pour qui les suit, d'ou le compte
 *     par instants distincts.
 *
 * D'ou la regle : on compte les instants restants de **la serie de cette seance**, et l'on se tait si
 * une autre seance du meme enseignement (memes codes, meme type) tombe d'ici la fin du semestre a un
 * instant que la serie n'occupe pas. Ce peut etre un rattrapage pour tous, ou le creneau d'un autre
 * sous-groupe : rien ne permet de le savoir, et c'est exactement le cas ou l'on ne compte pas.
 *
 * Un export iCalendar (ADE, ou un lien colle qui en a la forme) n'a pas d'identifiant de serie lisible.
 * Sa description, elle, est structuree : le code de module, puis les groupes et l'enseignant
 * (IcsMapping.ts). La serie y est donc le texte qui suit le code de module, salle exclue — memes groupes,
 * meme enseignant —, et l'enseignement, le code de module et le type. Un lien d'une autre forme n'a
 * pas de code de module : rien ne s'affiche.
 *
 * **Sauf l'abonnement PRONOTE** (lot 3, IUT de Bordeaux). Sa description nomme la matiere et le type
 * (IcsMapping.ts, « champs nommes ») : le cours en porte un, sans code de module. Et ce lien est
 * l'emploi du temps **personnel** de l'etudiant — PRONOTE n'exporte que celui de la personne connectee
 * —, donc il ne porte aucun creneau d'un autre sous-groupe : chaque seance de la meme matiere et du meme
 * type est la sienne. L'enseignement y est la matiere et le type, et la serie se confond avec lui. Un
 * lien colle d'une autre forme n'a ni code de module ni type (`typeDuCours` rend `''`) : il se tait
 * toujours.
 *
 * ## Le semestre
 *
 * Le decoupage de l'accueil (`semestreDe`, Onboarding/hooks/semestres.ts) : l'automne d'aout a janvier,
 * le printemps de fevrier a juillet. Une seance du meme enseignement qui tombe au-dela fait taire le
 * compte plutot que de l'arreter a la borne : un cours de printemps qui commence mi-janvier aurait
 * sinon dit « derniere seance » fin janvier.
 *
 * Pur, sans dependance de plateforme : seancesRestantes.test.ts. Voir docs/features/planning.md.
 */

import { codesDUE, estMasque, type CoursAvecUE } from './filtresUe';
import { rangDuCodeDeModule } from './IcsMapping';

/** Les sources qui se comptent : celles qui servent une annee. Le reste (aucune, lien attendu) n'en a pas. */
export type SourceDuCompte = 'celcat' | 'ical' | 'abonnement';

/** Ce qu'il faut d'un cours de l'annee pour le compter. Un `PlanningEvent` en est un. */
export interface CoursCompte extends CoursAvecUE {
    readonly id: string;
    readonly category: string;
    readonly description: string;
    readonly date: { readonly start: string; readonly end: string };
}

export interface DemandeDeCompte {
    /** La seance de la fiche : retrouvee dans l'annee par son identifiant et son debut. */
    readonly cours: { readonly id?: string; readonly date: { readonly start: string } };
    readonly annee: readonly CoursCompte[];
    readonly source: SourceDuCompte;
    /** Les filtres d'UE des favoris : une seance masquee n'est pas a l'etudiant. */
    readonly filtres: readonly string[];
    /** L'instant courant, en millisecondes, recu de l'appelant (Temps.maintenantMs). */
    readonly maintenant: number;
}

/** Le premier instant du semestre suivant celui de cet instant, au decoupage de `semestreDe`. */
export function finDuSemestre(instant: number): number {
    const date = new Date(instant);
    const annee = date.getFullYear();
    const mois = date.getMonth();
    if (mois >= 1 && mois <= 6) return new Date(annee, 7, 1).getTime();
    return new Date(mois === 0 ? annee : annee + 1, 1, 1).getTime();
}

function lignesDe(description: string): string[] {
    return description.split('\n').map((ligne) => ligne.trim());
}

/** L'enseignement d'un cours : ses codes d'UE et son type chez Celcat, son code de module et son type ailleurs. */
export function enseignementDe(cours: CoursCompte, source: SourceDuCompte): string | null {
    const type = cours.category.trim();
    if (type === '') return null;
    if (source === 'celcat') {
        const codes = codesDUE(cours);
        return codes.length === 0 ? null : `${[...codes].sort().join('+')}|${type}`;
    }
    const lignes = lignesDe(cours.description);
    const rang = rangDuCodeDeModule(lignes);
    if (rang >= 0) return `${lignes[rang].split(',')[0].trim()}|${type}`;
    // Un type sans code de module : seule la projection PRONOTE en produit un (voir l'en-tete).
    const matiere = (cours.subject ?? '').trim();
    return source === 'abonnement' && matiere !== '' ? `${matiere}|${type}` : null;
}

/** La serie d'un cours : l'evenement Celcat de son identifiant, ou la description qui suit le code de module. */
export function serieDe(cours: CoursCompte, source: SourceDuCompte): string | null {
    if (source === 'celcat') {
        const morceaux = /^(.+):(\d+):(\d+)$/.exec(cours.id);
        return morceaux === null ? null : `${morceaux[1]}:${morceaux[2]}`;
    }
    const lignes = lignesDe(cours.description);
    const rang = rangDuCodeDeModule(lignes);
    if (rang >= 0) return lignes.slice(rang).join('\n');
    // L'abonnement PRONOTE est personnel : toutes ses seances d'un enseignement sont une seule serie.
    return source === 'abonnement' ? enseignementDe(cours, source) : null;
}

function instantDe(cours: { readonly date: { readonly start: string } }): number {
    return Date.parse(cours.date.start);
}

/** La seance de la fiche, retrouvee dans l'annee, a venir ou en cours, et visible ; `null` sinon. */
function seanceAVenir(demande: DemandeDeCompte): CoursCompte | null {
    const debut = instantDe(demande.cours);
    if (demande.cours.id === undefined || !Number.isFinite(debut)) return null;
    const ici = demande.annee.find((cours) => cours.id === demande.cours.id && instantDe(cours) === debut);
    if (ici === undefined || estMasque(ici, demande.filtres)) return null;
    const finIci = Date.parse(ici.date.end);
    return Number.isFinite(finIci) && finIci > demande.maintenant ? ici : null;
}

/**
 * Le nombre de seances de la meme serie apres celle-ci dans le semestre — `0` pour la derniere —, ou
 * `null` quand le compte ne serait pas sur.
 *
 * Se tait aussi pour une seance terminee : « il reste » se lit au present, et une fiche ouverte sur un
 * jour passe aurait annonce les seances deja faites depuis.
 */
export function seancesRestantes(demande: DemandeDeCompte): number | null {
    const ici = seanceAVenir(demande);
    if (ici === null) return null;
    const enseignement = enseignementDe(ici, demande.source);
    const serie = serieDe(ici, demande.source);
    if (enseignement === null || serie === null) return null;

    const debut = instantDe(ici);
    const borne = finDuSemestre(debut);
    // Un lien colle rend ce que son site publie, parfois quatre semaines (`nbWeeks` d'ADE) : sans
    // evenement au-dela de la borne, rien ne dit que le semestre est entier. Celcat et ADE sont lus
    // sur l'annee scolaire demandee, qui la couvre toujours.
    if (demande.source === 'abonnement' && !demande.annee.some((cours) => instantDe(cours) >= borne)) return null;

    const instantsDeLaSerie = new Set<number>();
    const instantsAutres = new Set<number>();
    for (const cours of demande.annee) {
        const instant = instantDe(cours);
        if (!(instant > debut) || estMasque(cours, demande.filtres)) continue;
        if (enseignementDe(cours, demande.source) !== enseignement) continue;
        if (instant >= borne) return null;
        (serieDe(cours, demande.source) === serie ? instantsDeLaSerie : instantsAutres).add(instant);
    }

    // Une autre serie au meme instant qu'une seance de la sienne est une seance parallele : elle ne
    // change rien. A un autre instant, c'est un rattrapage ou un autre sous-groupe, et l'on se tait.
    return [...instantsAutres].every((instant) => instantsDeLaSerie.has(instant)) ? instantsDeLaSerie.size : null;
}

/** Les cles de traduction du compte, et leurs arguments dans l'ordre des `$-`. */
export type CleDuCompte =
    | 'SESSIONS_LEFT' | 'SESSIONS_LEFT_ELISION'
    | 'SESSIONS_LEFT_ONE' | 'SESSIONS_LEFT_ONE_ELISION'
    | 'SESSIONS_LAST' | 'SESSIONS_LAST_ELISION';

/**
 * La phrase du compte : la derniere, une, ou plusieurs. Le type est celui de la source, tel quel
 * (`TD`, `TD Machine`, `Cours/TD`, `Examen TD Machine`) : la phrase dit « seances de TD » plutot que
 * « 3 TD », parce que « 2 Soutenance » ou « 2 Examen » ne s'accordent pas. Le francais elide devant
 * une voyelle ou un h (« seances d'Examen ») ; l'anglais et l'espagnol portent les memes cles, au
 * meme texte.
 */
export function phraseDuCompte(restantes: number, type: string): { cle: CleDuCompte; args: (string | number)[] } {
    const elision: '' | '_ELISION' = /^[aeiouyhàâäéèêëîïôöùûü]/i.test(type.trim()) ? '_ELISION' : '';
    const nom = type.trim();
    if (restantes === 0) return { cle: `SESSIONS_LAST${elision}`, args: [nom] };
    if (restantes === 1) return { cle: `SESSIONS_LEFT_ONE${elision}`, args: [nom] };
    return { cle: `SESSIONS_LEFT${elision}`, args: [restantes, nom] };
}

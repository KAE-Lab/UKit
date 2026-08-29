/**
 * Ce que la page dit en haut, et **quand** elle le dit.
 *
 * La salutation etait deux lignes dans un composant : `heures < 19 ? 'Bonjour' : 'Bonsoir'`, en dur,
 * hors de `Translator`, avec les jours et les mois de la date ecrits en francais dans le fichier —
 * un defaut que `docs/defauts-fonctionnels.md` portait ouvert. Elle devient une **regle**, et il y en
 * a une table.
 *
 * ## Le vocabulaire de conditions est ferme, et c'est ce qui le rend publiable
 *
 * Une regle declare zero, une ou plusieurs conditions ; elles s'appliquent **toutes** (un ET). Une
 * regle sans condition est un repli qui vaut toujours — utile pour un message qu'on veut poser sur
 * une periode entiere.
 *
 *   | condition       | forme                        | exemple |
 *   |-----------------|------------------------------|---------|
 *   | `heures`        | `{ de, a }`, 0–23, `a` exclu | la nuit : `{ de: 22, a: 5 }` (elle passe minuit) |
 *   | `jours`         | `[0..6]`, 0 = dimanche       | le week-end : `[0, 6]` |
 *   | `plage`         | `{ du, au }` en `MM-JJ`      | Noel : `{ du: "12-20", au: "01-05" }` (elle passe l'an) |
 *   | `anniversaire`  | `true`                       | le jour dit |
 *
 * **Les deux intervalles savent boucler**, et ce n'est pas un raffinement : une nuit qui commence a
 * 22 h et des vacances qui passent le 31 decembre sont les deux cas ou une comparaison naive rend
 * faux tous les jours ou l'on aurait justement voulu dire quelque chose.
 *
 * ## Pourquoi une table, et pourquoi elle est publiable
 *
 * C'est la these de la Phase 6 appliquee a une phrase : *une source qui change se corrige par une
 * publication, pas par une release*. Poser un mot pour la rentree, ou pour un jour de greve, ne doit
 * pas demander de passer par un magasin d'applications. Le socle embarque reste la reference — une
 * application doit fonctionner au premier lancement, hors ligne — et le distant ne fait que
 * l'etendre.
 *
 * **La priorite tranche, et le socle est volontairement bas.** Une regle publiee a la meme priorite
 * qu'une regle embarquee gagne, parce qu'elle est arrivee apres et qu'on a voulu l'ecrire. Voir
 * `choisirSalutation`.
 */

import type { TranslationKey } from '../../../shared/i18n/Translator';

export interface ConditionSalutation {
    /** Heures `[de, a[`, 0–23. Si `de > a`, l'intervalle **passe minuit**. */
    readonly heures?: { readonly de: number; readonly a: number };
    /** Jours de la semaine, 0 = dimanche. */
    readonly jours?: readonly number[];
    /** Dates `MM-JJ` incluses. Si `du > au`, la plage **passe l'an**. */
    readonly plage?: { readonly du: string; readonly au: string };
    /** Le jour d'anniversaire de l'etudiant, quand le dossier porte sa date de naissance. */
    readonly anniversaire?: true;
}

export interface RegleSalutation {
    readonly id: string;
    readonly priorite: number;
    readonly condition: ConditionSalutation;
    /** Le texte embarque passe par `Translator` ; celui qui vient de la base est deja traduit. */
    readonly cle?: TranslationKey;
    readonly texte?: string;
}

/** Ce que l'evaluation regarde. Tout est fourni : ce module ne lit ni l'heure ni le trousseau. */
export interface ContexteSalutation {
    readonly maintenant: Date;
    /** La date de naissance telle que le dossier la rend : `JJ/MM/AAAA`. */
    readonly naissance?: string | null;
}

function dansLesHeures(heures: ConditionSalutation['heures'], maintenant: Date): boolean {
    if (heures === undefined) return true;

    const h = maintenant.getHours();
    // `de > a` : l'intervalle passe minuit. « 22 h a 5 h » doit etre vrai a 23 h **et** a 2 h, ce
    // qu'une comparaison encadree rendrait faux aux deux.
    return heures.de <= heures.a ? h >= heures.de && h < heures.a : h >= heures.de || h < heures.a;
}

function dansLesJours(jours: ConditionSalutation['jours'], maintenant: Date): boolean {
    return jours === undefined || jours.includes(maintenant.getDay());
}

/** `MM-JJ` du jour, comparable a l'octet pres puisque les deux champs sont a largeur fixe. */
function jourDeLAnnee(maintenant: Date): string {
    const mois = `${maintenant.getMonth() + 1}`.padStart(2, '0');
    const jour = `${maintenant.getDate()}`.padStart(2, '0');
    return `${mois}-${jour}`;
}

function dansLaPlage(plage: ConditionSalutation['plage'], maintenant: Date): boolean {
    if (plage === undefined) return true;

    const aujourdhui = jourDeLAnnee(maintenant);
    // Meme regle que les heures, a l'echelle de l'annee : une plage de Noel commence en decembre et
    // finit en janvier, donc `du > au`.
    return plage.du <= plage.au
        ? aujourdhui >= plage.du && aujourdhui <= plage.au
        : aujourdhui >= plage.du || aujourdhui <= plage.au;
}

/**
 * Le jour d'anniversaire.
 *
 * La date arrive au format du dossier, `JJ/MM/AAAA`. Une date illisible rend `false` plutot que de
 * deviner : souhaiter un anniversaire le mauvais jour est pire que ne rien souhaiter.
 */
function estLAnniversaire(naissance: string | null | undefined, maintenant: Date): boolean {
    if (typeof naissance !== 'string') return false;

    const [jour, mois] = naissance.split('/');
    const j = Number.parseInt(jour, 10);
    const m = Number.parseInt(mois, 10);
    if (!Number.isFinite(j) || !Number.isFinite(m)) return false;

    return j === maintenant.getDate() && m === maintenant.getMonth() + 1;
}

/** Toutes les conditions declarees sont-elles vraies ? Une regle sans condition l'est toujours. */
export function regleApplicable(regle: RegleSalutation, contexte: ContexteSalutation): boolean {
    const { condition } = regle;
    if (condition.anniversaire === true && !estLAnniversaire(contexte.naissance, contexte.maintenant)) {
        return false;
    }
    return dansLesHeures(condition.heures, contexte.maintenant)
        && dansLesJours(condition.jours, contexte.maintenant)
        && dansLaPlage(condition.plage, contexte.maintenant);
}

/**
 * La regle qui gagne, ou `null` si aucune ne s'applique.
 *
 * **A priorite egale, la derniere de la liste gagne**, et l'ordre d'assemblage met le distant apres
 * le socle : une regle publiee l'emporte donc sur une regle embarquee de meme rang. C'est ce qu'on
 * veut — elle est arrivee apres, et quelqu'un a voulu l'ecrire.
 */
export function choisirSalutation(
    regles: readonly RegleSalutation[],
    contexte: ContexteSalutation,
): RegleSalutation | null {
    let gagnante: RegleSalutation | null = null;
    for (const regle of regles) {
        if (!regleApplicable(regle, contexte)) continue;
        if (gagnante === null || regle.priorite >= gagnante.priorite) gagnante = regle;
    }
    return gagnante;
}

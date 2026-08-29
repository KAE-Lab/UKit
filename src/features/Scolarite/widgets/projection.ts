/**
 * Les sorties d'un Blueprint de widget, projetees sur ce qu'une rangee affiche.
 *
 * Pur, donc jouable sous vitest — la regle du depot pour tout ce qui decide d'une donnee affichee.
 *
 * **Le contrat de sortie est le meme pour tous les widgets**, et c'est ce qui fait qu'ajouter un
 * widget ne touche pas ce fichier :
 *
 *   | sortie   | role |
 *   |----------|------|
 *   | `repere` | la **preuve** que la lecture a eu lieu : un texte qu'on a bien trouve |
 *   | `nombre` | le compteur, quand la source en donne un |
 *   | `detail` | la ligne de contexte : le premier element nomme, s'il y en a un |
 *
 * `repere` n'est pas une redondance de `nombre`, et c'est la decision centrale de ce fichier. Sans
 * lui, « la boite existe et n'a aucun message non lu » et « la lecture n'a rien trouve » rendraient
 * tous les deux l'absence de nombre, et la rangee afficherait « aucun message » sur une panne. Le
 * distinguo vient de la messagerie de Bordeaux — dont le libelle perd sa parenthese a zero non lu —
 * et il vaut pour toutes les sources : une liste vide est une reponse, une lecture ratee n'en est
 * pas une.
 */

/** Ce qu'une rangee de widget affiche, une fois la source lue. */
export interface ValeurWidget {
    /** Le compteur. `null` veut dire « on ne sait pas », jamais « zero ». */
    readonly nombre: number | null;
    /** La ligne de contexte, quand la source nomme un premier element. */
    readonly detail: string | null;
    /** Quand la lecture a eu lieu, en ISO. Pose par l'appelant : l'heure ne se lit pas ici. */
    readonly luLe: string;
}

function texte(valeur: unknown): string {
    return typeof valeur === 'string' ? valeur.trim() : '';
}

/**
 * Le premier texte utile d'une sortie qui peut etre une chaine, une liste, ou rien.
 *
 * Les lectures facultatives descendent en `as: "list"` — qui rend `[]` et ne leve jamais — la ou les
 * lectures obligatoires descendent en `as: "text"`. Normaliser ici evite d'imposer a un portail la
 * fragilite de l'autre, exactement comme `premierTexte` le fait pour l'INE cote dossier.
 */
function premierTexte(valeur: unknown): string {
    if (Array.isArray(valeur)) {
        for (const element of valeur) {
            const lu = texte(element);
            if (lu !== '') return lu;
        }
        return '';
    }
    return texte(valeur);
}

/**
 * La valeur d'un widget, depuis les sorties de son Blueprint.
 *
 * Trois cas, et le troisieme est celui qu'on ne veut pas confondre avec le deuxieme :
 *
 *   - un nombre lu            -> ce nombre ;
 *   - un repere sans nombre   -> `0` : la source a repondu, elle n'a rien a signaler ;
 *   - pas de repere du tout   -> `null`, c'est-a-dire « on ne sait pas ».
 */
export function projeterWidget(
    outputs: Readonly<Record<string, unknown>>,
    luLe: string,
): ValeurWidget {
    const nombre = outputs.nombre;
    const detail = premierTexte(outputs.detail);

    const compte = typeof nombre === 'number' && Number.isFinite(nombre)
        ? nombre
        : (premierTexte(outputs.repere) === '' ? null : 0);

    return { nombre: compte, detail: detail === '' ? null : detail, luLe };
}

/** Une valeur est-elle assez fraiche pour qu'on epargne un run au moteur ? */
export function valeurFraiche(
    valeur: ValeurWidget | undefined,
    peremptionMin: number,
    maintenant: number,
): boolean {
    if (valeur === undefined) return false;

    const lu = Date.parse(valeur.luLe);
    if (!Number.isFinite(lu)) return false;

    // Une lecture datee du futur est une horloge qui a recule — on la traite comme perimee plutot
    // que comme eternellement fraiche, sans quoi le widget cesserait de se rafraichir pour de bon.
    const age = maintenant - lu;
    return age >= 0 && age < peremptionMin * 60_000;
}

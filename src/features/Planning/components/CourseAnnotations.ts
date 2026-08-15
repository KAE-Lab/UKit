/**
 * Quelle icone accompagne une ligne de description de cours.
 *
 * C'etait une regle **positionnelle** jusqu'au jalon 6-I — la premiere ligne un groupe, la deuxieme
 * un enseignant, la troisieme une salle — recopiee a l'identique dans la carte et dans la fiche. Elle
 * tenait tant que Celcat etait la seule source, parce que ce serveur sert toujours ses lignes dans
 * cet ordre. Avec un export iCalendar elle designe n'importe quoi : mesure sur appareil le
 * 2026-08-15, la salle `CD-O204` portait l'icone « groupe » et le type `TD` portait l'icone « lieu ».
 *
 * La regle est donc devenue une lecture du **contenu**, et elle n'a plus aucune notion de rang. La
 * salle se reconnait par le referentiel des lieux lui-meme — c'est-a-dire par la donnee
 * d'etablissement que ce jalon a introduite —, ce qui est plus sur que n'importe quel mot-cle : une
 * ligne qui designe un batiment connu **est** une ligne de salle.
 *
 * Les descriptions bordelaises rendent exactement les memes icones qu'avant, et un test le verrouille.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-i-planning-universel.md.
 */

import { getLocations } from '../../../shared/locations/salles';

export type IconeAnnotation = 'info-outline' | 'date-range' | 'room' | 'group' | 'person';

/** Une enumeration de semaines : `3,5-7,9-11,13-14`, ou `Semaines : 3-7`. */
const SEMAINES = /^([sS]emaines?\s*:?\s*)?[\d\s,\-]+$/;

/**
 * Un code de module : `COG7-CILAN`, `EMU9-EANGL`, `JPB1-OPTIQ`, `ESE7-INFS2`.
 *
 * Trois lettres, un chiffre, un tiret, cinq caracteres — **exactement** la forme mesuree, et pas une
 * approximation. Un motif plus large (`[A-Z]{2,4}\d?-[A-Z0-9]{3,8}`) attrape aussi les codes de
 * salle de l'INP, `CD-O204` en tete, et une salle prise pour un module reperd l'icone qu'on vient de
 * corriger.
 *
 * Present dans les descriptions iCalendar, absent de celles de Celcat — la ou le code d'UE vit dans
 * le titre du cours et non dans sa description.
 */
const CODE_MODULE = /^[A-Z]{3}\d-[A-Z0-9]{5}$/;

/**
 * Un nom d'enseignant : un patronyme en capitales, puis un prenom capitalise.
 *
 * `GAVOILLE Cyril` chez Celcat, `FARRELL Flora` chez ADE — les deux sources ecrivent la meme forme,
 * et c'est ce qui permet de la reconnaitre sans savoir de laquelle on vient.
 */
const ENSEIGNANT = /^[A-ZÀ-Ý][A-ZÀ-Ý'\- ]+\s+[A-ZÀ-Ý][a-zà-ÿ]/;

/** Les mots qui trahissent une salle quand le referentiel ne la connait pas. */
function nommeUnLieu(ligne: string): boolean {
    const bas = ligne.toLowerCase();
    return (
        bas.includes('salle') ||
        bas.includes('bât') ||
        bas.includes('bat') ||
        bas.includes('amphi') ||
        bas.includes('cremi')
    );
}

/**
 * L'icone d'une ligne, deduite de ce qu'elle **dit**.
 *
 * L'ordre des tests compte, et il a ete corrige par un test plutot que devine :
 *
 *   1. une enumeration de semaines, qui ne ressemble a rien d'autre ;
 *   2. le **code de module**, avant la salle — le motif de salle d'un etablissement peut le
 *      reconnaitre par accident. Celui de Bordeaux, `([A-Z][0-9]+)`, trouve `B1` dans `JPB1-OPTIQ`,
 *      et `B1` est un vrai batiment bordelais : la ligne aurait porte l'icone d'un lieu ;
 *   3. la salle, verifiee contre le referentiel lui-meme — c'est la seule forme qu'on sache confirmer
 *      contre une donnee plutot que contre une expression ;
 *   4. l'enseignant ;
 *   5. le groupe en repli, qui est ce que la source dit le plus souvent quand elle ne dit rien de
 *      particulier.
 */
export function iconeDAnnotation(ligne: string): IconeAnnotation {
    const texte = ligne.trim();
    if (texte === '') return 'info-outline';

    if (SEMAINES.test(texte)) return 'date-range';
    if (CODE_MODULE.test(texte)) return 'info-outline';
    if (getLocations(texte).length > 0 || nommeUnLieu(texte)) return 'room';
    if (ENSEIGNANT.test(texte)) return 'person';
    return 'group';
}

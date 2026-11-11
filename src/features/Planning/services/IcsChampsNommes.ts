/**
 * Les descriptions **a champs nommes** de PRONOTE Campus, lues par leur cle.
 *
 * Sorti d'IcsMapping.ts, qui garde la projection d'ADE et l'assemblage : ce module ne connait ni
 * `ical.js` ni le contrat de l'emploi du temps, il recoit les lignes deja decoupees. Mesures sur les
 * exports d'abonnement de l'IUT de Bordeaux (2026-11-10) et de Bordeaux Montaigne (2026-11-11) ; ses
 * cas sont dans IcsMapping.test.ts, qui les joue par la projection entiere.
 *
 * Voir docs/features/planning.md.
 */

import type { NatureDeLigne } from './PlanningAssembly';

/**
 * Une ligne de description **a champ nomme** : `Matière : R5.03 Animation de réunion`.
 *
 * C'est la forme de PRONOTE Campus, mesuree le 2026-11-10 sur l'export d'abonnement de l'IUT de
 * Bordeaux : chaque ligne porte sa cle — `Matière`, `Type`, `Salle` ou `Salles`, `Enseignant` ou
 * `Enseignants`, `Mémo` —, la ou ADE sert des valeurs nues dans un ordre a deviner. Le `SUMMARY`, lui,
 * empile tout (« Matiere - Type - Enseignants - Memo ») : c'est le defaut « intitules d'un iCalendar
 * colle » du registre, constate chez Bordeaux Montaigne, meme produit.
 *
 * La cle va jusqu'a soixante caracteres et la valeur peut manquer : l'export de Bordeaux Montaigne
 * (2026-11-11) ecrit ses annulations en cle seule, `Rattrapage (Annulation du ven. 09/10/2026 10h00) :`,
 * et une seule de ces lignes faisait retomber tout le cours sur l'intitule empile, enseignant en titre.
 */
const CHAMP_NOMME = /^([^:]{2,60}?)\s+:(?:\s+(.*))?$/;

/** Les champs qu'une description nommee porte, lus par leur cle et non par leur rang. */
export interface ChampsNommes {
    readonly matiere: string;
    readonly type: string;
    /** La cle telle que la source l'ecrit (`Salle`, `Salles`) et sa valeur. */
    readonly salle: { readonly cle: string; readonly valeur: string } | null;
    readonly enseignants: readonly string[];
    /** Le reste, cle comprise : on l'affiche sans savoir l'interpreter (`Mémo : DS R5.real.09`). */
    readonly autres: readonly string[];
}

/** Une valeur de PRONOTE sans ses doubles espaces : `203  BUT3B` s'affiche `203 BUT3B`. */
function resserrer(valeur: string): string {
    return valeur.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Une valeur nommee telle qu'elle s'affiche : resserree, sans le tiret qui l'ouvre, et, si c'est une
 * liste de codes, chaque code une seule fois.
 *
 * Mesure sur l'export de Bordeaux Montaigne (2026-11-11) : un CM ecrit son groupe `CM01` autant de fois
 * qu'il y a de groupes de TD reunis — trente-neuf —, et une note de deplacement commence par un tiret
 * (`Cours deplace :  - Rattrapage le jeu. 07/01/2027`). Le dedoublonnage ne vaut que pour une liste de
 * jetons sans espace : un memo `Coef 1,5` n'est pas une liste, et `-2 points` garde son signe (relecture
 * du lot). L'ordre des elements est garde.
 */
function valeurNommee(valeur: string): string {
    const propre = resserrer(valeur).replace(/^-\s+/, '');
    const elements = propre.split(',').map((element) => element.trim());
    const listeDeCodes = elements.length > 1 && elements.every((element) => element !== '' && !/\s/.test(element));
    return listeDeCodes ? [...new Set(elements)].join(', ') : propre;
}

/**
 * Les champs d'une description nommee, ou `null` si elle n'en est pas une.
 *
 * **Toutes** les lignes non vides doivent avoir une cle, et la matiere doit etre la : une description
 * ADE dont une ligne contiendrait un deux-points par hasard ne bascule pas. Hors de cette forme, rien ne
 * change — la projection d'ADE est celle que Bordeaux INP joue depuis 6-I.
 */
export function champsNommes(lignesDecoupees: readonly string[]): ChampsNommes | null {
    const lignes = lignesDecoupees.filter((ligne) => ligne !== '');
    if (lignes.length === 0) return null;

    const paires: [string, string][] = [];
    for (const ligne of lignes) {
        const morceaux = CHAMP_NOMME.exec(ligne);
        if (morceaux === null) return null;
        paires.push([morceaux[1].trim(), (morceaux[2] ?? '').trim()]);
    }

    const valeur = (...cles: string[]): string => paires.find(([cle]) => cles.includes(cle))?.[1] ?? '';
    const matiere = valeur('Matière');
    if (matiere === '') return null;

    const salle = paires.find(([cle]) => cle === 'Salle' || cle === 'Salles');
    return {
        matiere,
        type: valeur('Type'),
        // Une salle nommee mais vide ne fait pas de ligne : « Salle » seul poserait une epingle sur rien.
        salle: salle === undefined || valeurNommee(salle[1]) === '' ? null : { cle: salle[0], valeur: valeurNommee(salle[1]) },
        enseignants: [...new Set(valeur('Enseignant', 'Enseignants').split(',').map(resserrer))].filter((nom) => nom !== ''),
        // Une cle sans valeur se dit seule : `Rattrapage (Annulation du …)` porte tout son sens dans
        // la cle, et un deux-points final s'y lisait comme une valeur oubliee.
        autres: paires
            .filter(([cle]) => !['Matière', 'Type', 'Salle', 'Salles', 'Enseignant', 'Enseignants'].includes(cle))
            .map(([cle, texte]) => (valeurNommee(texte) === '' ? cle : `${cle} : ${valeurNommee(texte)}`)),
    };
}

/**
 * Le type d'une description nommee, sans sa duree : `TD_2h` → `TD`, `Cours_2h` → `Cours`.
 *
 * La pastille et le compte des seances parlent d'un **type** ; la duree se lit deja sur le creneau, et
 * `TD_2h` et `TD_4h` sont le meme enseignement.
 */
export function typeNomme(type: string): string {
    return type.split('_')[0].trim();
}

/**
 * La ligne de salle d'une description nommee : la valeur, precedee du mot de la source quand elle ne
 * nomme pas deja un lieu.
 *
 * `203 BUT3B` ne dit pas qu'il s'agit d'une salle, et la fiche reconnait une salle a son contenu
 * (CourseAnnotations.ts) — sans referentiel de lieux, comme a l'IUT, elle aurait pris l'icone d'un
 * groupe. `Salle 203 BUT3B` se lit et se reconnait ; `Amphi 2` se suffit.
 *
 * Bordeaux Montaigne (2026-11-11) nomme aussi des « salles » qui n'en sont pas, `A distance_Synchrone`
 * et `Hors UBM` : elles se disent sans le mot, et le tiret bas de PRONOTE devient une espace.
 */
export function ligneDeSalle(salle: { readonly cle: string; readonly valeur: string }): string {
    const valeur = salle.valeur.replace(/_/g, ' ');
    return /salle|amphi|distance|\bhors\b/i.test(valeur) ? valeur : `${salle.cle} ${valeur}`;
}

/**
 * La nature de chaque ligne que la description nommee produit, indexee par son texte : la salle, les
 * enseignants, et le reste en information (`TD : GRP03`, `Fermeture des bâtiments`).
 *
 * Indexee par le texte et non par le rang, parce que les ecrans rangent les lignes par importance et
 * qu'une meme ligne servie deux fois ne s'affiche qu'une fois (CourseAnnotations). Une ligne qui
 * serait a la fois la salle et un champ garde la nature de la salle, ecrite en dernier.
 */
export function naturesDesLignes(ligneSalle: string, nommes: ChampsNommes): Record<string, NatureDeLigne> {
    const natures: Record<string, NatureDeLigne> = {};
    for (const autre of nommes.autres) natures[autre] = 'information';
    for (const enseignant of nommes.enseignants) natures[enseignant] = 'enseignant';
    if (ligneSalle !== '') natures[ligneSalle] = 'salle';
    return natures;
}

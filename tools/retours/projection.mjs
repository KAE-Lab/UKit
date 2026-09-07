/**
 * D'une ligne de la feuille a une ligne de la table `retours`.
 *
 * Le formulaire a des branches — un bug, une fonctionnalite, un campus — et la feuille les etale en
 * dix-huit colonnes dont la plupart sont vides pour une reponse donnee. La projection rend ce qui
 * se lit et se trie (la nature, le campus, l'appareil, un texte assemble) et garde la reponse
 * entiere, question par question, dans `reponses` : rien n'est perdu, et une question ajoutee au
 * formulaire arrive sans rien changer ici.
 *
 * Les questions sont reconnues par leur libelle exact, tel que Google l'ecrit en en-tete. Une
 * question attendue mais absente — le contact et le volontariat n'existent pas encore dans les
 * premieres reponses — vaut `null` ou `false`, jamais une erreur. Une question inconnue est
 * conservee dans `reponses`.
 *
 * La cle d'un retour est une empreinte de la reponse : l'instant UTC et les cellules non vides,
 * triees par question. Non vides, et triees, pour qu'une colonne ajoutee ou deplacee dans la feuille
 * ne recree pas les reponses deja rangees. Le prix est ecrit : renommer une question ou retoucher
 * une cellule recree la ligne — on ne retouche pas la feuille, on reclasse dans la console.
 */

import { createHash } from 'node:crypto';

import { versUtc } from './horodatage.mjs';
import { masquer } from './nettoyage.mjs';

/** Les libelles des questions, tels que la feuille les ecrit en en-tete. */
export const QUESTIONS = Object.freeze({
    horodatage: 'Timestamp',
    pourquoi: 'Pourquoi viens-tu?',
    probleme: 'Ta suggestion est-elle liée à un problème?',
    fonctionnalite: 'Description de la fonctionnalité souhaitée',
    alternatives: 'Alternatives envisagées',
    contexte: 'Contexte supplémentaire',
    section: "Sur quelle section de l'application le bug se trouve?",
    bug: 'Description du bug',
    reproduire: 'Comment le reproduire?',
    attendu: 'Comportement attendu',
    appareil: 'Appareil',
    systeme: "Version d'Android/iOS",
    versionApp: "Version de l'application",
    campus: 'Quel campus aimerais-tu adapter dans UKit?',
    connu: 'Comment as-tu connu UKit?',
    cursus: 'Quel est ton cursus?',
    annee: 'En quelle année?',
    autre: 'Autre chose à ajouter?',
    // Les deux questions que le jalon 6.1.x-C ajoute au formulaire (docs/adaptation-campus.md).
    contact: "Ton adresse e-mail, si tu veux qu'on te réponde (facultatif)",
    volontaire: 'Serais-tu prêt·e à prêter un accès pour adapter ton campus ?',
});

export const NATURES = Object.freeze(['bug', 'fonctionnalite', 'campus', 'autre']);

/** Deux libelles se correspondent a l'espace et a l'apostrophe pres : Google en change parfois. */
function normaliserLibelle(libelle) {
    return libelle.trim().replace(/\s+/g, ' ').replace(/[’‘]/g, "'");
}

/**
 * Une colonne que la feuille porte sans en-tete — une question ajoutee puis supprimee — sort en
 * `Column N` dans l'export. Elle ne dit rien : on ne la range pas dans la reponse.
 */
const COLONNE_SANS_ENTETE = /^Column \d+$/;

/** Une cellule : trimee, ses fins de ligne ramenees a `\n` (les deux exports different). */
function normaliserCellule(valeur) {
    return valeur.replace(/\r\n?/g, '\n').trim();
}

function sansAccents(texte) {
    return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * @param {string} reponse la case cochee a « Pourquoi viens-tu ? »
 * @returns {'bug' | 'fonctionnalite' | 'campus' | 'autre'}
 */
export function natureDe(reponse) {
    const texte = sansAccents(reponse.trim());
    if (texte.startsWith('signaler')) return 'bug';
    if (texte.startsWith('suggerer')) return 'fonctionnalite';
    if (texte.startsWith('demander')) return 'campus';
    return 'autre';
}

const BLOCS_PAR_NATURE = {
    bug: [['bug', 'Description'], ['reproduire', 'Reproduire'], ['attendu', 'Attendu']],
    fonctionnalite: [['fonctionnalite', 'Description'], ['probleme', 'Lié à un problème'], ['alternatives', 'Alternatives'], ['contexte', 'Contexte']],
    campus: [['campus', 'Campus demandé']],
    autre: [],
};

/**
 * L'assemblage lisible des champs libres de la branche cochee, un bloc par champ rempli. Vide
 * quand rien n'a ete ecrit — les reponses « Rien » existent.
 *
 * @param {'bug' | 'fonctionnalite' | 'campus' | 'autre'} nature
 * @param {(cle: string) => string} valeur la reponse a une question, par sa cle dans QUESTIONS
 * @returns {string}
 */
export function texteDe(nature, valeur) {
    const blocs = [...BLOCS_PAR_NATURE[nature], ['autre', 'Autre chose']];
    return blocs
        .map(([cle, libelle]) => [libelle, valeur(cle)])
        .filter(([, contenu]) => contenu !== '')
        .map(([libelle, contenu]) => `${libelle} : ${contenu}`)
        .join('\n\n');
}

/**
 * L'empreinte d'une reponse : sha256 de l'instant et des cellules non vides, hors horodatage,
 * triees par libelle (tri binaire, le meme sur toute machine). Calculee sur les valeurs telles
 * qu'ecrites, avant masquage : le masquage ne doit pas changer l'identite d'une reponse.
 *
 * @param {string} recuLe l'instant UTC en ISO
 * @param {readonly string[]} entetes
 * @param {readonly string[]} ligne
 * @returns {string}
 */
export function identifiantDe(recuLe, entetes, ligne) {
    const horodatage = normaliserLibelle(QUESTIONS.horodatage);
    const paires = entetes
        .map((entete, index) => [normaliserLibelle(entete), normaliserCellule(ligne[index] ?? '')])
        .filter(([entete, valeur]) => entete !== horodatage && valeur !== '')
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return createHash('sha256').update(JSON.stringify([recuLe, paires])).digest('hex');
}

/**
 * @typedef {object} Retour
 * @property {string} id
 * @property {string} recu_le
 * @property {'bug' | 'fonctionnalite' | 'campus' | 'autre'} nature
 * @property {string | null} campus
 * @property {string | null} section
 * @property {string | null} appareil
 * @property {string | null} systeme
 * @property {string | null} version_app
 * @property {string} texte
 * @property {string | null} contact
 * @property {boolean} volontaire
 * @property {Record<string, string>} reponses
 */

/**
 * Une ligne de la feuille, projetee. Leve si l'horodatage est illisible : un `id` calcule sur un
 * instant faux ferait des doublons a chaque passage, et on refuse l'import entier plutot que de
 * ranger une ligne dont on ne saura plus rien.
 *
 * @param {readonly string[]} entetes
 * @param {readonly string[]} ligne
 * @param {number} numero le numero de ligne dans la feuille, pour les messages
 * @param {string} [fuseauFeuille]
 * @returns {Retour}
 */
export function projeter(entetes, ligne, numero, fuseauFeuille = 'Europe/Paris') {
    const indexParLibelle = new Map(entetes.map((entete, index) => [normaliserLibelle(entete), index]));
    const brut = (cle) => {
        const index = indexParLibelle.get(normaliserLibelle(QUESTIONS[cle]));
        return index === undefined ? '' : normaliserCellule(ligne[index] ?? '');
    };
    const propre = (cle) => masquer(brut(cle));
    const ouNul = (valeur) => (valeur === '' ? null : valeur);

    const recuLe = versUtc(brut('horodatage'), fuseauFeuille);
    if (recuLe === null) throw new Error(`ligne ${numero} : horodatage illisible « ${brut('horodatage')} »`);

    const nature = natureDe(brut('pourquoi'));
    const contactNormalise = normaliserLibelle(QUESTIONS.contact);
    const reponses = Object.fromEntries(entetes
        .map((entete, index) => [entete.trim(), normaliserCellule(ligne[index] ?? '')])
        .filter(([entete, valeur]) => !(COLONNE_SANS_ENTETE.test(entete) && valeur === ''))
        .map(([entete, valeur]) => [entete, normaliserLibelle(entete) === contactNormalise ? valeur : masquer(valeur)]));
    const volontaire = brut('volontaire');

    return {
        id: identifiantDe(recuLe, entetes, ligne),
        recu_le: recuLe,
        nature,
        campus: ouNul(propre('campus')),
        section: ouNul(propre('section')),
        appareil: ouNul(propre('appareil')),
        systeme: ouNul(propre('systeme')),
        version_app: ouNul(propre('versionApp')),
        texte: texteDe(nature, propre),
        contact: ouNul(brut('contact')),
        volontaire: volontaire !== '' && !sansAccents(volontaire).startsWith('non'),
        reponses,
    };
}

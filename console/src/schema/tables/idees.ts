import type { Descripteur, Option } from '../descripteurs';

export const STATUTS_D_IDEE: readonly Option[] = [
    { valeur: 'brouillon', libelle: 'Brouillon' },
    { valeur: 'proposee', libelle: 'Proposée', ton: 'accent' },
    { valeur: 'en_cours', libelle: 'En cours', ton: 'avert' },
    { valeur: 'livree', libelle: 'Livrée', ton: 'ok' },
    { valeur: 'close', libelle: 'Close' },
];

/**
 * La boite a idees (phase 8, lot 4 ; docs/phase-8/4-sondages-idees-notation.md) : les idees retenues des
 * retours, que l'application montre avec « Moi aussi » et « Ajouter un detail ». Les « moi aussi » et les
 * details se lisent a cote de la ligne (pages/Idees). Un admin publie, reformule et livre ; l'equipe lit.
 */
export const IDEES: Descripteur = {
    chemin: 'idees',
    table: 'idees',
    section: 'communaute',
    titre: 'Idées',
    nouvelle: 'Nouvelle idée',
    description: 'La boîte à idées de l’application : ce qui est retenu des retours, reformulé, avec « Moi aussi » et « Ajouter un détail ».',
    cle: ['id'],
    verrou: 'maj_le',
    tri: { colonne: 'maj_le', desc: true },
    liste: ['titre', 'statut', 'version_livree', 'maj_le'],
    filtres: ['statut'],
    recherche: ['titre', 'detail'],
    avertissement: 'Une idée publiée se lit par tous les étudiants, en français, telle qu’elle est écrite ici : reformulée, jamais le texte d’un retour, sans nom ni détail qui désigne quelqu’un. « Livrée » demande la version, que les appareils qui l’ont soutenue annoncent ; « Close » la retire. Supprimer efface aussi le lien des détails reçus.',
    creation: true,
    suppression: true,
    vide: 'Aucune idée pour ces filtres. La première se crée avec le bouton.',
    champs: [
        { nom: 'titre', libelle: 'Titre', type: { type: 'texte' }, obligatoire: true, aide: 'L’idée telle que l’étudiant la reconnaît : « Le planning lisible hors ligne ». De 4 à 140 caractères.' },
        { nom: 'detail', libelle: 'Détail', type: { type: 'zone' }, aide: 'Facultatif : ce qu’elle changerait. 600 caractères au plus.' },
        { nom: 'statut', libelle: 'Statut', type: { type: 'choix', options: STATUTS_D_IDEE }, obligatoire: true, defaut: 'brouillon' },
        { nom: 'version_livree', libelle: 'Livrée dans la version', type: { type: 'version' }, aide: 'Obligatoire pour « Livrée ».' },
        { nom: 'cree_le', libelle: 'Créée le', type: { type: 'date' }, lectureSeule: true },
        { nom: 'maj_le', libelle: 'Modifiée le', type: { type: 'date' }, lectureSeule: true },
        { nom: 'id', libelle: 'Identifiant', type: { type: 'texte' }, lectureSeule: true },
    ],
};

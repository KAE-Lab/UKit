import type { Descripteur, Option } from '../descripteurs';

export const STATUTS_DE_PROBLEME: readonly Option[] = [
    { valeur: 'brouillon', libelle: 'Brouillon' },
    { valeur: 'publie', libelle: 'Publié', ton: 'accent' },
    { valeur: 'corrige', libelle: 'Corrigé', ton: 'ok' },
    { valeur: 'clos', libelle: 'Clos' },
];

const PLATEFORMES: readonly Option[] = [
    { valeur: 'ios', libelle: 'iOS' },
    { valeur: 'android', libelle: 'Android' },
];

/**
 * Les problemes connus (phase 8, lot 3 ; docs/phase-8/3-formulaire.md) : ce que l'application montre
 * avant d'envoyer un bug. Les « moi aussi » et les details se lisent a cote de la ligne
 * (pages/Problemes). Un admin publie, reformule et clot ; l'equipe lit.
 */
export const PROBLEMES: Descripteur = {
    chemin: 'problemes',
    table: 'problemes_connus',
    section: 'communaute',
    titre: 'Problèmes connus',
    nouvelle: 'Nouveau problème',
    description: 'Ce que l’application montre avant d’envoyer un bug, avec « Moi aussi » et « Ajouter un détail ».',
    cle: ['id'],
    verrou: 'maj_le',
    tri: { colonne: 'maj_le', desc: true },
    liste: ['titre', 'statut', 'plateformes', 'version_corrigee', 'maj_le'],
    reperes: ['plateformes'],
    filtres: ['statut'],
    recherche: ['titre', 'detail'],
    avertissement: 'Un problème publié se lit par tous les étudiants, en français, pour sa plateforme : le titre dit ce qui ne marche pas, sans jargon. « Corrigé » le garde un mois dans l’application, avec la version qui corrige ; « Clos » le retire. Supprimer efface aussi le lien des détails reçus.',
    creation: true,
    suppression: true,
    vide: 'Aucun problème connu pour ces filtres. Le premier se crée avec le bouton.',
    champs: [
        { nom: 'titre', libelle: 'Titre', type: { type: 'texte' }, obligatoire: true, aide: 'Ce que l’étudiant reconnaît : « Le menu du RU reste vide sur Android ». De 4 à 140 caractères.' },
        { nom: 'detail', libelle: 'Détail', type: { type: 'zone' }, aide: 'Facultatif : depuis quand, ce qui contourne. 600 caractères au plus.' },
        { nom: 'statut', libelle: 'Statut', type: { type: 'choix', options: STATUTS_DE_PROBLEME }, obligatoire: true, defaut: 'brouillon' },
        { nom: 'plateformes', libelle: 'Plateformes', type: { type: 'cases', options: PLATEFORMES }, aide: 'Aucune cochée : les deux.' },
        { nom: 'version_corrigee', libelle: 'Corrigé dans la version', type: { type: 'version' } },
        { nom: 'cree_le', libelle: 'Créé le', type: { type: 'date' }, lectureSeule: true },
        { nom: 'maj_le', libelle: 'Modifié le', type: { type: 'date' }, lectureSeule: true },
        { nom: 'id', libelle: 'Identifiant', type: { type: 'texte' }, lectureSeule: true },
    ],
};

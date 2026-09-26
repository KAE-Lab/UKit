import { proposerCle } from '../../lib/cle';
import { CAMPUS_PAR_CIBLAGE, CIBLAGE, type Descripteur } from '../descripteurs';
import { MAINTENANT, PLATEFORMES_D_APPAREIL } from './commun';

const NIVEAUX = [
    { valeur: 'info', libelle: 'Information', ton: 'accent' as const },
    { valeur: 'avertissement', libelle: 'Avertissement', ton: 'avert' as const },
    { valeur: 'incident', libelle: 'Incident', ton: 'panne' as const },
];

export const MESSAGES: Descripteur = {
    chemin: 'messages',
    table: 'service_messages',
    titre: 'Messages de service',
    description: 'Parler aux utilisateurs : une information en bandeau, un avertissement ou un incident en feuille.',
    cle: ['id'],
    verrou: 'maj_le',
    tri: { colonne: 'publie_le', desc: true },
    liste: ['titre', 'niveau', 'actif', 'audience', 'etablissements', 'plateformes', 'version_min', 'version_max', 'publie_le', 'notifie_le'],
    filtres: ['niveau', 'actif', 'audience'],
    recherche: ['titre', 'corps', 'cle'],
    campus: CAMPUS_PAR_CIBLAGE,
    avertissement: 'Un « info » se montre une fois en bandeau ; un « avertissement » une fois en feuille ; un « incident » en feuille, puis la pastille des onglets reste rouge tant qu’il est actif. La clé est la mémoire « vu » des téléphones : garde-la pour corriger un message, change-la pour le refaire apparaître. « Notifier » envoie une notification push aux appareils ciblés — une fois, et ça ne se rattrape pas : enregistre et relis avant.',
    champs: [
        { nom: 'niveau', libelle: 'Niveau', type: { type: 'choix', options: NIVEAUX }, obligatoire: true, defaut: 'info' },
        { nom: 'titre', libelle: 'Titre', type: { type: 'texte' }, obligatoire: true },
        { nom: 'corps', libelle: 'Corps', type: { type: 'zone' }, aide: 'Le texte de la feuille. Écrit une fois, en français.' },
        { nom: 'cle', libelle: 'Clé', type: { type: 'texte' }, aide: 'Proposée depuis le titre si elle est vide. Stable d’une correction à l’autre.' },
        { nom: 'actif', libelle: 'Actif', type: { type: 'booleen' }, defaut: true },
        { nom: 'publie_le', libelle: 'Publié le', type: { type: 'date' }, obligatoire: true, defaut: MAINTENANT },
        { nom: 'expire_le', libelle: 'Expire le', type: { type: 'date' }, aide: 'Vide : n’expire pas.' },
        ...CIBLAGE,
        { nom: 'notifie_le', libelle: 'Notifié le', type: { type: 'date' }, lectureSeule: true, aide: 'Posé par la fonction d’envoi. Un message ne se notifie qu’une fois.' },
        { nom: 'notifies', libelle: 'Appareils visés', type: { type: 'nombre' }, lectureSeule: true },
        { nom: 'maj_le', libelle: 'Modifié le', type: { type: 'date' }, lectureSeule: true, aide: 'La version de la ligne : un enregistrement ne passe que si personne ne l’a modifiée depuis son ouverture.' },
        { nom: 'id', libelle: 'Identifiant', type: { type: 'uuid' }, lectureSeule: true },
    ],
    avantEcriture: (ligne, existante) => {
        if (typeof ligne.cle === 'string' && ligne.cle !== '') return ligne;
        if (existante !== null && typeof existante.cle === 'string') return { ...ligne, cle: existante.cle };
        return { ...ligne, cle: proposerCle(String(ligne.titre ?? ''), new Date()) };
    },
    actions: [
        {
            libelle: 'Notifier',
            confirmation: 'Envoyer ce message en notification push à tous les appareils qu’il cible ? Ça ne se rejoue pas.',
            disponible: (ligne) => ligne.notifie_le === null || ligne.notifie_le === undefined,
            // Import paresseux : le descripteur reste une donnee pure, sans client de base a l'import
            // (les tests de coherence le chargent hors navigateur).
            executer: async (ligne) => (await import('../../lib/notifier')).notifierMessage(String(ligne.id)),
        },
    ],
};

/** Le parc qui recoit les notifications : une ligne par appareil, lue seulement (6.1.x-E). */
export const JETONS: Descripteur = {
    chemin: 'jetons',
    table: 'jetons_push',
    titre: 'Jetons push',
    description: 'Les appareils qui recevront les messages en notification, et ce qu’il faut pour les cibler. Déposés par l’application, retirés par son interrupteur ou par un envoi qui les trouve morts. Le jeton lui-même ne se lit pas ici : il suffirait à notifier l’appareil.',
    section: 'suivre',
    // Aucune cle lisible : le jeton lui-meme ne se lit par aucun compte de la console depuis 7-H — qui le
    // lit peut notifier l'appareil sans passer par elle. La liste se lit, et ne s'ouvre pas.
    cle: [],
    colonnes: 'plateforme,etablissement,version,testeur,maj_le',
    ouvrable: false,
    tri: { colonne: 'maj_le', desc: true },
    liste: ['plateforme', 'etablissement', 'version', 'testeur', 'maj_le'],
    filtres: ['plateforme', 'testeur'],
    recherche: ['version', 'etablissement'],
    campus: { type: 'code', colonne: 'etablissement' },
    creation: false,
    suppression: false,
    vide: 'Aucun appareil n’a encore déposé de jeton : il faut un build (pas Expo Go), la permission de notifications, et l’interrupteur des Réglages allumé.',
    champs: [
        { nom: 'plateforme', libelle: 'Plateforme', type: { type: 'choix', options: PLATEFORMES_D_APPAREIL }, lectureSeule: true },
        { nom: 'etablissement', libelle: 'Campus', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'version', libelle: 'Version', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'testeur', libelle: 'Testeur', type: { type: 'booleen' }, lectureSeule: true },
        { nom: 'maj_le', libelle: 'Déposé le', type: { type: 'date' }, lectureSeule: true },
    ],
};

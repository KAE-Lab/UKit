import { CAMPUS_PAR_CIBLAGE, CIBLAGE, type Descripteur } from '../descripteurs';
import { MAINTENANT } from './commun';

/** L'index de la palette des sections ; le 4 est refuse par la base elle-meme depuis 7-C (`annonces_couleur_check`). */
const COULEURS_DE_SECTION = [
    { valeur: '', libelle: 'Par défaut' },
    { valeur: '0', libelle: '0' }, { valeur: '1', libelle: '1' }, { valeur: '2', libelle: '2' },
    { valeur: '3', libelle: '3' }, { valeur: '5', libelle: '5' },
];

const STATUTS = [
    { valeur: 'brouillon', libelle: 'Brouillon', ton: 'avert' as const },
    { valeur: 'publiee', libelle: 'Publiée', ton: 'ok' as const },
    { valeur: 'archivee', libelle: 'Archivée' },
];

/** La nature de la carte (7-C) ; ses badges se rendent dans l'application a partir de la 6.3. */
export const TYPES_D_ANNONCE = [
    { valeur: 'evenement', libelle: 'Événement' },
    { valeur: 'info', libelle: 'Information', ton: 'accent' as const },
    { valeur: 'bon_plan', libelle: 'Bon plan', ton: 'ok' as const },
    { valeur: 'partenaire', libelle: 'Partenaire', ton: 'avert' as const },
];

/** Les carrousels ou la carte s'insere ; « annonces » est le sien, les autres sont les cartes speciales. */
export const EMPLACEMENTS = [
    { valeur: 'annonces', libelle: 'Annonces' },
    { valeur: 'restaurants', libelle: 'Restaurants' },
    { valeur: 'bibliotheques', libelle: 'Bibliothèques' },
    { valeur: 'salles', libelle: 'Salles libres' },
];

const AJUSTEMENTS = [
    { valeur: 'couvrir', libelle: 'Couvrir' },
    { valeur: 'contenir', libelle: 'Contenir' },
];

const GROUPE_CONTENU = 'Contenu';
const GROUPE_VISUEL = 'Visuel';
const GROUPE_CARTES = 'Cartes et ordre';
const GROUPE_LIEU = 'Lieu et action';
const GROUPE_PUBLICATION = 'Publication';
const GROUPE_CIBLAGE = 'Ciblage';

/**
 * L'editeur d'annonces (7-F) : toutes les colonnes de la publication, en groupes, avec l'apercu du
 * telephone a cote (pages/Annonces). Les gestes — dupliquer, archiver, voir sur mon telephone —
 * vivent dans `gestes.ts`, charges paresseusement : le descripteur reste une donnee pure, sans client
 * de base a l'import (les tests de coherence le chargent hors navigateur).
 */
export const ANNONCES: Descripteur = {
    chemin: 'annonces',
    table: 'annonces',
    titre: 'Annonces',
    description: 'La vie étudiante : une carte dans Campus, une fiche au toucher — composées ici en voyant ce qu’elles donneront sur un téléphone.',
    cle: ['id'],
    tri: { colonne: 'publiee_le', desc: true },
    liste: ['image_url', 'titre', 'type', 'emetteur', 'statut', 'epinglee', 'audience', 'etablissements', 'publiee_le', 'expire_le'],
    filtres: ['statut', 'type', 'active', 'epinglee', 'audience'],
    recherche: ['titre', 'emetteur', 'accroche'],
    campus: CAMPUS_PAR_CIBLAGE,
    avertissement: 'Une annonce est visible dès que « active » est cochée, que son statut est « publiée » et que sa date de publication est passée ; une date d’expiration vide veut dire jamais. L’aperçu est une approximation : la vérification finale reste le téléphone, en audience « testeurs ».',
    champs: [
        { nom: 'titre', libelle: 'Titre', type: { type: 'texte' }, obligatoire: true, groupe: GROUPE_CONTENU },
        { nom: 'emetteur', libelle: 'Émetteur', type: { type: 'texte' }, obligatoire: true, aide: 'Le kicker au-dessus du titre : « BDE Sciences », « UKit »…', groupe: GROUPE_CONTENU },
        { nom: 'type', libelle: 'Type', type: { type: 'choix', options: TYPES_D_ANNONCE }, obligatoire: true, defaut: 'evenement', aide: 'La nature de la carte ; l’application rend les badges à partir de la 6.3.', groupe: GROUPE_CONTENU },
        { nom: 'accroche', libelle: 'Accroche', type: { type: 'texte' }, aide: 'Le chapeau sous le titre de la fiche ; sur une carte sans visuel, c’est elle qui fait l’affiche.', groupe: GROUPE_CONTENU },
        { nom: 'description', libelle: 'Description', type: { type: 'description' }, aide: 'Le mini-langage des fiches : la barre insère les marqueurs, l’aperçu les rend (docs/features/campus-vie-etudiante.md).', groupe: GROUPE_CONTENU },
        { nom: 'couleur', libelle: 'Couleur d’identité', type: { type: 'choix', options: COULEURS_DE_SECTION }, aide: 'Un index de la palette des sections. Le 4 est interdit : il duplique le 0 en sombre.', groupe: GROUPE_CONTENU },
        { nom: 'image_url', libelle: 'Visuel', type: { type: 'image', dossier: 'annonces', blurhash: 'blurhash' }, aide: 'Une affiche, redimensionnée à 1080 px et compressée avant l’envoi. Vide : la carte compose une affiche typographique.', groupe: GROUPE_VISUEL },
        { nom: 'blurhash', libelle: 'Blurhash', type: { type: 'texte' }, cache: true },
        { nom: 'focale', libelle: 'Point focal et cadrage', type: { type: 'focale', image: 'image_url', ajustement: 'ajustement' }, aide: 'Un clic sur l’image pose le point gardé au centre du cadre 4:5 quand l’image le couvre.', groupe: GROUPE_VISUEL },
        { nom: 'ajustement', libelle: 'Ajustement', type: { type: 'choix', options: AJUSTEMENTS }, obligatoire: true, defaut: 'couvrir', cache: true },
        { nom: 'images', libelle: 'Galerie', type: { type: 'galerie', dossier: 'annonces' }, aide: 'Sous la description de la fiche, dans cet ordre.', groupe: GROUPE_VISUEL },
        { nom: 'emplacements', libelle: 'Emplacements', type: { type: 'cases', options: EMPLACEMENTS, auMoinsUne: true }, defaut: ['annonces'], aide: 'Les carrousels du tableau de bord où la carte s’insère ; hors « Annonces », c’est une carte spéciale, rendue à partir de la 6.3.', groupe: GROUPE_CARTES },
        { nom: 'epinglee', libelle: 'Épinglée', type: { type: 'booleen' }, defaut: false, aide: 'En tête du carrousel, avant toute rotation.', groupe: GROUPE_CARTES },
        { nom: 'priorite', libelle: 'Priorité', type: { type: 'nombre' }, obligatoire: true, defaut: 0, aide: 'Le poids dans l’ordre, après les épinglées et les créneaux actifs : plus haut, plus tôt.', groupe: GROUPE_CARTES },
        { nom: 'creneaux', libelle: 'Créneaux de mise en avant', type: { type: 'creneaux' }, aide: 'Les plages où l’annonce passe devant, en heure de Paris : un bon plan du midi de 11 h à 14 h.', groupe: GROUPE_CARTES },
        { nom: 'partenaire', libelle: 'Partenaire', type: { type: 'partenaire', dossier: 'partenaires' }, aide: 'Pour une carte « partenaire » ou « bon plan » : le nom, le logo, le lien.', groupe: GROUPE_CARTES },
        { nom: 'lat', libelle: 'Latitude', type: { type: 'nombre' }, aide: 'Avec la longitude, la fiche montre une carte « S’y rendre ».', groupe: GROUPE_LIEU },
        { nom: 'lng', libelle: 'Longitude', type: { type: 'nombre' }, groupe: GROUPE_LIEU },
        { nom: 'cta_texte', libelle: 'Libellé du bouton', type: { type: 'texte' }, aide: 'Le bouton n’apparaît que si le libellé et le lien sont tous les deux là.', groupe: GROUPE_LIEU },
        { nom: 'cta_lien', libelle: 'Lien du bouton', type: { type: 'texte' }, groupe: GROUPE_LIEU },
        { nom: 'statut', libelle: 'Statut', type: { type: 'choix', options: STATUTS }, obligatoire: true, defaut: 'publiee', aide: 'Une annonce programmée est une annonce publiée dont la date de publication est à venir ; archiver la retire sans perdre sa trace.', groupe: GROUPE_PUBLICATION },
        { nom: 'publiee_le', libelle: 'Publiée le', type: { type: 'date' }, obligatoire: true, defaut: MAINTENANT, groupe: GROUPE_PUBLICATION },
        { nom: 'expire_le', libelle: 'Expire le', type: { type: 'date' }, groupe: GROUPE_PUBLICATION },
        { nom: 'active', libelle: 'Active', type: { type: 'booleen' }, defaut: true, groupe: GROUPE_PUBLICATION },
        ...CIBLAGE.map((champ) => ({ ...champ, groupe: GROUPE_CIBLAGE })),
        { nom: 'id', libelle: 'Identifiant', type: { type: 'uuid' }, lectureSeule: true, aide: 'Attribué par la base ; c’est la clé d’un visuel de domaine « annonce ».' },
    ],
    valider: (ligne) => (ligne.couleur === 4 || ligne.couleur === '4' ? 'La couleur 4 est interdite : elle duplique la 0 en thème sombre.' : null),
    avantEcriture: (ligne) => ({
        ...ligne,
        couleur: typeof ligne.couleur === 'string' && ligne.couleur !== '' ? Number(ligne.couleur) : (typeof ligne.couleur === 'number' ? ligne.couleur : null),
        priorite: typeof ligne.priorite === 'number' ? Math.round(ligne.priorite) : 0,
    }),
    actions: [
        {
            libelle: 'Dupliquer',
            executer: async (ligne) => (await import('./gestesDAnnonce')).dupliquer(ligne),
        },
        {
            libelle: 'Voir sur mon téléphone',
            confirmation: 'Passer l’annonce en audience « testeurs » ? Seuls les appareils enregistrés la verront, le temps de vérifier.',
            disponible: (ligne) => ligne.audience !== 'testeurs',
            executer: async (ligne) => (await import('./gestesDAnnonce')).changerAudience(ligne, 'testeurs'),
        },
        {
            libelle: 'Rendre à tout le monde',
            disponible: (ligne) => ligne.audience === 'testeurs',
            executer: async (ligne) => (await import('./gestesDAnnonce')).changerAudience(ligne, 'tous'),
        },
        {
            libelle: 'Archiver',
            confirmation: 'Archiver cette annonce ? Elle disparaît des téléphones, mais garde sa trace et ses chiffres. Elle peut être republiée en changeant son statut.',
            disponible: (ligne) => ligne.statut !== 'archivee',
            destructif: true,
            executer: async (ligne) => (await import('./gestesDAnnonce')).archiver(ligne),
        },
    ],
};

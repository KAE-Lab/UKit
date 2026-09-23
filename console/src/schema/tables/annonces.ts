import { RATIO_CARTE } from '../../lib/cadrage';
import { lirePartenaire } from '../schemas';
import { CAMPUS_PAR_CIBLAGE, CIBLAGE, type Descripteur } from '../descripteurs';
import type { Ligne } from '../../supabase';
import { MAINTENANT } from './commun';
import { etatDAnnonce } from './etatDAnnonce';

/**
 * Le statut editorial, sans couleur : « publiée » ne dit pas qu'une annonce est visible — la case
 * « active » et les dates en decident. La couleur est celle de la colonne « État ».
 */
const STATUTS = [
    { valeur: 'brouillon', libelle: 'Brouillon' },
    { valeur: 'publiee', libelle: 'Publiée' },
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

/** Un lien de bouton que l'application sait ouvrir : le web dans sa vue integree, le reste par le systeme. */
const FORME_DU_LIEN = { motif: /^(https?:\/\/|mailto:|tel:)\S+$/, message: 'Le lien commence par https://, mailto: ou tel: — l’application ne sait pas ouvrir le reste.' };

/** Le partenaire ne se propose qu'aux cartes qui le montrent — ou quand il porte deja une valeur, pour qu'on puisse la retirer. */
function partenaireAPropos(valeurs: Ligne): boolean {
    if (valeurs.type === 'partenaire' || valeurs.type === 'bon_plan') return true;
    const partenaire = lirePartenaire(valeurs.partenaire);
    return partenaire.nom !== '' || partenaire.logo_url !== '' || partenaire.lien !== '';
}

/** Une regle a la mesure de la ligne entiere : la couleur interdite, un lieu a moitie saisi. */
function valider(ligne: Ligne): string | null {
    if (ligne.couleur === 4 || ligne.couleur === '4') return 'La couleur 4 est interdite : elle duplique la 0 en thème sombre.';
    const lat = typeof ligne.lat === 'number' ? ligne.lat : null;
    const lng = typeof ligne.lng === 'number' ? ligne.lng : null;
    if ((lat === null) !== (lng === null)) return 'Le lieu demande la latitude et la longitude, ou aucune des deux.';
    if (lng !== null && Math.abs(lng) > 180) return 'La longitude va de -180 à 180.';
    return null;
}

/**
 * L'editeur d'annonces (7-F) : toutes les colonnes de la publication, en groupes, avec l'apercu du
 * telephone a cote (pages/Annonces). Les gestes — dupliquer, archiver, voir sur mon telephone —
 * vivent dans `gestesDAnnonce.ts`, charges paresseusement : le descripteur reste une donnee pure, sans
 * client de base a l'import (les tests de coherence le chargent hors navigateur).
 */
export const ANNONCES: Descripteur = {
    chemin: 'annonces',
    table: 'annonces',
    titre: 'Annonces',
    description: 'La vie étudiante : une carte dans Campus, une fiche au toucher — composées ici en voyant ce qu’elles donneront sur un téléphone.',
    nouvelle: 'Nouvelle annonce',
    cle: ['id'],
    tri: { colonne: 'publiee_le', desc: true },
    // L'etat que les telephones voient, pas le statut editorial : une annonce publiee mais decochee,
    // programmee ou expiree n'est visible de personne, et la liste le dit.
    liste: ['image_url', 'titre', 'etat', 'type', 'emetteur', 'epinglee', 'audience', 'etablissements', 'publiee_le', 'expire_le'],
    calculees: [{ nom: 'etat', libelle: 'État', valeur: etatDAnnonce }],
    filtres: ['statut', 'type', 'active', 'epinglee', 'audience'],
    recherche: ['titre', 'emetteur', 'accroche'],
    campus: CAMPUS_PAR_CIBLAGE,
    avertissement: 'Visible quand elle est active, publiée et que sa date de publication est passée ; sans expiration, elle le reste. L’aperçu approche le téléphone : « Voir sur mon téléphone » permet de vérifier en audience « testeurs ».',
    champs: [
        { nom: 'titre', libelle: 'Titre', type: { type: 'texte' }, obligatoire: true, groupe: GROUPE_CONTENU },
        { nom: 'emetteur', libelle: 'Émetteur', type: { type: 'texte' }, obligatoire: true, aide: 'Le kicker au-dessus du titre : « BDE Sciences », « UKit »…', groupe: GROUPE_CONTENU },
        { nom: 'type', libelle: 'Type', type: { type: 'choix', options: TYPES_D_ANNONCE }, obligatoire: true, defaut: 'evenement', aide: 'La nature de la carte ; l’application rend les badges à partir de la 6.3.', groupe: GROUPE_CONTENU },
        { nom: 'accroche', libelle: 'Accroche', type: { type: 'texte' }, aide: 'Le chapeau sous le titre de la fiche ; sur une carte sans visuel, c’est elle qui fait l’affiche.', groupe: GROUPE_CONTENU },
        { nom: 'description', libelle: 'Description', type: { type: 'description' }, aide: 'Le mini-langage des fiches : la barre insère les marqueurs, l’aperçu les rend (docs/features/campus-vie-etudiante.md).', groupe: GROUPE_CONTENU },
        { nom: 'couleur', libelle: 'Couleur d’identité', type: { type: 'teinte' }, aide: 'Elle teinte les têtes de section, la signature et l’affiche d’une carte sans visuel ; chaque pastille la montre en clair et en sombre.', groupe: GROUPE_CONTENU },
        { nom: 'image_url', libelle: 'Visuel', type: { type: 'image', dossier: 'annonces', blurhash: 'blurhash' }, aide: 'Une affiche, redimensionnée à 1080 px et compressée avant l’envoi. Vide : la carte compose une affiche typographique.', groupe: GROUPE_VISUEL },
        { nom: 'blurhash', libelle: 'Blurhash', type: { type: 'texte' }, cache: true },
        { nom: 'focale', libelle: 'Point focal et cadrage', type: { type: 'focale', image: 'image_url', ajustement: 'ajustement', ratio: RATIO_CARTE }, aide: 'Un clic ou un glisser sur l’image pose le point que le cadre 4:5 de la carte garde visible, à la même place relative ; le voile montre ce qu’il coupera.', groupe: GROUPE_VISUEL },
        { nom: 'ajustement', libelle: 'Ajustement', type: { type: 'choix', options: AJUSTEMENTS }, obligatoire: true, defaut: 'couvrir', cache: true },
        { nom: 'images', libelle: 'Galerie', type: { type: 'galerie', dossier: 'annonces' }, aide: 'Sous la description de la fiche, dans cet ordre.', groupe: GROUPE_VISUEL },
        { nom: 'emplacements', libelle: 'Emplacements', type: { type: 'cases', options: EMPLACEMENTS, auMoinsUne: true }, defaut: ['annonces'], aide: 'Les carrousels du tableau de bord où la carte s’insère ; hors « Annonces », c’est une carte spéciale, rendue à partir de la 6.3.', groupe: GROUPE_CARTES },
        { nom: 'epinglee', libelle: 'Épinglée', type: { type: 'booleen' }, defaut: false, aide: 'En tête du carrousel, avant toute rotation.', groupe: GROUPE_CARTES },
        { nom: 'priorite', libelle: 'Priorité', type: { type: 'nombre' }, obligatoire: true, defaut: 0, aide: 'Le poids dans l’ordre, après les épinglées et les créneaux actifs : plus haut, plus tôt.', groupe: GROUPE_CARTES },
        { nom: 'creneaux', libelle: 'Créneaux de mise en avant', type: { type: 'creneaux' }, aide: 'Les plages où l’annonce passe devant, en heure de Paris : un bon plan du midi de 11 h à 14 h.', groupe: GROUPE_CARTES },
        { nom: 'partenaire', libelle: 'Partenaire', type: { type: 'partenaire', dossier: 'partenaires' }, aide: 'Le nom, le logo et le lien que la carte montre dans son badge.', groupe: GROUPE_CARTES, visible: partenaireAPropos },
        { nom: 'lat', libelle: 'Lieu', type: { type: 'lieu', longitude: 'lng' }, aide: 'Colle un point copié d’une carte — clic droit sur Google Maps, ou l’adresse d’une fiche Google Maps ou OpenStreetMap — : les deux champs se remplissent. La fiche montre alors « S’y rendre ».', groupe: GROUPE_LIEU },
        { nom: 'lng', libelle: 'Longitude', type: { type: 'nombre' }, cache: true },
        { nom: 'cta_texte', libelle: 'Libellé du bouton', type: { type: 'texte' }, aide: 'Le bouton n’apparaît que si le libellé et le lien sont tous les deux là.', groupe: GROUPE_LIEU },
        { nom: 'cta_lien', libelle: 'Lien du bouton', type: { type: 'texte' }, forme: FORME_DU_LIEN, aide: 'Une page web s’ouvre dans l’application ; mailto: et tel: partent vers le système.', groupe: GROUPE_LIEU },
        { nom: 'statut', libelle: 'Statut', type: { type: 'choix', options: STATUTS }, obligatoire: true, defaut: 'publiee', aide: 'Une annonce programmée est une annonce publiée dont la date de publication est à venir ; archiver la retire sans perdre sa trace.', groupe: GROUPE_PUBLICATION },
        { nom: 'publiee_le', libelle: 'Publiée le', type: { type: 'date' }, obligatoire: true, defaut: MAINTENANT, groupe: GROUPE_PUBLICATION },
        { nom: 'expire_le', libelle: 'Expire le', type: { type: 'date' }, groupe: GROUPE_PUBLICATION },
        { nom: 'active', libelle: 'Active', type: { type: 'booleen' }, defaut: true, groupe: GROUPE_PUBLICATION },
        ...CIBLAGE.map((champ) => ({ ...champ, groupe: GROUPE_CIBLAGE })),
        { nom: 'id', libelle: 'Identifiant', type: { type: 'uuid' }, lectureSeule: true, aide: 'Attribué par la base ; c’est la clé d’un visuel de domaine « annonce ».' },
    ],
    valider,
    avantEcriture: (ligne) => ({
        ...ligne,
        couleur: typeof ligne.couleur === 'string' && ligne.couleur !== '' ? Number(ligne.couleur) : (typeof ligne.couleur === 'number' ? ligne.couleur : null),
        priorite: typeof ligne.priorite === 'number' ? Math.round(ligne.priorite) : 0,
    }),
    actions: [
        {
            libelle: 'Dupliquer',
            icone: 'copier',
            executer: async (ligne) => (await import('./gestesDAnnonce')).dupliquer(ligne),
        },
        {
            libelle: 'Voir sur mon téléphone',
            icone: 'telephone',
            confirmation: 'Passer l’annonce en audience « testeurs » ? Seuls les appareils enregistrés la verront, le temps de vérifier.',
            disponible: (ligne) => ligne.audience !== 'testeurs',
            executer: async (ligne) => (await import('./gestesDAnnonce')).changerAudience(ligne, 'testeurs'),
        },
        {
            libelle: 'Rendre à tout le monde',
            icone: 'tous',
            disponible: (ligne) => ligne.audience === 'testeurs',
            executer: async (ligne) => (await import('./gestesDAnnonce')).changerAudience(ligne, 'tous'),
        },
        {
            libelle: 'Archiver',
            confirmation: 'Archiver cette annonce ? Elle disparaît des téléphones, mais garde sa trace et ses chiffres. Elle peut être republiée en changeant son statut.',
            icone: 'archiver',
            disponible: (ligne) => ligne.statut !== 'archivee',
            executer: async (ligne) => (await import('./gestesDAnnonce')).archiver(ligne),
        },
    ],
};

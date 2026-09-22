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

/**
 * Les colonnes de 7-C que l'editeur ne montre pas encore — type, emplacements, cadrage, focale,
 * ordre, creneaux, partenaire — arrivent avec l'editeur d'annonces de 7-F. Le statut et le blurhash
 * sont ici : le premier parce qu'une annonce archivee ou en brouillon se lit dans la liste, le second
 * parce que le pipeline de televersement de ce jalon le calcule.
 */
export const ANNONCES: Descripteur = {
    chemin: 'annonces',
    table: 'annonces',
    titre: 'Annonces',
    description: 'La vie étudiante : une carte au format affiche dans Campus, une fiche au toucher.',
    cle: ['id'],
    tri: { colonne: 'publiee_le', desc: true },
    liste: ['image_url', 'titre', 'emetteur', 'statut', 'active', 'audience', 'etablissements', 'plateformes', 'publiee_le', 'expire_le'],
    filtres: ['statut', 'active', 'audience'],
    recherche: ['titre', 'emetteur', 'accroche'],
    campus: CAMPUS_PAR_CIBLAGE,
    avertissement: 'Une annonce est visible dès que « active » est cochée, que son statut est « publiée » et que sa date de publication est passée ; une date d’expiration vide veut dire jamais. Remplacer le visuel crée un nouvel objet à une nouvelle adresse : les téléphones le rechargent d’eux-mêmes.',
    champs: [
        { nom: 'titre', libelle: 'Titre', type: { type: 'texte' }, obligatoire: true },
        { nom: 'emetteur', libelle: 'Émetteur', type: { type: 'texte' }, obligatoire: true, aide: 'La pastille sous le visuel : « BDE Sciences », « UKit »…' },
        { nom: 'accroche', libelle: 'Accroche', type: { type: 'texte' }, aide: 'Une ligne sous le titre de la fiche.' },
        { nom: 'description', libelle: 'Description', type: { type: 'zone' }, aide: 'Le mini-langage des fiches : # Titre, # icône|Titre, - puce, -- sous-puce, > exergue, **gras**, = transition, ~ signature (docs/features/campus-vie-etudiante.md).' },
        { nom: 'image_url', libelle: 'Visuel', type: { type: 'image', dossier: 'annonces', blurhash: 'blurhash' }, aide: 'Une affiche, redimensionnée à 1080 px et compressée avant l’envoi. Vide : la carte compose une affiche typographique.' },
        { nom: 'blurhash', libelle: 'Blurhash', type: { type: 'texte' }, cache: true },
        { nom: 'images', libelle: 'Galerie', type: { type: 'json' }, aide: 'Un tableau JSON d’adresses d’images, affiché sous la description : ["https://…/1.jpg", "https://…/2.jpg"].' },
        { nom: 'couleur', libelle: 'Couleur d’identité', type: { type: 'choix', options: COULEURS_DE_SECTION }, aide: 'Un index de la palette des sections. Le 4 est interdit : il duplique le 0 en sombre.' },
        { nom: 'lat', libelle: 'Latitude', type: { type: 'nombre' }, aide: 'Avec la longitude, la fiche montre une carte « S’y rendre ».' },
        { nom: 'lng', libelle: 'Longitude', type: { type: 'nombre' } },
        { nom: 'cta_texte', libelle: 'Libellé du bouton', type: { type: 'texte' }, aide: 'Le bouton n’apparaît que si le libellé et le lien sont tous les deux là.' },
        { nom: 'cta_lien', libelle: 'Lien du bouton', type: { type: 'texte' } },
        { nom: 'statut', libelle: 'Statut', type: { type: 'choix', options: STATUTS }, obligatoire: true, defaut: 'publiee', aide: 'Une annonce programmée est une annonce publiée dont la date de publication est à venir.' },
        { nom: 'publiee_le', libelle: 'Publiée le', type: { type: 'date' }, obligatoire: true, defaut: MAINTENANT },
        { nom: 'expire_le', libelle: 'Expire le', type: { type: 'date' } },
        { nom: 'active', libelle: 'Active', type: { type: 'booleen' }, defaut: true },
        ...CIBLAGE,
        { nom: 'id', libelle: 'Identifiant', type: { type: 'uuid' }, lectureSeule: true, aide: 'Attribué par la base ; c’est la clé d’un visuel de domaine « annonce ».' },
    ],
    valider: (ligne) => (ligne.couleur === 4 || ligne.couleur === '4' ? 'La couleur 4 est interdite : elle duplique la 0 en thème sombre.' : null),
    avantEcriture: (ligne) => ({ ...ligne, couleur: typeof ligne.couleur === 'string' && ligne.couleur !== '' ? Number(ligne.couleur) : (typeof ligne.couleur === 'number' ? ligne.couleur : null) }),
};

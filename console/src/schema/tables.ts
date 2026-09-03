/**
 * Les descripteurs des tables publiables, un par page de la console.
 *
 * Chaque avertissement reprend une regle ecrite dans docs/backend.md : la console ne les invente
 * pas, elle les met la ou on ecrit. Les Blueprints n'ont pas de descripteur, et c'est une decision
 * (docs/phase-6/6-1-b-pilotage-a-distance.md) : ils se publient par le script, qui les valide.
 */

import { proposerCle } from '../lib/cle';
import { CIBLAGE, type Descripteur } from './descripteurs';

const MAINTENANT = () => new Date().toISOString();

const COULEURS_DE_SECTION = [
    { valeur: '', libelle: 'Par defaut' },
    { valeur: '0', libelle: '0' }, { valeur: '1', libelle: '1' }, { valeur: '2', libelle: '2' },
    { valeur: '3', libelle: '3' }, { valeur: '5', libelle: '5' },
];

export const ANNONCES: Descripteur = {
    chemin: 'annonces',
    table: 'annonces',
    titre: 'Annonces',
    description: 'La vie etudiante : une carte au format affiche dans Campus, une fiche au toucher.',
    cle: ['id'],
    tri: { colonne: 'publiee_le', desc: true },
    liste: ['titre', 'emetteur', 'active', 'audience', 'etablissements', 'publiee_le', 'expire_le'],
    avertissement: 'Une annonce est visible des que « active » est cochee et que sa date de publication est passee ; une date d expiration vide veut dire jamais. Remplacer le visuel change son adresse (?v=N) pour que les telephones deja passes le rechargent.',
    champs: [
        { nom: 'titre', libelle: 'Titre', type: { type: 'texte' }, obligatoire: true },
        { nom: 'emetteur', libelle: 'Emetteur', type: { type: 'texte' }, obligatoire: true, aide: 'La pastille sous le visuel : « BDE Sciences », « UKit »…' },
        { nom: 'accroche', libelle: 'Accroche', type: { type: 'texte' }, aide: 'Une ligne sous le titre de la fiche.' },
        { nom: 'description', libelle: 'Description', type: { type: 'zone' }, aide: 'Le mini-langage des fiches : # Titre, # icone|Titre, - puce, -- sous-puce, > exergue, **gras**, = transition, ~ signature (docs/features/campus-vie-etudiante.md).' },
        { nom: 'image_url', libelle: 'Visuel', type: { type: 'image', dossier: 'annonces' }, aide: 'Une affiche carree (1:1), jamais recadree. Vide : la carte compose une affiche typographique.' },
        { nom: 'images', libelle: 'Galerie', type: { type: 'json', }, aide: 'Un tableau JSON d adresses d images, affiche sous la description : ["https://…/1.jpg", "https://…/2.jpg"].' },
        { nom: 'couleur', libelle: 'Couleur d identite', type: { type: 'choix', options: COULEURS_DE_SECTION }, aide: 'Un index de la palette des sections. Le 4 est interdit : il duplique le 0 en sombre.' },
        { nom: 'lat', libelle: 'Latitude', type: { type: 'nombre' }, aide: 'Avec la longitude, la fiche montre une carte « S y rendre ».' },
        { nom: 'lng', libelle: 'Longitude', type: { type: 'nombre' } },
        { nom: 'cta_texte', libelle: 'Libelle du bouton', type: { type: 'texte' }, aide: 'Le bouton n apparait que si le libelle et le lien sont tous les deux la.' },
        { nom: 'cta_lien', libelle: 'Lien du bouton', type: { type: 'texte' } },
        { nom: 'publiee_le', libelle: 'Publiee le', type: { type: 'date' }, obligatoire: true, defaut: MAINTENANT },
        { nom: 'expire_le', libelle: 'Expire le', type: { type: 'date' } },
        { nom: 'active', libelle: 'Active', type: { type: 'booleen' }, defaut: true },
        ...CIBLAGE,
    ],
    valider: (ligne) => (ligne.couleur === 4 || ligne.couleur === '4' ? 'La couleur 4 est interdite : elle duplique la 0 en theme sombre.' : null),
    avantEcriture: (ligne) => ({ ...ligne, couleur: typeof ligne.couleur === 'string' && ligne.couleur !== '' ? Number(ligne.couleur) : (typeof ligne.couleur === 'number' ? ligne.couleur : null) }),
};

export const MESSAGES: Descripteur = {
    chemin: 'messages',
    table: 'service_messages',
    titre: 'Messages de service',
    description: 'Parler aux utilisateurs : une information en bandeau, un avertissement ou un incident en feuille.',
    cle: ['id'],
    tri: { colonne: 'publie_le', desc: true },
    liste: ['titre', 'niveau', 'actif', 'audience', 'etablissements', 'version_min', 'version_max', 'publie_le'],
    avertissement: 'Un « info » se montre une fois en bandeau ; un « avertissement » une fois en feuille ; un « incident » en feuille, puis la pastille des onglets reste rouge tant qu il est actif. La cle est la memoire « vu » des telephones : garde-la pour corriger un message, change-la pour le refaire apparaitre.',
    champs: [
        { nom: 'niveau', libelle: 'Niveau', type: { type: 'choix', options: [{ valeur: 'info', libelle: 'Information' }, { valeur: 'avertissement', libelle: 'Avertissement' }, { valeur: 'incident', libelle: 'Incident' }] }, obligatoire: true, defaut: 'info' },
        { nom: 'titre', libelle: 'Titre', type: { type: 'texte' }, obligatoire: true },
        { nom: 'corps', libelle: 'Corps', type: { type: 'zone' }, aide: 'Le texte de la feuille. Ecrit une fois, en francais.' },
        { nom: 'cle', libelle: 'Cle', type: { type: 'texte' }, aide: 'Proposee depuis le titre si elle est vide. Stable d une correction a l autre.' },
        { nom: 'actif', libelle: 'Actif', type: { type: 'booleen' }, defaut: true },
        { nom: 'publie_le', libelle: 'Publie le', type: { type: 'date' }, obligatoire: true, defaut: MAINTENANT },
        { nom: 'expire_le', libelle: 'Expire le', type: { type: 'date' }, aide: 'Vide : n expire pas.' },
        ...CIBLAGE,
    ],
    avantEcriture: (ligne, existante) => {
        if (typeof ligne.cle === 'string' && ligne.cle !== '') return ligne;
        if (existante !== null && typeof existante.cle === 'string') return { ...ligne, cle: existante.cle };
        return { ...ligne, cle: proposerCle(String(ligne.titre ?? ''), new Date()) };
    },
};

export const TESTEURS: Descripteur = {
    chemin: 'testeurs',
    table: 'testeurs',
    titre: 'Testeurs',
    description: 'Les telephones qui voient les contenus d audience « testeurs » avant tout le monde.',
    cle: ['id'],
    tri: { colonne: 'cree_le', desc: true },
    liste: ['nom', 'id', 'cree_le'],
    avertissement: 'L identifiant se lit sur le telephone : A propos, sept touchers sur la version, onglet Testeur, « Copier ». Il ne quitte jamais l appareil — l application lit cette liste et compare chez elle. Retirer une ligne revoque le testeur.',
    champs: [
        { nom: 'id', libelle: 'Identifiant d installation', type: { type: 'uuid' }, obligatoire: true },
        { nom: 'nom', libelle: 'Nom', type: { type: 'texte' }, obligatoire: true, aide: '« iPhone de Kylian » : pour se souvenir de qui c est. Reste prive.' },
        { nom: 'cree_le', libelle: 'Enregistre le', type: { type: 'date' }, lectureSeule: true },
    ],
};

const DOSSIER_PAR_DOMAINE: Record<string, string> = { crous: 'restaurants', bibliotheque: 'bibliotheques', batiment: 'batiments', annonce: 'annonces' };

export const VISUELS: Descripteur = {
    chemin: 'visuels',
    table: 'visuels',
    titre: 'Visuels',
    description: 'Remplacer la photo d un contenu servi par une source tierce — un restaurant, une BU, un batiment, une annonce.',
    cle: ['domaine', 'cle'],
    tri: { colonne: 'maj_le', desc: true },
    liste: ['domaine', 'cle', 'image_url', 'maj_le'],
    avertissement: 'Trois etats, et les aplatir perdrait le seul moyen de retirer une image : une adresse remplace la photo de la source ; « aucune image » (la chaine vide) fait tomber l ecran sur son visuel de repli ; supprimer la ligne rend sa photo a la source. La cle est celle du contenu chez sa source (docs/backend.md).',
    champs: [
        { nom: 'domaine', libelle: 'Domaine', type: { type: 'choix', options: [{ valeur: 'crous', libelle: 'Restaurant (crous)' }, { valeur: 'bibliotheque', libelle: 'Bibliotheque' }, { valeur: 'batiment', libelle: 'Batiment' }, { valeur: 'annonce', libelle: 'Annonce' }] }, obligatoire: true },
        { nom: 'cle', libelle: 'Cle chez la source', type: { type: 'texte' }, obligatoire: true, aide: 'Le code Croustillant (21), l identifiant Affluences, le code du batiment (A28), l id d une annonce.' },
        { nom: 'image_url', libelle: 'Image', type: { type: 'image', dossier: (ligne) => DOSSIER_PAR_DOMAINE[String(ligne.domaine)] ?? 'visuels' }, videEstValeur: true },
    ],
};

export const ETABLISSEMENTS: Descripteur = {
    chemin: 'etablissements',
    table: 'etablissements',
    titre: 'Etablissements',
    description: 'Le catalogue des universites et de leurs portails : ce qui existe chez chacune.',
    cle: ['code'],
    tri: { colonne: 'ordre' },
    liste: ['code', 'nom', 'nom_court', 'ville', 'actif', 'ordre'],
    avertissement: 'Une ligne s ecrit ENTIERE : un champ vide veut dire « ce service n existe pas ici », et il gagne sur le socle embarque. Publier un Blueprint avant la ligne qui le nomme. Retirer « actif » fait disparaitre l etablissement de la liste ; les telephones qui l avaient choisi le disent.',
    champs: [
        { nom: 'code', libelle: 'Code', type: { type: 'texte' }, obligatoire: true, aide: 'Stable : c est la cle du cloisonnement sur les telephones.' },
        { nom: 'nom', libelle: 'Nom', type: { type: 'texte' }, obligatoire: true },
        { nom: 'nom_court', libelle: 'Nom court', type: { type: 'texte' } },
        { nom: 'ville', libelle: 'Ville', type: { type: 'texte' } },
        { nom: 'logo_url', libelle: 'Logo', type: { type: 'image', dossier: 'logos' } },
        { nom: 'actif', libelle: 'Actif', type: { type: 'booleen' }, defaut: true },
        { nom: 'ordre', libelle: 'Ordre', type: { type: 'nombre' }, defaut: 0 },
        { nom: 'portail_dossier', libelle: 'Blueprint du dossier', type: { type: 'texte' } },
        { nom: 'portail_messagerie', libelle: 'Blueprint de la messagerie', type: { type: 'texte' } },
        { nom: 'portail_documents', libelle: 'Blueprint des documents', type: { type: 'texte' } },
        { nom: 'portail_widgets', libelle: 'Widgets', type: { type: 'json' }, aide: '{"messagerie": {"blueprint": "…", "peremption_min": 20}}' },
        { nom: 'celcat_domaine', libelle: 'Domaine Celcat', type: { type: 'texte' } },
        { nom: 'celcat_res_types', libelle: 'Types Celcat', type: { type: 'json' } },
        { nom: 'edt', libelle: 'Emploi du temps iCal', type: { type: 'json' } },
        { nom: 'salles', libelle: 'Salles', type: { type: 'json' } },
        { nom: 'salles_libres', libelle: 'Salles libres', type: { type: 'json' } },
        { nom: 'bibliotheques_points', libelle: 'Points de balayage des BU', type: { type: 'json' } },
        { nom: 'services', libelle: 'Services', type: { type: 'json' } },
        { nom: 'libelles', libelle: 'Libelles', type: { type: 'json' } },
        { nom: 'crous_region', libelle: 'Region CROUS', type: { type: 'texte' } },
    ],
};

export const SALUTATIONS: Descripteur = {
    chemin: 'salutations',
    table: 'salutations',
    titre: 'Salutations',
    description: 'Le mot du haut de l onglet Scolarite, pour tout le monde, sans release.',
    cle: ['id'],
    tri: { colonne: 'priorite', desc: true },
    liste: ['id', 'priorite', 'actif', 'messages'],
    avertissement: 'Les garder COURTES : une seule ligne, prenom et date compris. La priorite tranche entre plusieurs regles ; le socle va de 0 a 90 par pas de dix, et a egalite le publie gagne.',
    champs: [
        { nom: 'id', libelle: 'Identifiant', type: { type: 'texte' }, obligatoire: true },
        { nom: 'priorite', libelle: 'Priorite', type: { type: 'nombre' }, defaut: 0 },
        { nom: 'condition', libelle: 'Condition', type: { type: 'json' }, aide: '{"heures": {"de": 22, "a": 5}, "jours": [0, 6], "plage": {"du": "12-20", "au": "01-05"}, "anniversaire": true} — toutes s appliquent (un ET) ; vide : toujours.', defaut: {} },
        { nom: 'messages', libelle: 'Messages', type: { type: 'json' }, obligatoire: true, aide: '{"fr": "Bonne rentree", "en": "Welcome back"} — le francais sert de repli.' },
        { nom: 'actif', libelle: 'Active', type: { type: 'booleen' }, defaut: true },
    ],
};

export const BATIMENTS: Descripteur = {
    chemin: 'batiments',
    table: 'batiments',
    titre: 'Batiments',
    description: 'Le referentiel des lieux : une surcouche champ par champ du fichier embarque.',
    cle: ['code'],
    tri: { colonne: 'code' },
    liste: ['code', 'nom', 'campus', 'acces_libre', 'image_url', 'maj_le'],
    avertissement: 'A l inverse du catalogue, un champ vide ne corrige RIEN : la valeur embarquee reste. Un code absent du fichier embarque est ajoute.',
    champs: [
        { nom: 'code', libelle: 'Code', type: { type: 'texte' }, obligatoire: true },
        { nom: 'nom', libelle: 'Nom', type: { type: 'texte' }, obligatoire: true },
        { nom: 'campus', libelle: 'Campus', type: { type: 'texte' } },
        { nom: 'latitude', libelle: 'Latitude', type: { type: 'nombre' } },
        { nom: 'longitude', libelle: 'Longitude', type: { type: 'nombre' } },
        { nom: 'acces_libre', libelle: 'Acces libre', type: { type: 'booleen' }, defaut: false },
        { nom: 'horaires', libelle: 'Horaires', type: { type: 'json' } },
        { nom: 'image_url', libelle: 'Photo', type: { type: 'image', dossier: 'batiments' } },
    ],
};

export const VERSION: Descripteur = {
    chemin: 'version',
    table: 'app_release',
    titre: 'Version publiee',
    description: 'La version courante et minimale par plateforme, et le lien du store.',
    cle: ['plateforme'],
    liste: ['plateforme', 'version_courante', 'version_minimale', 'lien_store', 'maj_le'],
    avertissement: 'Rien ne la lit encore dans l application ; c est la ligne que le protocole de sortie renseigne (docs/phase-6/6-1-z-sortie.md).',
    suppression: false,
    champs: [
        { nom: 'plateforme', libelle: 'Plateforme', type: { type: 'choix', options: [{ valeur: 'ios', libelle: 'iOS' }, { valeur: 'android', libelle: 'Android' }] }, obligatoire: true },
        { nom: 'version_courante', libelle: 'Version courante', type: { type: 'version' }, obligatoire: true },
        { nom: 'version_minimale', libelle: 'Version minimale', type: { type: 'version' }, obligatoire: true },
        { nom: 'lien_store', libelle: 'Lien du store', type: { type: 'texte' }, obligatoire: true },
        { nom: 'message', libelle: 'Message', type: { type: 'zone' } },
    ],
};

/** Les pages de publication, dans l'ordre de la navigation. */
export const RESSOURCES: readonly Descripteur[] = [ANNONCES, MESSAGES, TESTEURS, VISUELS, ETABLISSEMENTS, SALUTATIONS, BATIMENTS, VERSION];

export function ressourceDe(chemin: string): Descripteur | undefined {
    return RESSOURCES.find((ressource) => `/${ressource.chemin}` === chemin);
}

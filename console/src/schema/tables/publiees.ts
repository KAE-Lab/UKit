/**
 * Les tables qui se publient sans page dediee : testeurs, visuels, etablissements, salutations,
 * batiments, version publiee. Chaque avertissement reprend une regle ecrite dans docs/backend.md.
 */

import type { Descripteur } from '../descripteurs';
import { PLATEFORMES_D_APPAREIL } from './commun';

export const TESTEURS: Descripteur = {
    chemin: 'testeurs',
    table: 'testeurs',
    titre: 'Testeurs',
    description: 'Les téléphones qui voient les contenus d’audience « testeurs » avant tout le monde.',
    cle: ['id'],
    tri: { colonne: 'cree_le', desc: true },
    liste: ['nom', 'id', 'cree_le'],
    recherche: ['nom', 'id'],
    avertissement: 'L’identifiant se lit sur le téléphone : À propos, sept touchers sur la version, onglet Testeur, « Copier ». Il ne quitte jamais l’appareil — l’application lit cette liste et compare chez elle. Retirer une ligne révoque le testeur.',
    champs: [
        { nom: 'id', libelle: 'Identifiant d’installation', type: { type: 'uuid' }, obligatoire: true },
        { nom: 'nom', libelle: 'Nom', type: { type: 'texte' }, obligatoire: true, aide: '« iPhone de Kylian » : pour se souvenir de qui c’est. Reste privé.' },
        { nom: 'cree_le', libelle: 'Enregistré le', type: { type: 'date' }, lectureSeule: true },
    ],
};

const DOSSIER_PAR_DOMAINE: Record<string, string> = { crous: 'restaurants', bibliotheque: 'bibliotheques', batiment: 'batiments', annonce: 'annonces' };

export const VISUELS: Descripteur = {
    chemin: 'visuels',
    table: 'visuels',
    titre: 'Visuels',
    description: 'Remplacer la photo d’un contenu servi par une source tierce — un restaurant, une BU, un bâtiment, une annonce.',
    cle: ['domaine', 'cle'],
    tri: { colonne: 'maj_le', desc: true },
    liste: ['image_url', 'domaine', 'cle', 'maj_le'],
    filtres: ['domaine'],
    recherche: ['cle'],
    avertissement: 'Trois états, et les aplatir perdrait le seul moyen de retirer une image : une adresse remplace la photo de la source ; « aucune image » (la chaîne vide) fait tomber l’écran sur son visuel de repli ; supprimer la ligne rend sa photo à la source. La clé est celle du contenu chez sa source (docs/backend.md).',
    champs: [
        { nom: 'domaine', libelle: 'Domaine', type: { type: 'choix', options: [{ valeur: 'crous', libelle: 'Restaurant (crous)' }, { valeur: 'bibliotheque', libelle: 'Bibliothèque' }, { valeur: 'batiment', libelle: 'Bâtiment' }, { valeur: 'annonce', libelle: 'Annonce' }] }, obligatoire: true },
        { nom: 'cle', libelle: 'Clé chez la source', type: { type: 'texte' }, obligatoire: true, aide: 'Le code Croustillant (21), l’identifiant Affluences, le code du bâtiment (A28), l’id d’une annonce.' },
        { nom: 'image_url', libelle: 'Image', type: { type: 'image', dossier: (ligne) => DOSSIER_PAR_DOMAINE[String(ligne.domaine)] ?? 'visuels' }, videEstValeur: true },
        { nom: 'maj_le', libelle: 'Mis à jour le', type: { type: 'date' }, lectureSeule: true },
    ],
};

export const ETABLISSEMENTS: Descripteur = {
    chemin: 'etablissements',
    table: 'etablissements',
    titre: 'Établissements',
    description: 'Le catalogue des universités et de leurs portails : ce qui existe chez chacune.',
    cle: ['code'],
    tri: { colonne: 'ordre' },
    liste: ['logo_url', 'code', 'nom', 'nom_court', 'ville', 'actif', 'ordre'],
    filtres: ['actif'],
    recherche: ['code', 'nom', 'nom_court', 'ville'],
    avertissement: 'Une ligne s’écrit ENTIÈRE : un champ vide veut dire « ce service n’existe pas ici », et il gagne sur le socle embarqué. Publier un Blueprint avant la ligne qui le nomme. Retirer « actif » fait disparaître l’établissement de la liste ; les téléphones qui l’avaient choisi le disent.',
    champs: [
        { nom: 'code', libelle: 'Code', type: { type: 'texte' }, obligatoire: true, aide: 'Stable : c’est la clé du cloisonnement sur les téléphones.' },
        { nom: 'nom', libelle: 'Nom', type: { type: 'texte' }, obligatoire: true },
        { nom: 'nom_court', libelle: 'Nom court', type: { type: 'texte' } },
        { nom: 'ville', libelle: 'Ville', type: { type: 'texte' } },
        { nom: 'logo_url', libelle: 'Logo', type: { type: 'image', dossier: 'etablissements' } },
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
        { nom: 'crous_region', libelle: 'Région CROUS', type: { type: 'texte' } },
    ],
};

export const SALUTATIONS: Descripteur = {
    chemin: 'salutations',
    table: 'salutations',
    titre: 'Salutations',
    description: 'Le mot du haut de l’onglet Scolarité, pour tout le monde, sans release.',
    cle: ['id'],
    tri: { colonne: 'priorite', desc: true },
    liste: ['id', 'priorite', 'actif', 'messages'],
    filtres: ['actif'],
    recherche: ['id'],
    avertissement: 'Les garder COURTES : une seule ligne, prénom et date compris. La priorité tranche entre plusieurs règles ; le socle va de 0 à 90 par pas de dix, et à égalité le publié gagne.',
    champs: [
        { nom: 'id', libelle: 'Identifiant', type: { type: 'texte' }, obligatoire: true },
        { nom: 'priorite', libelle: 'Priorité', type: { type: 'nombre' }, defaut: 0 },
        { nom: 'condition', libelle: 'Condition', type: { type: 'json' }, aide: '{"heures": {"de": 22, "a": 5}, "jours": [0, 6], "plage": {"du": "12-20", "au": "01-05"}, "anniversaire": true} — toutes s’appliquent (un ET) ; vide : toujours.', defaut: {} },
        { nom: 'messages', libelle: 'Messages', type: { type: 'json' }, obligatoire: true, aide: '{"fr": "Bonne rentrée", "en": "Welcome back"} — le français sert de repli.' },
        { nom: 'actif', libelle: 'Active', type: { type: 'booleen' }, defaut: true },
    ],
};

export const BATIMENTS: Descripteur = {
    chemin: 'batiments',
    table: 'batiments',
    titre: 'Bâtiments',
    description: 'Le référentiel des lieux : une surcouche champ par champ du fichier embarqué.',
    cle: ['code'],
    tri: { colonne: 'code' },
    liste: ['image_url', 'code', 'nom', 'campus', 'acces_libre', 'maj_le'],
    filtres: ['acces_libre'],
    recherche: ['code', 'nom', 'campus'],
    avertissement: 'À l’inverse du catalogue, un champ vide ne corrige RIEN : la valeur embarquée reste. Un code absent du fichier embarqué est ajouté.',
    champs: [
        { nom: 'code', libelle: 'Code', type: { type: 'texte' }, obligatoire: true },
        { nom: 'nom', libelle: 'Nom', type: { type: 'texte' }, obligatoire: true },
        { nom: 'campus', libelle: 'Campus', type: { type: 'texte' }, aide: 'Le libellé du lieu (« Talence »), pas un code du catalogue : la recherche le parcourt.' },
        { nom: 'latitude', libelle: 'Latitude', type: { type: 'nombre' } },
        { nom: 'longitude', libelle: 'Longitude', type: { type: 'nombre' } },
        { nom: 'acces_libre', libelle: 'Accès libre', type: { type: 'booleen' }, defaut: false },
        { nom: 'horaires', libelle: 'Horaires', type: { type: 'json' } },
        { nom: 'image_url', libelle: 'Photo', type: { type: 'image', dossier: 'batiments' } },
        { nom: 'maj_le', libelle: 'Mis à jour le', type: { type: 'date' }, lectureSeule: true },
    ],
};

export const VERSION: Descripteur = {
    chemin: 'version',
    table: 'app_release',
    titre: 'Version publiée',
    description: 'La version courante et minimale par plateforme, et le lien du store.',
    cle: ['plateforme'],
    liste: ['plateforme', 'version_courante', 'version_minimale', 'lien_store', 'maj_le'],
    avertissement: 'Rien ne la lit encore dans l’application ; c’est la ligne que le protocole de sortie renseigne (docs/phase-6/6-1-z-sortie.md).',
    suppression: false,
    champs: [
        { nom: 'plateforme', libelle: 'Plateforme', type: { type: 'choix', options: PLATEFORMES_D_APPAREIL }, obligatoire: true },
        { nom: 'version_courante', libelle: 'Version courante', type: { type: 'version' }, obligatoire: true },
        { nom: 'version_minimale', libelle: 'Version minimale', type: { type: 'version' }, obligatoire: true },
        { nom: 'lien_store', libelle: 'Lien du store', type: { type: 'texte' }, obligatoire: true },
        { nom: 'message', libelle: 'Message', type: { type: 'zone' } },
        { nom: 'maj_le', libelle: 'Mis à jour le', type: { type: 'date' }, lectureSeule: true },
    ],
};

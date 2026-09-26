/**
 * L'equipe de la console (jalon 7-H) : qui peut quoi, et sur quels campus. Une page d'admin — la base ne
 * laisse lire toute la table et l'ecrire qu'a un admin, chacun ne lisant que sa propre ligne.
 *
 * Inviter passe par la fonction `editeurs` : un compte se cree avec la cle de service, qui ne va jamais
 * dans un navigateur. Revoquer aussi, parce qu'il supprime le compte, et donner un nouveau mot de passe
 * provisoire. Changer un role ou des campus est une ecriture ordinaire, journalisee au nom de l'admin.
 * Les gestes chargent la fonction a la demande : le descripteur reste une donnee pure.
 */

import { ROLES } from '../../auth/droits';
import type { Descripteur } from '../descripteurs';
import type { Ligne } from '../../supabase';

const FORME_EMAIL = { motif: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Une adresse e-mail est attendue : prenom.nom@exemple.fr.' };

/** Les campus ne se proposent qu'a un redacteur — ou quand la ligne en porte encore, pour pouvoir les retirer. */
function campusAPropos(valeurs: Ligne): boolean {
    return valeurs.role === 'redacteur' || (Array.isArray(valeurs.etablissements) && valeurs.etablissements.length > 0);
}

/** Un admin ne se revoque pas et ne remplace pas son propre mot de passe ici : un autre admin le fait, ou la page Compte. */
const PAS_SOI = (ligne: Ligne, compte: { readonly email: string }) => ligne.email !== compte.email;

export const EDITEURS: Descripteur = {
    chemin: 'equipe',
    table: 'editeurs',
    titre: 'Équipe',
    description: 'Qui peut quoi dans la console, et sur quels campus : inviter, changer un rôle, révoquer.',
    nouvelle: 'Inviter quelqu’un',
    section: 'equipe',
    cle: ['email'],
    tri: { colonne: 'ajoute_le' },
    liste: ['email', 'role', 'etablissements', 'ajoute_le', 'provisoire_le'],
    filtres: ['role'],
    recherche: ['email'],
    avertissement: 'Un admin peut tout, l’équipe comprise ; un rédacteur crée, modifie, programme et archive les annonces de ses campus ; un lecteur lit. Inviter crée le compte avec un mot de passe provisoire, montré une seule fois : transmets-le de vive voix, il se change à la première connexion. Révoquer coupe les droits à la requête suivante et supprime le compte ; le journal garde l’adresse.',
    champs: [
        { nom: 'email', libelle: 'E-mail', type: { type: 'texte' }, obligatoire: true, forme: FORME_EMAIL, aide: 'L’identifiant de connexion. Il ne se change pas : pour une autre adresse, révoque puis invite.' },
        { nom: 'role', libelle: 'Rôle', type: { type: 'choix', options: ROLES }, obligatoire: true, defaut: 'redacteur', aide: 'Admin : tout, l’équipe comprise. Rédacteur : les annonces de ses campus. Lecteur : lit, sans écrire.' },
        {
            nom: 'etablissements',
            libelle: 'Campus confiés',
            type: { type: 'etablissements' },
            visible: campusAPropos,
            aide: 'Aucune case cochée : tous les campus. Un rédacteur ne publie que les annonces dont tous les campus sont les siens ; une annonce pour tous les campus reste un geste d’admin.',
        },
        { nom: 'ajoute_le', libelle: 'Dans l’équipe depuis', type: { type: 'date' }, lectureSeule: true },
        { nom: 'provisoire_le', libelle: 'Mot de passe provisoire', type: { type: 'date' }, lectureSeule: true, aide: 'Quand la console a donné le dernier ; la base ne sait pas quand il a été changé.' },
    ],
    // L'adresse telle que l'authentification la range ; et des campus pour un redacteur seulement, comme
    // le `check` de la table l'exige.
    avantEcriture: (ligne) => ({
        ...ligne,
        email: typeof ligne.email === 'string' ? ligne.email.trim().toLowerCase() : ligne.email,
        etablissements: ligne.role === 'redacteur' ? ligne.etablissements : null,
    }),
    creer: async (ligne) => (await import('../../lib/equipe')).inviter(ligne),
    retrait: {
        libelle: 'Révoquer',
        confirmation: 'Ses droits sont coupés à la requête suivante, et son compte est supprimé : revenir demandera une nouvelle invitation. Le journal garde son adresse et tout ce que ce compte a écrit.',
        disponible: PAS_SOI,
        executer: async (ligne) => (await import('../../lib/equipe')).revoquer(ligne),
    },
    actions: [
        {
            libelle: 'Nouveau mot de passe provisoire',
            icone: 'cle',
            confirmation: 'Son mot de passe actuel cessera de fonctionner. Un mot de passe provisoire te sera montré une seule fois, à transmettre de vive voix.',
            disponible: PAS_SOI,
            executer: async (ligne) => (await import('../../lib/equipe')).reinitialiser(ligne),
        },
    ],
};

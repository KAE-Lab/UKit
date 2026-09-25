import type { Descripteur, Option } from '../descripteurs';

export const ETATS_DE_RETOUR: readonly Option[] = [
    { valeur: 'nouveau', libelle: 'Nouveau', ton: 'accent' },
    { valeur: 'en_attente', libelle: 'En attente', ton: 'avert' },
    { valeur: 'traite', libelle: 'Traité', ton: 'ok' },
    { valeur: 'refuse', libelle: 'Refusé', ton: 'panne' },
];

export const NATURES_DE_RETOUR: readonly Option[] = [
    { valeur: 'bug', libelle: 'Bug' },
    { valeur: 'fonctionnalite', libelle: 'Fonctionnalité' },
    { valeur: 'campus', libelle: 'Campus' },
    { valeur: 'autre', libelle: 'Autre' },
];

/** Les etats d'un retour encore ouvert : la vue par defaut de la page Retours. */
export const ETATS_OUVERTS: readonly string[] = ['nouveau', 'en_attente'];

// Tout ce qui vient du formulaire est en lecture seule : le schema ne renvoie pas ces champs, et
// la base n'accorde l'update qu'aux trois autres (policies.sql). Les deux gardes disent la meme
// chose, et c'est voulu. La page Retours est dediee (pages/Retours) ; le descripteur reste la
// description de reference de la table.
//
// L'adresse laissee n'y est pas : depuis 7-H, la base ne la laisse lire a aucun compte de la console —
// un admin la demande a public.contact_du_retour(), au clic (pages/Retours/Contact.tsx). La console nomme
// donc ses colonnes : `select *` lui serait refuse en entier.
export const RETOURS: Descripteur = {
    chemin: 'retours',
    table: 'retours',
    section: 'suivre',
    titre: 'Retours',
    description: 'Ce que les utilisateurs écrivent dans le formulaire : importé toutes les 72 heures, lu et reclassé ici.',
    cle: ['id'],
    colonnes: 'id,recu_le,nature,campus,section,appareil,systeme,version_app,texte,volontaire,reponses,etat,note,importe_le',
    tri: { colonne: 'recu_le', desc: true },
    liste: ['recu_le', 'nature', 'etat', 'campus', 'section', 'texte'],
    filtres: ['etat', 'nature'],
    recherche: ['texte', 'campus', 'note'],
    avertissement: 'Lignes importées depuis le formulaire : seuls la nature, l’état et la note se modifient, par un admin, et le reste est ce qui a été dit. Retoucher la feuille de réponses recréerait la ligne — on reclasse ici. Un retour qui décrit un défaut devient une entrée écrite à la main dans docs/defauts-fonctionnels.md. L’adresse laissée ne se lit que par un admin, et ne se partage jamais en capture.',
    creation: false,
    suppression: false,
    vide: 'Aucun retour pour ces filtres. Le workflow Retours écrit ici toutes les 72 heures dès qu’il est armé ; depuis le poste, npm run retours:import.',
    champs: [
        { nom: 'etat', libelle: 'État', type: { type: 'choix', options: ETATS_DE_RETOUR }, obligatoire: true, aide: '« Traité » quand la correction est faite ou la demande servie ; « en attente » quand elle dépend d’autre chose ; « refusé » se justifie dans la note.' },
        { nom: 'nature', libelle: 'Nature', type: { type: 'choix', options: NATURES_DE_RETOUR }, obligatoire: true, aide: 'Devinée à l’import depuis la case cochée ; à reclasser si le texte dit autre chose.' },
        { nom: 'note', libelle: 'Note', type: { type: 'zone' }, aide: 'Ce qu’on en a fait : la ligne du registre, le commit, la raison du refus.' },
        { nom: 'recu_le', libelle: 'Reçu le', type: { type: 'date' }, lectureSeule: true },
        { nom: 'texte', libelle: 'Texte', type: { type: 'zone' }, lectureSeule: true },
        { nom: 'campus', libelle: 'Campus demandé', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'section', libelle: 'Section', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'appareil', libelle: 'Appareil', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'systeme', libelle: 'Système', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'version_app', libelle: 'Version de l’application', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'volontaire', libelle: 'Prêt·e à prêter un accès', type: { type: 'booleen' }, lectureSeule: true },
        { nom: 'reponses', libelle: 'Réponse entière', type: { type: 'json' }, lectureSeule: true },
        { nom: 'importe_le', libelle: 'Importé le', type: { type: 'date' }, lectureSeule: true },
        { nom: 'id', libelle: 'Identifiant', type: { type: 'texte' }, lectureSeule: true },
    ],
};

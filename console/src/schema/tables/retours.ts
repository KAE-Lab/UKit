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

/** D'ou vient un retour : l'import du formulaire Google, ou l'ecran natif de la 7.0 (phase 8, lot 3). */
export const SOURCES_DE_RETOUR: readonly Option[] = [
    { valeur: 'formulaire', libelle: 'Formulaire' },
    { valeur: 'app', libelle: 'Application' },
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
// donc ses colonnes : `select *` lui serait refuse en entier. L'empreinte de la cle de reponse d'un retour
// natif non plus (lot 3) : la console sait seulement si la reponse a ete acceptee.
export const RETOURS: Descripteur = {
    chemin: 'retours',
    table: 'retours',
    section: 'communaute',
    titre: 'Retours',
    description: 'Ce que les utilisateurs écrivent : depuis l’application, et l’import du formulaire Google toutes les 72 heures. Lu, reclassé et répondu ici.',
    cle: ['id'],
    colonnes: 'id,recu_le,nature,campus,section,appareil,systeme,version_app,texte,volontaire,reponses,etat,note,importe_le,source,contexte,captures,probleme,atteste,reponse_possible,clos_le,captures_purgees_le',
    tri: { colonne: 'recu_le', desc: true },
    liste: ['recu_le', 'nature', 'etat', 'source', 'campus', 'section', 'texte'],
    filtres: ['etat', 'nature', 'source'],
    recherche: ['texte', 'campus', 'note'],
    avertissement: 'Seuls la nature, l’état et la note se modifient, par un admin, et le reste est ce qui a été dit. Un retour de l’application qui accepte la réponse montre son état à l’étudiant, et reçoit les réponses écrites ici. Retoucher la feuille du formulaire recréerait la ligne importée — on reclasse ici. Un retour qui décrit un défaut devient une entrée écrite à la main dans docs/defauts-fonctionnels.md. L’adresse laissée et les captures ne se lisent que par un admin, et ne se partagent jamais en capture.',
    creation: false,
    suppression: false,
    vide: 'Aucun retour pour ces filtres. L’application écrit ici à chaque envoi ; le workflow Retours, toutes les 72 heures dès qu’il est armé.',
    champs: [
        { nom: 'etat', libelle: 'État', type: { type: 'choix', options: ETATS_DE_RETOUR }, obligatoire: true, aide: '« Traité » quand la correction est faite ou la demande servie ; « en attente » quand elle dépend d’autre chose ; « refusé » se justifie dans la note. L’étudiant qui a accepté la réponse le lit : reçu, en cours, traité, clos.' },
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
        { nom: 'source', libelle: 'Source', type: { type: 'choix', options: SOURCES_DE_RETOUR }, lectureSeule: true },
        { nom: 'contexte', libelle: 'Contexte joint', type: { type: 'json' }, lectureSeule: true },
        { nom: 'captures', libelle: 'Captures', type: { type: 'nombre' }, lectureSeule: true },
        { nom: 'probleme', libelle: 'Problème connu', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'atteste', libelle: 'Appareil attesté', type: { type: 'booleen' }, lectureSeule: true },
        { nom: 'reponse_possible', libelle: 'Réponse acceptée', type: { type: 'booleen' }, lectureSeule: true },
        { nom: 'clos_le', libelle: 'Clos le', type: { type: 'date' }, lectureSeule: true },
        { nom: 'captures_purgees_le', libelle: 'Captures effacées le', type: { type: 'date' }, lectureSeule: true },
        { nom: 'id', libelle: 'Identifiant', type: { type: 'texte' }, lectureSeule: true },
    ],
};

/**
 * Les tables qui se lisent seulement, sans page de publication : le journal. Le descripteur sert a
 * la liste generique (colonnes, filtres, recherche, tri) ; il n'a ni formulaire ni creation.
 */

import { TABLES_JOURNALISEES } from '../journal';
import type { Descripteur } from '../descripteurs';

export const JOURNAL: Descripteur = {
    chemin: 'journal',
    table: 'journal',
    titre: 'Journal',
    description: 'Chaque écriture dans une table publiable : avant, après, qui, quand. Rien ne le contourne.',
    section: 'suivre',
    cle: ['id'],
    tri: { colonne: 'id', desc: true },
    liste: ['quand', 'table_name', 'operation', 'ligne_id', 'par'],
    filtres: ['table_name', 'operation'],
    recherche: ['ligne_id', 'par'],
    triables: ['id', 'quand', 'table_name', 'operation', 'par'],
    creation: false,
    suppression: false,
    vide: 'Aucune écriture pour ces filtres.',
    champs: [
        { nom: 'id', libelle: 'Numéro', type: { type: 'nombre' }, lectureSeule: true },
        { nom: 'quand', libelle: 'Quand', type: { type: 'date' }, lectureSeule: true },
        { nom: 'table_name', libelle: 'Table', type: { type: 'choix', options: TABLES_JOURNALISEES.map((table) => ({ valeur: table, libelle: table, ton: 'accent' as const })) }, lectureSeule: true },
        { nom: 'operation', libelle: 'Opération', type: { type: 'choix', options: [{ valeur: 'INSERT', libelle: 'INSERT', ton: 'ok' }, { valeur: 'UPDATE', libelle: 'UPDATE' }, { valeur: 'DELETE', libelle: 'DELETE', ton: 'panne' }] }, lectureSeule: true },
        { nom: 'ligne_id', libelle: 'Ligne', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'par', libelle: 'Par', type: { type: 'texte' }, lectureSeule: true },
        { nom: 'avant', libelle: 'Avant', type: { type: 'json' }, lectureSeule: true },
        { nom: 'apres', libelle: 'Après', type: { type: 'json' }, lectureSeule: true },
    ],
};

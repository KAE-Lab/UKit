/**
 * Le rapport partenaire (7-G) : pour une annonce, ou toutes celles d'un partenaire, sur une periode,
 * l'entonnoir par campus et par semaine, la definition de chaque chiffre en bas, exportable en CSV.
 *
 * C'est le seul chiffre de la console qui sort de l'equipe : il porte tous les garde-fous de
 * docs/mesure.md. Un campus a moins de cinq impressions sur la periode ne se nomme pas, il passe dans
 * « campus regroupes » ; toute case sous cinq s'ecrit « moins de 5 », et le secret secondaire
 * (cases.ts) cache ce qui la redonnerait par difference avec le total. Le campus et la semaine sont
 * deux decoupages du total, pas un tableau croise : chaque case d'un croisement serait petite, et ses
 * deux totaux la redonneraient.
 *
 * Le CSV est fait pour un tableur francais : separateur point-virgule, virgule decimale, fins de
 * ligne CRLF, et l'indicateur d'ordre des octets en tete, sans lequel Excel lit les accents en Latin-1.
 *
 * Pur : joue par `npm test` a la racine du depot (rapport.test.ts).
 */

import {
    entonnoir, entonnoirParCampus, protegerLesLignes, SEUIL_DE_TAUX, tauxAffiche, type Entonnoir, type EntonnoirAffiche, type LigneProtegee, type Taux,
} from './annonces';
import { masquer, regrouper, SEUIL_PETITE_CASE, type Affiche } from './cases';
import type { Mesure } from './mesures';
import { contient, libelleDePeriode, semainesDe, type Periode } from './periode';

/** La cle du groupe des campus trop petits pour etre nommes. */
export const CAMPUS_REGROUPES = '*regroupes';

export interface SemaineDuRapport extends LigneProtegee {
    readonly semaine: Periode;
}

export interface Rapport {
    readonly periode: Periode;
    readonly total: Entonnoir;
    /** Le total s'affiche seul : seules ses petites cases se cachent. */
    readonly totalAffiche: EntonnoirAffiche;
    /** Les campus nommes, du plus vu au moins vu, puis les campus regroupes. */
    readonly parCampus: readonly LigneProtegee[];
    /** Les semaines du lundi au dimanche, rognees a la periode, dans l'ordre du calendrier. */
    readonly parSemaine: readonly SemaineDuRapport[];
}

const EVENEMENTS = ['impressions', 'ouvertures', 'actions'] as const;

function regrouperLesCampus(parCampus: ReadonlyMap<string, Entonnoir>): LigneProtegee[] {
    const petits = new Set([...parCampus].filter(([, e]) => e.impressions < SEUIL_PETITE_CASE).map(([c]) => c));
    const parEvenement = EVENEMENTS.map((cle) => regrouper(new Map([...parCampus].map(([c, e]) => [c, e[cle]])), (c) => petits.has(c), CAMPUS_REGROUPES));
    const [impressions, ouvertures, actions] = parEvenement;
    const campus = [...new Set(parEvenement.flatMap((m) => [...m.keys()]))];
    const lignes = protegerLesLignes(campus.map((c) => ({ cle: c, impressions: impressions?.get(c) ?? 0, ouvertures: ouvertures?.get(c) ?? 0, actions: actions?.get(c) ?? 0 })));
    return [...lignes.filter((l) => l.cle !== CAMPUS_REGROUPES), ...lignes.filter((l) => l.cle === CAMPUS_REGROUPES)];
}

/** `mesures` : les lignes deja filtrees (periode, testeurs, campus) ; `garder` : les annonces du rapport. */
export function rapport(mesures: readonly Mesure[], garder: (cle: string) => boolean, periode: Periode): Rapport {
    const total = entonnoir(mesures, garder);
    const semaines = semainesDe(periode).map((semaine) => ({ cle: semaine.du, semaine, ...entonnoir(mesures.filter((m) => contient(semaine, m.jour)), garder) }));
    return {
        periode,
        total,
        totalAffiche: { impressions: masquer(total.impressions), ouvertures: masquer(total.ouvertures), actions: masquer(total.actions) },
        parCampus: regrouperLesCampus(entonnoirParCampus(mesures, garder)),
        parSemaine: protegerLesLignes(semaines, { trier: false }),
    };
}

/** La definition de chaque chiffre, ecrite en bas du rapport, a l'ecran, a l'impression et dans l'export. */
export const DEFINITIONS: readonly { readonly terme: string; readonly definition: string }[] = [
    { terme: 'Impression', definition: 'la carte de l’annonce visible à moitié pendant une seconde dans l’application, comptée une fois par session : un étudiant qui ouvre UKit trois fois dans la journée la voit trois fois.' },
    { terme: 'Ouverture', definition: 'la fiche de l’annonce ouverte.' },
    { terme: 'Action', definition: 'le bouton d’action de la fiche touché.' },
    { terme: 'Taux d’ouverture', definition: `les ouvertures rapportées aux impressions. Sous ${SEUIL_DE_TAUX} impressions, il est trop fragile pour se lire seul.` },
    { terme: 'Taux d’action', definition: `les actions rapportées aux ouvertures, avec la même réserve sous ${SEUIL_DE_TAUX} ouvertures.` },
    { terme: `Moins de ${SEUIL_PETITE_CASE}`, definition: `une case qui compterait moins de ${SEUIL_PETITE_CASE} n’est pas donnée, pour qu’aucun chiffre ne désigne une personne ; un campus sous ce seuil en impressions est compté dans « campus regroupés ».` },
    { terme: 'Masqué', definition: `une case de ${SEUIL_PETITE_CASE} ou plus, cachée parce qu’avec le total elle redonnerait une case « moins de ${SEUIL_PETITE_CASE} ».` },
    { terme: 'Périmètre', definition: 'les téléphones en version 6.3 ou plus récente, qui comptent sans identifiant ; les versions antérieures ne comptent rien.' },
];

const SEPARATEUR = ';';
const FIN_DE_LIGNE = '\r\n';
const BOM = '﻿';
const POURCENT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });

/**
 * Un champ du CSV. Un texte qui commence comme une formule (`=`, `+`, `-`, `@`, une tabulation) serait
 * execute par le tableur du partenaire : un titre d'annonce `=HYPERLINK(…)` est neutralise par une
 * apostrophe, la parade d'OWASP.
 */
export function champ(valeur: string): string {
    const neutre = /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
    return /[;"\r\n]/.test(neutre) ? `"${neutre.replace(/"/g, '""')}"` : neutre;
}

function compte(a: Affiche): string {
    if (a === null) return `moins de ${SEUIL_PETITE_CASE}`;
    return typeof a === 'number' ? String(a) : 'masqué';
}

function pourcentage(t: Taux): string {
    return t.valeur === null ? '' : POURCENT.format(t.valeur * 100);
}

function cellules(a: EntonnoirAffiche): string[] {
    return [compte(a.impressions), compte(a.ouvertures), pourcentage(tauxAffiche(a.ouvertures, a.impressions)), compte(a.actions), pourcentage(tauxAffiche(a.actions, a.ouvertures))];
}

export interface ContexteDExport {
    /** Le titre de l'annonce, ou le nom du partenaire. */
    readonly sujet: string;
    readonly nomDuCampus: (code: string) => string;
    readonly testeurs: boolean;
}

export function libelleDuCampus(code: string, nomDuCampus: (code: string) => string): string {
    // Pas « autres campus » : le catalogue a deja un « Autre campus », et les deux lignes se confondraient.
    return code === CAMPUS_REGROUPES ? 'Campus regroupés' : nomDuCampus(code);
}

export function csvDuRapport(r: Rapport, contexte: ContexteDExport): string {
    const lignes: string[][] = [
        ['Rapport', contexte.sujet],
        ['Période', libelleDePeriode(r.periode)],
        ['Appareils testeurs', contexte.testeurs ? 'inclus' : 'exclus'],
        [],
        ['Découpage', 'Campus ou semaine', 'Impressions', 'Ouvertures', 'Taux d’ouverture (%)', 'Actions', 'Taux d’action (%)'],
        ['Total', 'Toute la période', ...cellules(r.totalAffiche)],
        ...r.parCampus.map((c) => ['Campus', libelleDuCampus(c.cle, contexte.nomDuCampus), ...cellules(c.affiche)]),
        ...r.parSemaine.map((s) => ['Semaine', libelleDePeriode(s.semaine), ...cellules(s.affiche)]),
        [],
        ['Définitions'],
        ...DEFINITIONS.map((d) => [d.terme, d.definition]),
    ];
    return BOM + lignes.map((l) => l.map(champ).join(SEPARATEUR)).join(FIN_DE_LIGNE) + FIN_DE_LIGNE;
}

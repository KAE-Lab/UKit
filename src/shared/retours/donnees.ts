/**
 * Ce que l'application garde et envoie d'un retour, sans plateforme (lot 3 ; docs/phase-8/3-formulaire.md) :
 * le texte signe, la boite d'envoi et la liste « Mes retours », la lecture des reponses fondue dans
 * cette liste, ce qui reste a lire et a annoncer, le contexte d'un « moi aussi », et la cadence de la
 * proposition apres une capture d'ecran.
 *
 * Pur, comme `communaute/donnees.ts` : l'instant arrive en parametre, rien ne touche au reseau ni au disque.
 */

export type NatureDeRetour = 'bug' | 'fonctionnalite' | 'campus';

/** Le retour tel qu'il part, champ pour champ ce que la fonction `communaute` borne. */
export interface RetourASigner {
    /** L'identifiant du depot, tire sur l'appareil : un depot rejoue retrouve sa ligne au lieu d'en ecrire une autre. */
    readonly depot: string;
    readonly nature: NatureDeRetour;
    readonly texte: string;
    readonly campus: string | null;
    readonly volontaire: boolean;
    readonly contact: string | null;
    readonly probleme: string | null;
    readonly contexte: Readonly<Record<string, unknown>> | null;
    readonly captures: number;
    /** L'empreinte SHA-256, en hexadecimal, de la cle de reponse tiree sur l'appareil ; `null` sans accord. */
    readonly cle_reponse: string | null;
}

/** Le texte exact que l'appareil signe ou fait attester, et que la fonction relit. */
export function serialiserRetour(defi: string, cle: string, retour: RetourASigner): string {
    return JSON.stringify({ defi, cle, retour });
}

export interface EnvoiDeCapture {
    readonly chemin: string;
    readonly jeton: string;
}

/** Les URL de televersement que rend un depot accepte ; une forme inattendue n'en donne aucune. */
export function lireEnvois(corps: unknown): EnvoiDeCapture[] {
    const envois = (corps as { envois?: unknown } | null)?.envois;
    if (!Array.isArray(envois)) return [];
    return envois.filter((e): e is EnvoiDeCapture =>
        typeof e === 'object' && e !== null && typeof (e as EnvoiDeCapture).chemin === 'string'
        && /^[0-9a-f]{64}\/[1-3]\.jpg$/.test((e as EnvoiDeCapture).chemin) && typeof (e as EnvoiDeCapture).jeton === 'string');
}

// ---------------------------------------------------------------------------
// La boite d'envoi et « Mes retours »
// ---------------------------------------------------------------------------

/** Un retour qui attend le reseau : tout ce qu'il faut pour le deposer, captures comprises. */
export interface RetourEnAttente {
    readonly local: string;
    readonly creeLe: number;
    readonly retour: RetourASigner;
    /** Les fichiers des captures, dans le repertoire prive de l'application. */
    readonly fichiers: readonly string[];
    /** La cle de reponse en base64, gardee sur l'appareil ; `null` sans accord. */
    readonly cle: string | null;
    /**
     * Le jour de Paris ou un plafond l'a differe : il ne se redepose pas avant le lendemain, chaque essai
     * comptant a l'adresse et, sans attestation, au plafond qu'elle partage avec les contributions.
     */
    readonly differe?: string;
}

/** Ce qui se redepose maintenant : tout, sauf ce qu'un plafond a differe aujourd'hui. */
export function aRedeposer(boite: readonly RetourEnAttente[], jour: string): RetourEnAttente[] {
    return boite.filter((attente) => attente.differe !== jour);
}

export type StatutDuRetour = 'nouveau' | 'en_attente' | 'traite' | 'refuse';

export interface Reponse {
    readonly texte: string;
    readonly le: number;
}

/** Un retour de « Mes retours ». Le statut et les reponses ne se lisent qu'avec une cle. */
export interface RetourConnu {
    readonly local: string;
    readonly nature: NatureDeRetour;
    readonly envoyeLe: number;
    readonly texte: string;
    readonly campus: string | null;
    readonly cle: string | null;
    /** `a-envoyer` : dans la boite ; `envoye` : depose ; `refuse` : la fonction l'a refuse, definitivement. */
    readonly etat: 'a-envoyer' | 'envoye' | 'refuse';
    readonly statut: StatutDuRetour | null;
    readonly reponses: readonly Reponse[];
    /**
     * Jusqu'ou les reponses ont ete vues dans « Mes retours », annoncees en tete de l'application,
     * notifiees hors d'elle : l'instant de la derniere reponse concernee, 0 pour aucune. Un instant et
     * non un nombre : une reponse retiree puis une autre publiee font le meme compte, pas le meme instant.
     */
    readonly vues: number;
    readonly annoncees: number;
    readonly notifiees?: number;
}

/** Ce que l'etudiant se rappelle : le campus pour une demande, sinon son texte. */
export function nouveauRetourConnu(attente: RetourEnAttente): RetourConnu {
    return {
        local: attente.local, nature: attente.retour.nature, envoyeLe: attente.creeLe, texte: attente.retour.texte,
        campus: attente.retour.campus, cle: attente.cle, etat: 'a-envoyer', statut: null, reponses: [], vues: 0, annoncees: 0, notifiees: 0,
    };
}

const STATUTS: readonly StatutDuRetour[] = ['nouveau', 'en_attente', 'traite', 'refuse'];

/** Une ligne lue par `lire_mes_retours`, ou `null` : cle inconnue, ou forme inattendue. */
export function lireLigne(ligne: unknown): { readonly statut: StatutDuRetour; readonly reponses: Reponse[] } | null {
    if (typeof ligne !== 'object' || ligne === null) return null;
    const l = ligne as { etat?: unknown; reponses?: unknown };
    if (!STATUTS.includes(l.etat as StatutDuRetour) || !Array.isArray(l.reponses)) return null;
    const reponses: Reponse[] = [];
    for (const r of l.reponses as unknown[]) {
        const texte = (r as { texte?: unknown } | null)?.texte;
        const le = Date.parse(String((r as { le?: unknown } | null)?.le));
        if (typeof texte === 'string' && Number.isFinite(le)) reponses.push({ texte, le });
    }
    return { statut: l.etat as StatutDuRetour, reponses };
}

/**
 * Les retours, apres une lecture : `cles` dans l'ordre envoye, `lignes` dans le meme ordre. Une cle
 * inconnue laisse son retour tel quel — un retour efface sur demande ne revient pas pour autant.
 */
export function fusionnerLecture(retours: readonly RetourConnu[], cles: readonly string[], lignes: readonly unknown[]): RetourConnu[] {
    const parCle = new Map<string, ReturnType<typeof lireLigne>>();
    cles.forEach((cle, i) => parCle.set(cle, lireLigne(lignes[i])));
    return retours.map((r) => {
        const lue = r.cle === null ? null : parCle.get(r.cle) ?? null;
        return lue === null ? r : { ...r, statut: lue.statut, reponses: lue.reponses };
    });
}

/** Les cles a relire : celles des retours deposes, les plus recents d'abord, vingt au plus. */
export function clesALire(retours: readonly RetourConnu[]): string[] {
    return retours
        .filter((r): r is RetourConnu & { cle: string } => r.cle !== null && r.etat === 'envoye')
        .sort((a, b) => b.envoyeLe - a.envoyeLe)
        .slice(0, 20)
        .map((r) => r.cle);
}

/** Les reponses arrivees apres un instant. */
function apres(r: RetourConnu, instant: number): number {
    return r.reponses.filter((reponse) => reponse.le > instant).length;
}

export function nonLues(retours: readonly RetourConnu[]): number {
    return retours.reduce((n, r) => n + apres(r, r.vues), 0);
}

/** Le retour dont une reponse n'a pas encore ete annoncee en tete, le plus recent d'abord. */
export function aAnnoncer(retours: readonly RetourConnu[]): RetourConnu | null {
    return [...retours].filter((r) => apres(r, Math.max(r.annoncees, r.vues)) > 0).sort((a, b) => b.envoyeLe - a.envoyeLe)[0] ?? null;
}

/** Le retour dont une reponse n'a ete ni notifiee, ni annoncee, ni vue : la notification hors de l'application. */
export function aNotifier(retours: readonly RetourConnu[]): RetourConnu | null {
    return [...retours].filter((r) => apres(r, Math.max(r.notifiees ?? 0, r.annoncees, r.vues)) > 0).sort((a, b) => b.envoyeLe - a.envoyeLe)[0] ?? null;
}

/** Marque jusqu'a la derniere reponse : vue (et donc annoncee), annoncee, ou notifiee. */
export function marquer(retours: readonly RetourConnu[], quoi: 'vues' | 'annoncees' | 'notifiees', local: string | null = null): RetourConnu[] {
    return retours.map((r) => {
        if (local !== null && r.local !== local) return r;
        const derniere = r.reponses.reduce((max, reponse) => Math.max(max, reponse.le), 0);
        return { ...r, [quoi]: derniere, ...(quoi === 'vues' ? { annoncees: derniere } : {}) };
    });
}

// ---------------------------------------------------------------------------
// Les problemes connus et « moi aussi »
// ---------------------------------------------------------------------------

export interface ProblemeConnu {
    readonly id: string;
    readonly titre: string;
    readonly detail: string | null;
    readonly statut: 'publie' | 'corrige';
    readonly versionCorrigee: string | null;
}

/** Un probleme corrige reste montre un mois : le temps que la version qui le corrige se repande. */
const CORRIGE_MONTRE_MS = 30 * 24 * 60 * 60_000;

/** Une ligne de la base, ou `null` : hors forme, d'une autre plateforme, ou corrigee depuis longtemps. */
export function lireProbleme(ligne: unknown, plateforme: string, maintenant: number): ProblemeConnu | null {
    if (typeof ligne !== 'object' || ligne === null) return null;
    const l = ligne as Record<string, unknown>;
    if (typeof l.id !== 'string' || typeof l.titre !== 'string' || (l.statut !== 'publie' && l.statut !== 'corrige')) return null;
    if (Array.isArray(l.plateformes) && !l.plateformes.includes(plateforme)) return null;
    const majLe = Date.parse(String(l.maj_le));
    if (l.statut === 'corrige' && (!Number.isFinite(majLe) || maintenant - majLe > CORRIGE_MONTRE_MS)) return null;
    return {
        id: l.id,
        titre: l.titre,
        detail: typeof l.detail === 'string' && l.detail.trim() !== '' ? l.detail : null,
        statut: l.statut,
        versionCorrigee: typeof l.version_corrigee === 'string' ? l.version_corrigee : null,
    };
}


const MORCEAU = /[|\u0000-\u001F\u007F]/g;

/**
 * La valeur d'un « moi aussi » : la plateforme, le modele, le systeme et la version, la forme que le
 * sujet `probleme.moi_aussi` exige. `null` quand l'appareil ne se nomme pas assez pour la remplir.
 */
export function contexteDuVote(plateforme: string, appareil: string | null, systeme: string | null, version: string | null): string | null {
    const propre = (v: string | null, max: number) => (v ?? '').replace(MORCEAU, ' ').trim().slice(0, max);
    const valeur = [plateforme, propre(appareil, 48), propre(systeme, 24), propre(version, 15)].join('|');
    return /^(ios|android)[|][^|]{1,48}[|][^|]{1,24}[|][0-9]{1,3}([.][0-9]{1,3}){1,3}$/.test(valeur) ? valeur : null;
}

// ---------------------------------------------------------------------------
// La proposition apres une capture d'ecran
// ---------------------------------------------------------------------------

export interface MemoireDeProposition {
    /** Le jour de Paris de la derniere proposition. */
    readonly jour: string | null;
    readonly jamais: boolean;
}

/** Au plus une fois par jour, et jamais apres « ne plus proposer ». */
export function peutProposer(memoire: MemoireDeProposition, jourCourant: string): boolean {
    return !memoire.jamais && memoire.jour !== jourCourant;
}

/**
 * Les horaires corriges par les etudiants (docs/phase-8/2-signalements.md) : la valeur d'un signalement
 * `*.horaires`, ecrite et relue. Pur, partage avec la console.
 *
 * Une correction vaut **pour les horaires que la source affichait** quand elle a ete ecrite : elle porte
 * leur empreinte, et l'ecran ne la montre plus des que la source publie autre chose. C'est ainsi que
 * « jusqu'au changement de la source » se tient sans que la base connaisse la source. La validation dans
 * la console, elle, est un etat officiel du meme sujet.
 *
 *     a41f09c2|midi=1130-1345,soir=ferme      le midi corrige, le soir ferme
 *     a41f09c2|source                         la source est juste : la reponse « non » a une correction
 */

/** Un service d'un restaurant (`midi`, `soir`), ou la journee d'une bibliotheque (`jour`). */
export type ServiceHoraire = 'midi' | 'soir' | 'jour';

/** Un creneau en minutes depuis minuit, ou ferme. */
export type Creneau = { readonly debut: number; readonly fin: number } | 'ferme';

export type Correction =
    | { readonly empreinte: string; readonly source: true }
    | { readonly empreinte: string; readonly source: false; readonly services: Readonly<Partial<Record<ServiceHoraire, Creneau>>> };

const ORDRE: readonly ServiceHoraire[] = ['midi', 'soir', 'jour'];

/**
 * L'empreinte des horaires d'une source : FNV-1a sur 32 bits, en hexadecimal, du texte ramene a sa
 * forme (casse, espaces). Pas un secret ni une preuve : un reperage, que deux lectures d'un meme texte
 * donnent egal.
 */
export function empreinteDesHoraires(lignes: readonly string[]): string {
    const texte = lignes.map((l) => l.replace(/\s+/g, ' ').trim().toLowerCase()).filter((l) => l !== '').join('\n');
    let h = 0x811c9dc5;
    for (const caractere of texte) {
        h ^= caractere.codePointAt(0) ?? 0;
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

function heure(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}`;
}

function creneauValide(c: Creneau): boolean {
    if (c === 'ferme') return true;
    return Number.isInteger(c.debut) && Number.isInteger(c.fin) && c.debut >= 0 && c.fin < 24 * 60 && c.debut < c.fin;
}

/** La valeur a envoyer, ou `null` si la correction ne dit rien ou se contredit (un creneau a l'envers). */
export function ecrireCorrection(correction: Correction): string | null {
    if (!/^[0-9a-f]{8}$/.test(correction.empreinte)) return null;
    if (correction.source === true) return `${correction.empreinte}|source`;
    const parties: string[] = [];
    for (const service of ORDRE) {
        const c = correction.services[service];
        if (c === undefined) continue;
        if (!creneauValide(c)) return null;
        parties.push(`${service}=${c === 'ferme' ? 'ferme' : `${heure(c.debut)}-${heure(c.fin)}`}`);
    }
    return parties.length === 0 ? null : `${correction.empreinte}|${parties.join(',')}`;
}

function minutes(hhmm: string): number {
    return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2, 4));
}

/** Une valeur relue, ou `null` si elle n'a pas la forme : une ligne fausse ne casse rien. */
export function lireCorrection(valeur: string): Correction | null {
    const m = /^([0-9a-f]{8})\|(.+)$/.exec(valeur);
    if (m === null) return null;
    const empreinte = m[1] ?? '';
    const corps = m[2] ?? '';
    if (corps === 'source') return { empreinte, source: true };
    const services: Partial<Record<ServiceHoraire, Creneau>> = {};
    for (const partie of corps.split(',')) {
        const p = /^(midi|soir|jour)=(?:(ferme)|(\d{4})-(\d{4}))$/.exec(partie);
        if (p === null) return null;
        const service = p[1] as ServiceHoraire;
        if (services[service] !== undefined) return null;
        const c: Creneau = p[2] === 'ferme' ? 'ferme' : { debut: minutes(p[3] ?? ''), fin: minutes(p[4] ?? '') };
        if (!creneauValide(c)) return null;
        services[service] = c;
    }
    return { empreinte, source: false, services };
}

/** `11:30` : l'heure d'un creneau, a l'ecran. Le separateur vient de la langue, en parametre. */
export function formaterMinutes(m: number, separateur = ':'): string {
    return `${String(Math.floor(m / 60)).padStart(2, '0')}${separateur}${String(m % 60).padStart(2, '0')}`;
}

/** Les services d'une correction, dans l'ordre de la journee. */
export function servicesDe(correction: Correction): readonly (readonly [ServiceHoraire, Creneau])[] {
    if (correction.source === true) return [];
    return ORDRE.flatMap((s) => {
        const c = correction.services[s];
        return c === undefined ? [] : [[s, c] as const];
    });
}

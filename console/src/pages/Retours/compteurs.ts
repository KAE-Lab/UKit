/**
 * Les compteurs de la page Retours : par etat, par nature, par campus demande, et par semaine sur
 * les huit dernieres. Calcules dans la console sur une lecture legere de toutes les lignes — la
 * regle de la base, ni vue ni fonction qui calcule (docs/backend.md).
 *
 * Pur : joue par `npm test` a la racine du depot (compteurs.test.ts).
 */

export const NOMBRE_DE_SEMAINES = 8;

export interface RetourLeger {
    readonly recu_le: unknown;
    readonly nature: unknown;
    readonly etat: unknown;
    readonly campus: unknown;
}

export interface Semaine {
    /** Le lundi, en `AAAA-MM-JJ` local. */
    readonly debut: string;
    readonly n: number;
}

export interface Compteurs {
    readonly total: number;
    readonly ouverts: number;
    readonly parEtat: Readonly<Record<string, number>>;
    readonly parNature: Readonly<Record<string, number>>;
    readonly parCampus: readonly { readonly campus: string; readonly n: number }[];
    readonly parSemaine: readonly Semaine[];
}

function jourLocal(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
}

/** Le lundi de la semaine d'une date, a minuit, en heure locale. */
export function lundiDe(date: Date): Date {
    const lundi = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const decalage = (lundi.getDay() + 6) % 7;
    lundi.setDate(lundi.getDate() - decalage);
    return lundi;
}

function compterPar(retours: readonly RetourLeger[], cle: keyof RetourLeger): Record<string, number> {
    const comptes: Record<string, number> = {};
    for (const retour of retours) {
        const valeur = typeof retour[cle] === 'string' && retour[cle] !== '' ? String(retour[cle]) : '—';
        comptes[valeur] = (comptes[valeur] ?? 0) + 1;
    }
    return comptes;
}

export function compteurs(retours: readonly RetourLeger[], maintenant: Date, etatsOuverts: readonly string[]): Compteurs {
    const parEtat = compterPar(retours, 'etat');
    const parCampus = Object.entries(compterPar(retours.filter((r) => typeof r.campus === 'string' && r.campus !== ''), 'campus'))
        .map(([campus, n]) => ({ campus, n }))
        .sort((a, b) => b.n - a.n || a.campus.localeCompare(b.campus));

    const premierLundi = lundiDe(maintenant);
    premierLundi.setDate(premierLundi.getDate() - 7 * (NOMBRE_DE_SEMAINES - 1));
    const semaines: Semaine[] = Array.from({ length: NOMBRE_DE_SEMAINES }, (_, i) => {
        const debut = new Date(premierLundi);
        debut.setDate(debut.getDate() + 7 * i);
        return { debut: jourLocal(debut), n: 0 };
    });
    const comptesParSemaine = new Map(semaines.map((s) => [s.debut, 0]));
    for (const retour of retours) {
        if (typeof retour.recu_le !== 'string') continue;
        const date = new Date(retour.recu_le);
        if (Number.isNaN(date.getTime())) continue;
        const cle = jourLocal(lundiDe(date));
        if (comptesParSemaine.has(cle)) comptesParSemaine.set(cle, (comptesParSemaine.get(cle) ?? 0) + 1);
    }

    return {
        total: retours.length,
        ouverts: retours.filter((r) => typeof r.etat === 'string' && etatsOuverts.includes(r.etat)).length,
        parEtat,
        parNature: compterPar(retours, 'nature'),
        parCampus,
        parSemaine: semaines.map((s) => ({ debut: s.debut, n: comptesParSemaine.get(s.debut) ?? 0 })),
    };
}

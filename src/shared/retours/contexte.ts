/**
 * Le contexte d'un retour, en blocs (phase 8, lot 3 ; docs/phase-8/3-formulaire.md) : ce que
 * l'application sait de l'instant, montre avant l'envoi et retirable bloc par bloc. Pur : les sources
 * arrivent en parametre, l'ecran les traduit.
 *
 * Le parcours ne porte que des noms d'ecran, l'erreur et les echecs l'hote et la famille d'echec : ni
 * groupe, ni recherche, ni intitule, ni adresse complete, qui peut porter un lien d'abonnement
 * (docs/phase-8/README.md, vie privee). La forme est celle que la fonction `communaute` borne
 * (supabase/functions/communaute/retours.ts).
 */

export type CleDeBloc = 'version' | 'appareil' | 'etablissement' | 'langueTheme' | 'onglet' | 'reseau' | 'echecs' | 'parcours' | 'erreur';

/** Un echec de source, tel qu'il part : l'hote, la famille, il y a combien de minutes. */
export interface EchecJoint {
    /** Absent quand la carte d'erreur n'a pas d'echec de sa famille dans la session. */
    readonly hote?: string;
    readonly famille: string;
    readonly minutes?: number;
}

export type Reseau = 'wifi' | 'cellulaire' | 'hors_ligne' | 'autre';

export interface SourcesDuContexte {
    readonly version: string | null;
    readonly appareil: string | null;
    readonly systeme: string | null;
    readonly etablissement: string | null;
    readonly langue: string;
    readonly theme: string;
    /** L'onglet d'ou le formulaire s'ouvre, au vocabulaire du formulaire Google (`Planning`, `Campus`…). */
    readonly onglet: string | null;
    readonly reseau: Reseau | null;
    readonly echecs: readonly EchecJoint[];
    readonly parcours: readonly string[];
    /** L'erreur de la carte d'ou l'on vient. */
    readonly erreur: EchecJoint | null;
}

export interface Bloc {
    readonly cle: CleDeBloc;
    /** Les champs que ce bloc ajoute au contexte envoye. */
    readonly envoi: Readonly<Record<string, unknown>>;
}

/** Les bornes de la fonction : au-dela, le retour serait refuse. */
export const BORNES_DU_CONTEXTE = { champ: 120, echecs: 5, parcours: 15 } as const;

const HOTE = /^[A-Za-z0-9.-]{1,100}$/;
const FAMILLE = /^[a-z_]{1,24}$/;
const ECRAN = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const CONTROLE = /[\u0000-\u001F\u007F]/g;

function champ(valeur: string | null): string | null {
    if (valeur === null) return null;
    const propre = valeur.replace(CONTROLE, ' ').trim().slice(0, BORNES_DU_CONTEXTE.champ);
    return propre === '' ? null : propre;
}

function echecValide(echec: EchecJoint): boolean {
    return (echec.hote === undefined || HOTE.test(echec.hote)) && FAMILLE.test(echec.famille)
        && (echec.minutes === undefined || (Number.isInteger(echec.minutes) && echec.minutes >= 0 && echec.minutes <= 10_080));
}

/** Les blocs qui ont quelque chose a dire, dans l'ordre de l'ecran ; un bloc vide n'est pas propose. */
export function blocsDuContexte(s: SourcesDuContexte): Bloc[] {
    const blocs: Bloc[] = [];
    const version = champ(s.version);
    if (version !== null) blocs.push({ cle: 'version', envoi: { version } });
    const appareil = champ(s.appareil);
    const systeme = champ(s.systeme);
    if (appareil !== null || systeme !== null) {
        blocs.push({ cle: 'appareil', envoi: { ...(appareil !== null ? { appareil } : {}), ...(systeme !== null ? { systeme } : {}) } });
    }
    const etablissement = champ(s.etablissement);
    if (etablissement !== null) blocs.push({ cle: 'etablissement', envoi: { etablissement } });
    blocs.push({ cle: 'langueTheme', envoi: { langue: champ(s.langue) ?? 'fr', theme: champ(s.theme) ?? 'light' } });
    const onglet = champ(s.onglet);
    if (onglet !== null) blocs.push({ cle: 'onglet', envoi: { onglet } });
    if (s.reseau !== null) blocs.push({ cle: 'reseau', envoi: { reseau: s.reseau } });
    if (s.erreur !== null && echecValide(s.erreur)) blocs.push({ cle: 'erreur', envoi: { erreur: s.erreur } });
    const echecs = s.echecs.filter(echecValide).slice(-BORNES_DU_CONTEXTE.echecs);
    if (echecs.length > 0) blocs.push({ cle: 'echecs', envoi: { echecs } });
    const parcours = s.parcours.filter((ecran) => ECRAN.test(ecran)).slice(-BORNES_DU_CONTEXTE.parcours);
    if (parcours.length > 0) blocs.push({ cle: 'parcours', envoi: { parcours } });
    return blocs;
}

/** Le contexte qui part : les blocs gardes, fondus ; `null` quand tout a ete retire. */
export function contexteAEnvoyer(blocs: readonly Bloc[], retires: ReadonlySet<CleDeBloc>): Record<string, unknown> | null {
    const gardes = blocs.filter((bloc) => !retires.has(bloc.cle));
    if (gardes.length === 0) return null;
    return Object.assign({}, ...gardes.map((bloc) => bloc.envoi)) as Record<string, unknown>;
}

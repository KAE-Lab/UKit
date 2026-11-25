/**
 * Ce que la console lit d'un retour de l'application (phase 8, lot 3 ; docs/phase-8/3-formulaire.md) : le
 * contexte joint, en rangees lisibles, et les reponses d'un admin. Pur : joue par `npm test` a la racine
 * (natif.test.ts).
 */

export interface Rangee {
    readonly intitule: string;
    readonly valeur: string;
}

const FAMILLES: Readonly<Record<string, string>> = {
    unavailable: 'service indisponible', rejected: 'réponse inattendue', data: 'contenu introuvable', blocked: 'bloqué',
    config: 'configuration', blueprint: 'Blueprint', cancelled: 'annulé', unsupported: 'non pris en charge', engine: 'moteur',
};
const RESEAUX: Readonly<Record<string, string>> = { wifi: 'Wi-Fi', cellulaire: 'données mobiles', hors_ligne: 'hors ligne', autre: 'autre' };

function texte(v: unknown): string | null {
    return typeof v === 'string' && v.trim() !== '' ? v : null;
}

/** Un echec joint : l'hote, la famille en mots, il y a combien de minutes. */
export function echecLisible(echec: unknown): string | null {
    if (typeof echec !== 'object' || echec === null) return null;
    const e = echec as { hote?: unknown; famille?: unknown; minutes?: unknown };
    const famille = texte(e.famille);
    if (famille === null) return null;
    return [texte(e.hote), FAMILLES[famille] ?? famille, typeof e.minutes === 'number' ? `il y a ${e.minutes} min` : null]
        .filter((p): p is string => p !== null).join(', ');
}

/** Le contexte joint, bloc par bloc, dans l'ordre de l'ecran de l'application ; ce qui manque a ete retire. */
export function rangeesDuContexte(contexte: unknown): Rangee[] {
    if (typeof contexte !== 'object' || contexte === null || Array.isArray(contexte)) return [];
    const c = contexte as Record<string, unknown>;
    const rangees: Rangee[] = [];
    const ajouter = (intitule: string, valeur: string | null) => {
        if (valeur !== null && valeur !== '') rangees.push({ intitule, valeur });
    };
    ajouter('Version', texte(c.version));
    ajouter('Appareil et système', [texte(c.appareil), texte(c.systeme)].filter((p) => p !== null).join(', '));
    ajouter('Établissement', texte(c.etablissement));
    ajouter('Langue et thème', [texte(c.langue), c.theme === 'dark' ? 'sombre' : c.theme === 'light' ? 'clair' : null].filter((p) => p !== null).join(', '));
    ajouter('Onglet de départ', texte(c.onglet));
    ajouter('Réseau', typeof c.reseau === 'string' ? RESEAUX[c.reseau] ?? c.reseau : null);
    ajouter('Erreur affichée', echecLisible(c.erreur));
    ajouter('Derniers échecs de source', Array.isArray(c.echecs) ? c.echecs.map(echecLisible).filter((e): e is string => e !== null).join(' ; ') : null);
    ajouter('Écrans parcourus', Array.isArray(c.parcours) ? c.parcours.filter((e): e is string => typeof e === 'string').join(' › ') : null);
    return rangees;
}

export interface ReponseLue {
    readonly id: string;
    readonly texte: string;
    readonly creeLe: string;
}

/** Les reponses d'un retour, dans l'ordre ou l'etudiant les lit ; une ligne hors forme ne s'affiche pas. */
export function lireReponses(lignes: unknown): ReponseLue[] {
    if (!Array.isArray(lignes)) return [];
    return lignes
        .filter((l): l is { id: string; texte: string; cree_le: string } =>
            typeof l === 'object' && l !== null && typeof (l as { id?: unknown }).id === 'string'
            && typeof (l as { texte?: unknown }).texte === 'string' && typeof (l as { cree_le?: unknown }).cree_le === 'string')
        .map((l) => ({ id: l.id, texte: l.texte, creeLe: l.cree_le }))
        .sort((a, b) => a.creeLe.localeCompare(b.creeLe));
}

/** Une reponse que la base acceptera : de un a deux mille caracteres utiles. */
export function reponseValide(texte: string): boolean {
    const t = texte.trim();
    return t.length >= 1 && t.length <= 2000;
}

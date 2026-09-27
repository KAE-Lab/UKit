/**
 * La carte d'annonce v2 : ce que l'application et la console de pilotage doivent dire de la meme
 * facon — le cadre, la focale et sa position, le type et son badge, les emplacements, l'ajustement,
 * le partenaire tel qu'une carte le montre.
 *
 * Decidee le 2026-09-14, dessinee d'abord par l'apercu de la console (jalon 7-F), rendue par
 * l'application en 6.3 (jalon 7-I) : une seule source pour ces regles, sans quoi l'apercu finirait
 * par montrer une carte que le telephone ne rend pas. Pur, comme `grammaire.ts` et `ordre.ts` :
 * aucun import de plateforme, et il compile sous la configuration stricte de la console. Les
 * libelles, eux, restent de chaque cote — l'application traduit, la console ne l'est pas.
 *
 * ## La focale n'est pas un centre
 *
 * Elle s'applique comme `object-position` en pourcentages : `80% 90%` aligne le point situe a 80 %
 * de l'image sur le point situe a 80 % du cadre. Le point choisi reste donc toujours visible, a la
 * meme place relative, et il n'est au centre du cadre que pour 50 %. C'est la semantique de
 * `contentPosition` d'expo-image, « l'equivalent de `object-position` », ou un pourcentage est une
 * fraction de l'ecart entre le cadre et l'image : la console et le telephone recadrent a l'identique.
 *
 * Voir docs/features/campus-vie-etudiante.md et docs/phase-7/7-f-console-annonces.md.
 */

/** Le cadre de la carte d'annonce v2 : quatre de large pour cinq de haut. */
export const RATIO_CARTE = 4 / 5;

/** Un point de l'image, en fractions de sa largeur et de sa hauteur. */
export interface Focale {
    readonly x: number;
    readonly y: number;
}

/** Le defaut de la colonne `focale` en base (supabase/schema.sql). */
export const FOCALE_PAR_DEFAUT: Focale = { x: 0.5, y: 0.3 };

function fraction(valeur: unknown): number | null {
    return typeof valeur === 'number' && Number.isFinite(valeur) && valeur >= 0 && valeur <= 1 ? valeur : null;
}

/** La focale d'une ligne, ou le defaut de la base quand la colonne ne porte rien de lisible. */
export function lireFocale(valeur: unknown): Focale {
    if (typeof valeur !== 'object' || valeur === null) return FOCALE_PAR_DEFAUT;
    const brut = valeur as { readonly x?: unknown; readonly y?: unknown };
    const x = fraction(brut.x);
    const y = fraction(brut.y);
    return x === null || y === null ? FOCALE_PAR_DEFAUT : { x, y };
}

/** Un pourcentage entier : les deux rendus arrondissent pareil, sinon ils ne recadreraient pas au meme pixel. */
function pourcent(part: number): `${number}%` {
    return `${Math.round(part * 100)}%`;
}

/** La focale en `object-position` CSS, telle que l'apercu de la console l'applique. */
export function positionDeFocale(focale: Focale): string {
    return `${pourcent(focale.x)} ${pourcent(focale.y)}`;
}

/**
 * `contentPosition` d'expo-image, par le coin haut gauche. La forme est ecrite ici plutot que tiree
 * du paquet, pour que le module reste pur ; le type du paquet l'accepte telle quelle, et
 * carte.test.ts le verifie a la compilation.
 */
interface PositionDeContenu {
    readonly left: `${number}%`;
    readonly top: `${number}%`;
}

/** La focale en `contentPosition` d'expo-image : les memes pourcentages que `positionDeFocale`. */
export function positionPourExpoImage(focale: Focale): PositionDeContenu {
    return { left: pourcent(focale.x), top: pourcent(focale.y) };
}

/** Les natures d'une carte, dans l'ordre des choix de la console ; `annonces_type_check` porte les memes. */
export const CODES_DE_TYPE = ['evenement', 'info', 'bon_plan', 'partenaire'] as const;

export type TypeDAnnonce = (typeof CODES_DE_TYPE)[number];

/** Les types qui portent un badge : tous, sauf l'evenement. */
export type TypeDeBadge = Exclude<TypeDAnnonce, 'evenement'>;

/** Un type que l'application sait rendre : une valeur ouverte en base avant que le parc ne la connaisse n'en est pas un. */
export function estTypeDAnnonce(valeur: unknown): valeur is TypeDAnnonce {
    return CODES_DE_TYPE.some((code) => code === valeur);
}

/** Le type d'une ligne ; un type inconnu se rend comme un evenement, la norme, qui ne porte pas de badge. */
export function lireType(valeur: unknown): TypeDAnnonce {
    return estTypeDAnnonce(valeur) ? valeur : 'evenement';
}

/** Le badge d'une carte : rien pour un evenement — la norme ne s'etiquette pas —, son type sinon. */
export function typeDeBadge(type: TypeDAnnonce): TypeDeBadge | null {
    return type === 'evenement' ? null : type;
}

/** Les carrousels du tableau de bord ou une carte s'insere ; `annonces_emplacements_check` porte les memes. */
export const CODES_D_EMPLACEMENT = ['annonces', 'restaurants', 'bibliotheques', 'salles'] as const;

export type Emplacement = (typeof CODES_D_EMPLACEMENT)[number];

/** Le carrousel propre d'une annonce ; dans tout autre, elle est une carte speciale. */
const CARROUSEL_DES_ANNONCES: Emplacement = 'annonces';

/**
 * Les emplacements d'une ligne, dans l'ordre des carrousels et sans doublon. La colonne est
 * `not null`, `{annonces}` par defaut : ce qui n'est pas un tableau — un cache d'avant les colonnes —
 * vaut ce defaut. Un code inconnu, ouvert en base avant que le parc ne le connaisse, s'ignore : la
 * carte ne s'insere que la ou l'application sait la mettre.
 */
export function lireEmplacements(valeur: unknown): Emplacement[] {
    if (!Array.isArray(valeur)) return [CARROUSEL_DES_ANNONCES];
    return CODES_D_EMPLACEMENT.filter((code) => valeur.includes(code));
}

/**
 * Les carrousels ou une carte est speciale : tous ses emplacements, sauf celui des annonces.
 * Generique parce que la console passe la saisie telle quelle — une valeur hors liste y reste
 * visible —, et l'application ses emplacements lus.
 */
export function emplacementsSpeciaux<T extends string>(emplacements: readonly T[]): T[] {
    return emplacements.filter((code) => code !== CARROUSEL_DES_ANNONCES);
}

/** Couvrir le cadre autour de la focale, ou y contenir l'image entiere sur une copie floutee d'elle-meme. */
export type Ajustement = 'couvrir' | 'contenir';

/**
 * « Contenir » seulement quand la colonne le dit : c'est l'exception, gardee par ligne pour les
 * affiches deja composees — la migration de 7-C l'a posee sur toutes les lignes anterieures.
 */
export function lireAjustement(valeur: unknown): Ajustement {
    return valeur === 'contenir' ? 'contenir' : 'couvrir';
}

/** Le partenaire tel qu'une carte le montre : un nom, un logo et un lien quand ils existent. */
export interface Partenaire {
    readonly nom: string;
    readonly logoUrl: string | null;
    readonly lien: string | null;
}

function texte(valeur: unknown): string | null {
    if (typeof valeur !== 'string') return null;
    const propre = valeur.trim();
    return propre === '' ? null : propre;
}

/**
 * Le partenaire d'une ligne, pour l'affichage : rien sans nom, et un logo ou un lien vide vaut une
 * absence. La saisie de la console a sa propre lecture, ou chaque champ reste une chaine a editer
 * (`lirePartenaire`, console/src/schema/schemas.ts) : les deux semantiques ne se confondent pas.
 */
export function partenaireDeCarte(valeur: unknown): Partenaire | null {
    if (typeof valeur !== 'object' || valeur === null) return null;
    const brut = valeur as { readonly nom?: unknown; readonly logo_url?: unknown; readonly lien?: unknown };
    const nom = texte(brut.nom);
    return nom === null ? null : { nom, logoUrl: texte(brut.logo_url), lien: texte(brut.lien) };
}

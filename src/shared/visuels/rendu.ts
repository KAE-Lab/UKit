/**
 * L'adresse de **rendu** d'un visuel publie : la transformation d'image du plan Pro de Supabase.
 *
 * Les visuels du bucket `media` sont publies a leur taille d'origine — une photo de restaurant fait
 * 1 200 px de large — et chaque carte les demandait tels quels, a 500 Ko l'unite, sur un ecran qui
 * n'en affiche que 400 (jalon 7-C). Le service `/render/image/` du Pro rend la meme image a la
 * largeur et a la qualite demandees, et le CDN garde chaque variante un an.
 *
 * Trois regles, et leur raison :
 *
 * - **la base ne stocke que des adresses d'origine** (`/object/public/`) : c'est l'application qui
 *   transforme au moment d'afficher. Publier une adresse de rendu figerait une largeur dans la
 *   donnee, et les versions anterieures ne sauraient qu'en faire (docs/backend.md) ;
 * - **la largeur demandee est un palier**, jamais la largeur exacte : sans paliers, chaque taille
 *   d'ecran creerait sa propre variante chez le CDN, chacune un `MISS` a calculer et a descendre.
 *   Supabase facture par image d'origine transformee, pas par variante ; les paliers servent le
 *   taux de HIT et la vitesse ;
 * - **manipulation de chaines, pas de `URL`** : le module se joue sous Node comme sous Hermes, et il
 *   laisse intacte toute adresse qui n'est pas la notre — Croustillant, Affluences.
 *
 * Le repli sur l'adresse d'origine quand le rendu echoue vit dans `shared/ui/useSourceRendue.ts` :
 * ce module ne decide que de l'adresse.
 */

export interface OptionsDeRendu {
    /** La largeur en **pixels** de l'appareil : les points multiplies par `PixelRatio.get()`. */
    readonly largeur: number;
    /** La qualite demandee, bornee entre `QUALITE_MIN` et `QUALITE_MAX`. */
    readonly qualite: number;
}

/** Les largeurs que le CDN aura a garder : sept variantes au plus par image, de la vignette au plein ecran. */
export const PALIERS_DE_LARGEUR = [320, 480, 640, 960, 1280, 1600, 2000] as const;

export const QUALITE_MIN = 20;
export const QUALITE_MAX = 100;

const SEGMENT_ORIGINE = '/storage/v1/object/public/';
const SEGMENT_RENDU = '/storage/v1/render/image/public/';

/** Le plus petit palier qui couvre la largeur demandee ; au-dela du dernier, le dernier. */
export function palierDeLargeur(pixels: number): number {
    if (!Number.isFinite(pixels) || pixels <= 0) return PALIERS_DE_LARGEUR[0];
    return PALIERS_DE_LARGEUR.find((palier) => palier >= pixels) ?? PALIERS_DE_LARGEUR[PALIERS_DE_LARGEUR.length - 1];
}

/** La qualite bornee et entiere ; une valeur illisible vaut la qualite maximale, jamais une image degradee par erreur. */
export function qualiteBornee(qualite: number): number {
    if (!Number.isFinite(qualite)) return QUALITE_MAX;
    return Math.min(QUALITE_MAX, Math.max(QUALITE_MIN, Math.round(qualite)));
}

/**
 * L'adresse de rendu d'une adresse d'origine.
 *
 * Rend l'adresse **telle quelle** quand elle n'est pas une chaine, quand elle n'est pas chez notre
 * stockage, ou quand elle est deja une adresse de rendu — la transformation est idempotente. La
 * requete existante (`?v=2`) est conservee en tete : c'est elle qui force la relecture d'un visuel
 * remplace, et elle fait partie de la cle de cache du CDN.
 */
export function urlDeRendu<T extends string | null | undefined>(url: T, options: OptionsDeRendu): T {
    if (typeof url !== 'string') return url;
    if (url.includes(SEGMENT_RENDU)) return url;
    const position = url.indexOf(SEGMENT_ORIGINE);
    if (position < 0) return url;

    const rendue = url.slice(0, position) + SEGMENT_RENDU + url.slice(position + SEGMENT_ORIGINE.length);
    const separateur = rendue.includes('?') ? '&' : '?';
    return `${rendue}${separateur}width=${palierDeLargeur(options.largeur)}&quality=${qualiteBornee(options.qualite)}` as T;
}

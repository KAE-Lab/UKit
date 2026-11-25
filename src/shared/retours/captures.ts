/**
 * Les captures d'un retour (lot 3) : choisie dans la galerie par le selecteur du systeme, ou refaite de
 * l'ecran de UKit apres une capture detectee, toujours compressee en JPEG avant de partir. La couture de
 * plateforme : `expo-image-picker`, `expo-image-manipulator`, `react-native-view-shot`,
 * `expo-screen-capture`, `expo-file-system`.
 *
 * **Aucune permission de galerie** : le selecteur du systeme (PHPicker sur iOS, celui d'Android) n'en
 * demande pas, et la capture detectee ne donne jamais l'image — l'application refait celle de son
 * propre ecran. La detection n'existe que sur iOS et Android 14 et plus, ou le systeme previent sans
 * permission ; avant, il faudrait lire la galerie, que le manifeste n'accorde pas (app.config.ts).
 *
 * Chaque module natif se charge a la demande : un build qui ne le porte pas — celui d'avant le lot —
 * n'a ni selecteur ni detection, sans planter au lancement.
 */

import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/** Ce qu'une capture pese au plus en partant : l'espace `retours` refuse au-dela d'un mega. */
export const POIDS_MAX = 1_000_000;
/** La largeur d'une capture qui part : assez pour lire un texte d'ecran, peu pour le reseau. */
const LARGEUR = 1080;

type Selecteur = typeof import('expo-image-picker');
type Manipulateur = typeof import('expo-image-manipulator');
type Capture = typeof import('react-native-view-shot');
type DetectionDeCapture = typeof import('expo-screen-capture');

function charger<T>(chargeur: () => Promise<T>): () => Promise<T | null> {
    let module: Promise<T | null> | null = null;
    return () => {
        module ??= chargeur().catch(() => null);
        return module;
    };
}

const selecteur = charger<Selecteur>(() => import('expo-image-picker'));
const manipulateur = charger<Manipulateur>(() => import('expo-image-manipulator'));
const capture = charger<Capture>(() => import('react-native-view-shot'));
const detection = charger<DetectionDeCapture>(() => import('expo-screen-capture'));

/** Une image en JPEG, a la largeur qui part, sous le poids permis ; `null` si rien n'y arrive. */
async function compresser(uri: string, largeur: number): Promise<string | null> {
    const m = await manipulateur();
    if (m === null) return null;
    for (const [qualite, borne] of [[0.6, LARGEUR], [0.45, 900]] as const) {
        const contexte = m.ImageManipulator.manipulate(uri);
        if (largeur > borne) contexte.resize({ width: borne });
        const image = await contexte.renderAsync();
        const sortie = await image.saveAsync({ format: m.SaveFormat.JPEG, compress: qualite });
        if ((new File(sortie.uri).size ?? Number.POSITIVE_INFINITY) <= POIDS_MAX) return sortie.uri;
    }
    return null;
}

/** Une image choisie dans la galerie et compressee, ou `null` : annule, module absent, image illisible. */
export async function choisirUneImage(): Promise<string | null> {
    const s = await selecteur();
    if (s === null) return null;
    try {
        const choix = await s.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1, exif: false });
        const image = choix.canceled ? undefined : choix.assets[0];
        return image === undefined ? null : await compresser(image.uri, image.width);
    } catch (erreur) {
        console.warn(`[retours] image non choisie : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return null;
    }
}

/** La capture de l'ecran de UKit tel qu'il est, compressee ; `null` si le module manque ou echoue. */
export async function capturerLEcran(): Promise<string | null> {
    const c = await capture();
    if (c === null) return null;
    try {
        const uri = await c.captureScreen({ format: 'jpg', quality: 0.6, result: 'tmpfile' });
        if ((new File(uri).size ?? Number.POSITIVE_INFINITY) <= POIDS_MAX) return uri;
        const compressee = await compresser(uri, Number.POSITIVE_INFINITY);
        oublierLeFichier(uri);
        return compressee;
    } catch (erreur) {
        console.warn(`[retours] ecran non capture : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return null;
    }
}

/** La detection d'une capture ne vaut que la ou le systeme previent sans permission. */
export function detectionPossible(): boolean {
    return Platform.OS === 'ios' || (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 34);
}

/** S'abonne aux captures d'ecran ; rend le desabonnement. Rien la ou la detection n'est pas possible. */
export async function ecouterLesCaptures(surCapture: () => void): Promise<() => void> {
    if (!detectionPossible()) return () => undefined;
    const d = await detection();
    if (d === null) return () => undefined;
    try {
        const abonnement = d.addScreenshotListener(surCapture);
        return () => abonnement.remove();
    } catch {
        return () => undefined;
    }
}

const DOSSIER = 'retours';

/**
 * Les captures d'un retour qui attend le reseau, recopiees dans le repertoire prive : le cache du
 * systeme peut s'effacer avant le retour du reseau. Rend les chemins gardes.
 */
export function garderLesCaptures(local: string, uris: readonly string[]): string[] {
    const dossier = new Directory(Paths.document, DOSSIER, local);
    if (!dossier.exists) dossier.create({ intermediates: true });
    return uris.map((uri, i) => {
        const destination = new File(dossier, `${i + 1}.jpg`);
        if (destination.exists) destination.delete();
        new File(uri).copySync(destination);
        return destination.uri;
    });
}

/** Les captures d'un retour parti ou refuse, effacees de l'appareil. */
export function oublierLesCaptures(local: string): void {
    try {
        const dossier = new Directory(Paths.document, DOSSIER, local);
        if (dossier.exists) dossier.delete();
    } catch (erreur) {
        console.warn(`[retours] captures non effacees : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

/**
 * Une capture du cache, effacee : l'ecran de UKit refait apres une capture peut montrer une note ou un
 * message, et ne doit pas rester sur l'appareil si l'etudiant ne l'envoie pas. Ne leve jamais.
 */
export function oublierLeFichier(uri: string): void {
    try {
        const fichier = new File(uri);
        if (fichier.exists) fichier.delete();
    } catch {
        // Le systeme videra son cache de toute facon.
    }
}

/** Les octets d'une capture, pour le televersement. */
export async function octetsDe(uri: string): Promise<ArrayBuffer> {
    return (await new File(uri).bytes()).buffer;
}

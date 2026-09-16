/**
 * Les adresses du bucket `media` : reconnaitre les notres, et leur poser une version.
 *
 * La regle `?v=N` est celle de la console — remplacer une image publiee exige de changer son
 * adresse, parce que les telephones les mettent en cache par URL et que le fichier seul ne change
 * rien a ceux qui sont deja passes (mesure le soir de la sortie de la 6.0). Elle vit ici une seconde
 * fois, en `.mjs`, parce que l'outillage ne partage aucun module avec `console/src` : la jumelle est
 * `console/src/lib/versionnerUrl.ts`, elle porte les memes cas de test, et les deux se corrigent
 * ensemble.
 *
 * Pur : joue par `npm test` (versionner.test.ts).
 */

const PARAMETRE = 'v';
const PREFIXE_PUBLIC = '/storage/v1/object/public/media/';

/**
 * L'adresse, sa version incrementee : `?v=N+1`, ou `?v=1` si elle n'en portait pas.
 * Les autres parametres sont conserves.
 *
 * @param {string} url
 * @returns {string}
 */
export function versionner(url) {
    const adresse = new URL(url);
    const courante = Number(adresse.searchParams.get(PARAMETRE));
    const suivante = Number.isInteger(courante) && courante > 0 ? courante + 1 : 1;
    adresse.searchParams.set(PARAMETRE, String(suivante));
    return adresse.toString();
}

/**
 * Le chemin de l'objet que cette adresse designe dans notre bucket, ou `null`.
 *
 * Rend `null` pour tout ce qui n'est pas a nous — la route de previsualisation de Croustillant, la
 * galerie d'Affluences —, ce qui est la garde qui permet de parcourir une colonne libre comme
 * `annonces.images` sans toucher a ce qui appartient a une source tierce.
 *
 * @param {string} url
 * @param {string} urlBase
 * @returns {string | null}
 */
export function cheminDObjet(url, urlBase) {
    let adresse;
    try {
        adresse = new URL(url);
    } catch {
        return null;
    }
    if (adresse.origin !== new URL(urlBase).origin) return null;
    if (!adresse.pathname.startsWith(PREFIXE_PUBLIC)) return null;
    const chemin = decodeURIComponent(adresse.pathname.slice(PREFIXE_PUBLIC.length));
    return chemin === '' ? null : chemin;
}

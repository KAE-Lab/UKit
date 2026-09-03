/**
 * La regle des visuels : remplacer une image publiee exige de changer son adresse.
 *
 * Les appareils mettent les images en cache par URL, et le fichier seul ne change rien a ceux qui
 * sont deja passes (mesure le soir de la sortie de la 6.0). La console applique la regle d'elle-meme
 * a chaque televersement : `?v=N` incremente, ou `?v=1` s'il n'y en avait pas. Les autres
 * parametres de l'adresse sont conserves.
 *
 * Pur : joue par `npm test` a la racine du depot (versionnerUrl.test.ts).
 */

const PARAMETRE = 'v';

export function versionnerUrl(url: string): string {
    const adresse = new URL(url);
    const courante = Number(adresse.searchParams.get(PARAMETRE));
    const suivante = Number.isInteger(courante) && courante > 0 ? courante + 1 : 1;
    adresse.searchParams.set(PARAMETRE, String(suivante));
    return adresse.toString();
}

/** La version que porte une adresse, ou 0 si elle n'en porte pas. Pour l'afficher a cote du champ. */
export function versionDeUrl(url: string): number {
    try {
        const courante = Number(new URL(url).searchParams.get(PARAMETRE));
        return Number.isInteger(courante) && courante > 0 ? courante : 0;
    } catch {
        return 0;
    }
}

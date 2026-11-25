/**
 * Faire telecharger un fichier construit dans la page : l'export du journal en JSON, le rapport
 * partenaire en CSV (7-G). Le contenu est deja pret ; il ne reste qu'a le donner au navigateur.
 */

function telecharger(nom: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nom;
    lien.click();
    URL.revokeObjectURL(url);
}

/** Un objet en JSON, indente : le fichier a remettre quand quelque chose a mal tourne. */
export function exporterJson(nom: string, contenu: unknown): void {
    telecharger(nom, new Blob([JSON.stringify(contenu, null, 2)], { type: 'application/json' }));
}

/** Un CSV deja ecrit, indicateur d'ordre des octets compris (stats/rapport.ts). */
export function exporterCsv(nom: string, contenu: string): void {
    telecharger(nom, new Blob([contenu], { type: 'text/csv;charset=utf-8' }));
}

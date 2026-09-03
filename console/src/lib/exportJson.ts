/** Fait telecharger un objet en JSON, indente : le fichier a remettre quand quelque chose a mal tourne. */
export function exporterJson(nom: string, contenu: unknown): void {
    const blob = new Blob([JSON.stringify(contenu, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nom;
    lien.click();
    URL.revokeObjectURL(url);
}

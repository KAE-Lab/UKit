/**
 * Des reperes de temps au demarrage, pour le lire plutot que le supposer (6.1-C, S13).
 *
 * Sous `__DEV__` seulement : chaque repere ecrit `[chrono] <nom> +<ms>` dans la console de Metro,
 * compte depuis le chargement de ce module — le premier instant du JavaScript de l'application.
 * C'est un instrument de developpement, comme les sondes du menu (docs/qualite.md) ; en production
 * il ne fait rien. L'horloge est la vraie : la simulation du menu n'existe pas encore a cet instant.
 */

const ORIGINE = Date.now();

export function marquer(nom: string): void {
    if (!__DEV__) return;
    console.info(`[chrono] ${nom} +${Date.now() - ORIGINE} ms`);
}

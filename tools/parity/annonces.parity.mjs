/**
 * Cas de parite : les annonces de vie etudiante.
 *
 * Le premier, et le gabarit des suivants. La source est la plus simple du lot — un fichier statique,
 * une requete, un filtre declaratif — donc un ecart ne peut venir que du socle qu'on est en train de
 * poser.
 *
 * Voir tools/parity/README.md.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const NAME = 'annonces';

/**
 * Le chemin migre : joue le Blueprint et rend la donnee **au format applicatif**.
 *
 * Le filtre d'expiration est applique **ici**, pas dans le Blueprint : un predicat d'extraction ne
 * connait que son element, jamais l'heure de l'appareil. Ce n'est pas un manque — la meme donnee
 * peut ainsi etre affichee grisee plutot que masquee, ce qu'un filtre cote extraction interdirait.
 *
 * TODO(6-A) :
 *
 * ```js
 * import { Aetherius } from '@aetherius/engine';
 *
 * const document = JSON.parse(readFileSync(join(ROOT, 'blueprints/ukit-campus-annonces.blueprint.json'), 'utf8'));
 * const result = await new Aetherius().run(document, {});
 * return result.outputs.annonces.filter((item) => new Date(item.expire_le) > new Date());
 * ```
 */
export async function viaBlueprint() {
    void readFileSync;
    void ROOT;
    throw new Error('parite : branchee au jalon 6-A (voir docs/phase-6/6-a-socle.md)');
}

/**
 * Le chemin historique, tel qu'il etait avant la migration — recopie ici volontairement plutot
 * qu'importe : le service, lui, va changer, et un cas de parite qui suivrait ses evolutions
 * cesserait de comparer quoi que ce soit.
 */
export async function viaLegacy() {
    const response = await fetch('https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/annonces.json');
    if (!response.ok) throw new Error(`legacy: statut ${response.status}`);
    const data = await response.json();
    const now = new Date();
    return (data?.annonces ?? []).filter((item) => item.is_active && new Date(item.expires_at) > now);
}

/**
 * Ce que la comparaison regarde : la donnee que l'ecran verrait, pas la reponse brute.
 *
 * Les deux chemins nomment leurs champs differemment (le Blueprint les renomme en francais) : la
 * projection est donc explicite, et c'est elle qui dit ce qui compte reellement pour l'affichage.
 */
export function project(item) {
    return {
        id: String(item.id ?? item.id),
        titre: item.titre ?? item.title,
        emetteur: item.emetteur ?? item.issuer_name,
        lien: item.cta_lien ?? item.cta_link ?? null,
    };
}

/**
 * Cas de parite : les annonces de vie etudiante.
 *
 * Le premier, et le gabarit des suivants. La source est la plus simple du lot — un fichier statique,
 * une requete, un filtre declaratif — donc un ecart ne peut venir que du socle qu'on est en train de
 * poser.
 *
 * Voir tools/parity/README.md.
 */

import { RunEngine, describeFailure, validateBlueprintData } from '@aetherius/engine';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const NAME = 'annonces';

/**
 * Le chemin migre : joue le Blueprint et rend la donnee **au format applicatif**.
 *
 * On joue le moteur neutre (`RunEngine`) et non la facade `Aetherius` : celle-ci vit dans
 * `@aetherius/react-native` et importe React Native, donc n'est pas jouable sous Node. C'est la
 * seule difference avec ce que fait l'application, et elle ne porte ni la requete ni l'extraction.
 *
 * La projection et le filtre d'expiration sont **recopies** de BdeService plutot qu'importes : le
 * service est en TypeScript et va evoluer, et un cas de parite qui suivrait ses evolutions cesserait
 * de comparer quoi que ce soit. Le filtre reste applicatif des deux cotes — un predicat d'extraction
 * ne connait que son element, jamais l'heure de l'appareil.
 */
export async function viaBlueprint() {
    const source = readFileSync(join(ROOT, 'blueprints', 'ukit-campus-annonces.blueprint.json'), 'utf8');
    const blueprint = validateBlueprintData(JSON.parse(source), 'ukit-campus-annonces.blueprint.json');

    const result = await new RunEngine().run(blueprint, { inputs: {} });
    const failure = describeFailure(result);
    if (failure !== undefined) throw new Error(`blueprint: ${failure.kind} — ${failure.message}`);

    const now = new Date();
    return result.outputs.annonces
        .map((item) => ({
            id: String(item.id ?? ''),
            is_active: true,
            expires_at: typeof item.expire_le === 'string' ? item.expire_le : '',
            title: texte(item.titre) ?? '',
            issuer_name: texte(item.emetteur) ?? '',
            image_url: texte(item.image),
            info_label: texte(item.accroche),
            long_desc: texte(item.desc_longue),
            cta_text: texte(item.cta_texte),
            cta_link: texte(item.cta_lien),
        }))
        .filter((annonce) => new Date(annonce.expires_at) > now);
}

/** Une extraction qui ne trouve pas un champ rend `null` ; le contrat applicatif, lui, l'omet. */
function texte(value) {
    return typeof value === 'string' && value !== '' ? value : undefined;
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
 * Tous les champs que les trois ecrans lisent y sont — la liste, le carrousel du tableau de bord et
 * la fiche. Comparer moins laisserait passer exactement le defaut que ce jalon a trouve : un champ
 * affiche que le Blueprint n'extrayait pas.
 *
 * Les deux chemins nomment leurs champs differemment cote source (le Blueprint les renomme en
 * francais), mais les deux `viaX` rendent deja le contrat applicatif : la projection normalise donc
 * surtout l'absence — `undefined`, `null` et chaine vide disent la meme chose a un ecran.
 */
export function project(item) {
    return {
        id: String(item.id ?? ''),
        title: item.title ?? null,
        issuer_name: item.issuer_name ?? null,
        expires_at: item.expires_at ?? null,
        info_label: item.info_label || null,
        long_desc: item.long_desc || null,
        image_url: item.image_url || null,
        cta_text: item.cta_text || null,
        cta_link: item.cta_link || null,
    };
}

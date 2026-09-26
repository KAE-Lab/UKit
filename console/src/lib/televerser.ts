/**
 * Televerser une image dans le bucket `media` : reduite et re-encodee en WebP dans le navigateur,
 * sous un nom d'objet unique, avec un cache d'un an, et son blurhash calcule.
 *
 * Le nom unique (nommage.ts) rend le `?v=N` inutile pour ce que la console televerse : remplacer une
 * image est un nouvel objet, donc une nouvelle adresse, que les telephones deja passes ne connaissent
 * pas. La regle `?v=N` reste celle de ce qui est pose a la main (tools/media/versionner.mjs).
 *
 * La compression n'est pas du confort (jalon 7-A) : une photo prise au telephone pese quelques
 * megaoctets, et c'est l'egress du parc entier qui les paie. Un echec de compression n'est pas une
 * raison de perdre le geste de l'editeur : le fichier d'origine part alors, avec son cache d'un an.
 */

import imageCompression from 'browser-image-compression';

import { supabase } from '../supabase';
import { calculerBlurhash } from './blurhash';
import { grandCoteVise, MIME_WEBP, QUALITE_WEBP } from './compression';
import { identifiantCourt, nomDObjet } from './nommage';

const BUCKET = 'media';

/** Un an, la valeur que le jalon 7-A a posee sur tout le bucket. */
const CACHE_UN_AN = '31536000';

export interface Televerse {
    readonly url: string;
    readonly blurhash: string | null;
    readonly octets: number;
}

async function compresser(dossier: string, fichier: File): Promise<File> {
    try {
        return await imageCompression(fichier, {
            maxWidthOrHeight: grandCoteVise(dossier),
            fileType: MIME_WEBP,
            initialQuality: QUALITE_WEBP,
            useWebWorker: true,
        });
    } catch {
        return fichier;
    }
}

export async function televerser(dossier: string, fichier: File): Promise<Televerse> {
    const objet = nomDObjet(dossier, fichier.name, identifiantCourt());
    const [envoye, blurhash] = await Promise.all([compresser(dossier, fichier), calculerBlurhash(fichier)]);
    const { error } = await supabase.storage.from(BUCKET).upload(objet, envoye, {
        upsert: false,
        contentType: envoye.type || fichier.type || undefined,
        cacheControl: CACHE_UN_AN,
    });
    if (error !== null) throw new Error(`Téléversement refusé : ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objet);
    return { url: data.publicUrl, blurhash, octets: envoye.size };
}

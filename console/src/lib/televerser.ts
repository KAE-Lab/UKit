/**
 * Televerser une image dans le bucket `media`, et rendre son adresse publique versionnee.
 *
 * L'objet garde le nom du fichier (en slug) : remplacer une image par un fichier du meme nom ecrase
 * l'objet (`upsert`) et c'est `?v=N` qui fait recharger les telephones deja passes — la regle P4
 * (docs/features/campus-vie-etudiante.md). Un fichier d'un autre nom est un nouvel objet, en `v=1`.
 *
 * Deux choses arrivent avant l'envoi depuis le jalon 7-A, et elles ne sont pas du confort : une
 * photo prise au telephone pese quelques megaoctets, et l'en-tete d'une heure faisait redemander
 * chaque visuel a chaque ouverture de l'onglet Campus — c'est ce qui avait porte l'egress en cache a
 * deux fois le quota. L'image est donc **redimensionnee et compressee dans le navigateur**, et posee
 * avec un cache d'un an.
 *
 * Ce qui reste a 7-E : le nom d'objet unique, le blurhash — qui n'a aucune colonne ou atterrir avant
 * 7-C — et l'apercu au ratio reel. L'extension, elle, reste celle du fichier choisi : c'est le
 * `Content-Type` qui porte le format, et 7-E renommera tout en `.webp` d'un seul geste.
 */

import imageCompression from 'browser-image-compression';

import { supabase } from '../supabase';
import { slug } from './cle';
import { versionnerUrl } from './versionnerUrl';

const BUCKET = 'media';

/** Un an, la valeur que le jalon 7-A a posee sur tout le bucket (tools/media/plan.mjs). */
const CACHE_UN_AN = '31536000';

/**
 * Le grand cote vise, par dossier — les memes valeurs que la passe sur le bucket : une affiche
 * d'annonce est vue au plus en pleine largeur d'un telephone, une photo sert aussi de fond de carte.
 */
const LARGEUR_PAR_DOSSIER: Record<string, number> = { annonces: 1080 };
const LARGEUR_PAR_DEFAUT = 1200;

/**
 * L'image reduite et re-encodee en WebP.
 *
 * Un echec de compression n'est pas une raison de perdre le geste de l'editeur : on televerse alors
 * le fichier d'origine, qui gardera au moins son cache d'un an.
 */
async function compresser(dossier: string, fichier: File): Promise<File> {
    try {
        return await imageCompression(fichier, {
            maxWidthOrHeight: LARGEUR_PAR_DOSSIER[dossier] ?? LARGEUR_PAR_DEFAUT,
            fileType: 'image/webp',
            initialQuality: 0.75,
            useWebWorker: true,
        });
    } catch {
        return fichier;
    }
}

function nomDObjet(dossier: string, fichier: File): string {
    const point = fichier.name.lastIndexOf('.');
    const base = point > 0 ? fichier.name.slice(0, point) : fichier.name;
    const extension = point > 0 ? fichier.name.slice(point + 1).toLowerCase() : 'jpg';
    return `${dossier}/${slug(base) || 'image'}.${extension}`;
}

function sansParametres(url: string): string {
    return url.split('?')[0] ?? url;
}

export async function televerser(dossier: string, fichier: File, adresseActuelle: string | null): Promise<string> {
    // Le nom vient du fichier choisi, jamais du fichier produit : c'est l'adresse que la ligne porte.
    const objet = nomDObjet(dossier, fichier);
    const envoye = await compresser(dossier, fichier);
    const { error } = await supabase.storage.from(BUCKET).upload(objet, envoye, {
        upsert: true,
        contentType: envoye.type || fichier.type || undefined,
        cacheControl: CACHE_UN_AN,
    });
    if (error !== null) throw new Error(`Téléversement refusé : ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objet);
    // Meme objet qu'avant : la version continue ; sinon elle repart a 1.
    const memeObjet = adresseActuelle !== null && sansParametres(adresseActuelle) === sansParametres(data.publicUrl);
    return versionnerUrl(memeObjet ? adresseActuelle : data.publicUrl);
}

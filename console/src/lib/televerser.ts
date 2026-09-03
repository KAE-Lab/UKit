/**
 * Televerser une image dans le bucket `media`, et rendre son adresse publique versionnee.
 *
 * L'objet garde le nom du fichier (en slug) : remplacer une image par un fichier du meme nom ecrase
 * l'objet (`upsert`) et c'est `?v=N` qui fait recharger les telephones deja passes — la regle P4
 * (docs/features/campus-vie-etudiante.md). Un fichier d'un autre nom est un nouvel objet, en `v=1`.
 */

import { supabase } from '../supabase';
import { slug } from './cle';
import { versionnerUrl } from './versionnerUrl';

const BUCKET = 'media';

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
    const objet = nomDObjet(dossier, fichier);
    const { error } = await supabase.storage.from(BUCKET).upload(objet, fichier, {
        upsert: true,
        contentType: fichier.type || undefined,
        cacheControl: '3600',
    });
    if (error !== null) throw new Error(`Téléversement refusé : ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objet);
    // Meme objet qu'avant : la version continue ; sinon elle repart a 1.
    const memeObjet = adresseActuelle !== null && sansParametres(adresseActuelle) === sansParametres(data.publicUrl);
    return versionnerUrl(memeObjet ? adresseActuelle : data.publicUrl);
}

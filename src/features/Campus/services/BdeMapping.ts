/**
 * Le contrat des annonces, et la traduction depuis la ligne de base.
 *
 * Separe de `BdeService` parce que ce module ne doit **rien** importer de plateforme : le service,
 * lui, tire la porte d'entree de la base et le socle Aetherius, et n'est donc pas jouable sous Node.
 * Ce qui est risque ici — les `null`, l'absence d'expiration, la peremption — le devient
 * (BdeMapping.test.ts).
 *
 * L'import de type vise `shared/supabase/types` et non la porte d'entree du module : celle-ci
 * re-exporte le client, qui tire `expo-constants`. Un `import type` est efface a la compilation, mais
 * viser le fichier sans dependance rend la contrainte lisible plutot que fragile.
 *
 * Voir docs/features/campus-vie-etudiante.md.
 */

import type { AnnonceRow } from '../../../shared/supabase/types';

/**
 * Ce qu'un ecran manipule.
 *
 * Les noms sont ceux d'avant la base — anglais, herites du fichier jsDelivr — et ils ne bougent pas :
 * renommer le contrat en meme temps qu'on change de source melangerait deux changements dont un seul
 * a une raison. Le schema, lui, est en francais comme le reste de la base.
 */
export interface BdeAnnonce {
    id: string;
    is_active: boolean;
    expires_at: string;
    title: string;
    issuer_name: string;
    image_url?: string;
    info_label?: string;
    long_desc?: string;
    cta_text?: string;
    cta_link?: string;
}

/** Une colonne nullable rend `null` ; le contrat applicatif, lui, omet ce qu'il n'a pas. */
function texte(value: string | null | undefined): string | undefined {
    return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Projette une ligne de la table sur le contrat applicatif.
 *
 * `active` est lu plutot que force a `true`. La politique de lecture ne laisse sortir que les lignes
 * actives, donc la valeur est vraie de toute facon — mais la lire coute un caractere et cesse d'etre
 * une supposition le jour ou la politique changera.
 */
export function projeterAnnonce(row: AnnonceRow): BdeAnnonce {
    return {
        id: String(row.id ?? ''),
        is_active: row.active === true,
        expires_at: texte(row.expire_le) ?? '',
        title: texte(row.titre) ?? '',
        issuer_name: texte(row.emetteur) ?? '',
        image_url: texte(row.image_url),
        info_label: texte(row.accroche),
        long_desc: texte(row.description),
        cta_text: texte(row.cta_texte),
        cta_link: texte(row.cta_lien),
    };
}

/**
 * La peremption est appliquee **ici** en plus de la base, et ce n'est pas de la redondance : la
 * politique protege la donnee, ce filtre protege l'affichage le jour ou la donnee viendra d'un cache
 * local. C'est aussi lui qui permettra un jour d'afficher une annonce expiree en grise plutot que de
 * la masquer, ce qu'un filtre cote base interdit.
 *
 * **Une annonce sans expiration n'expire pas.** `expire_le` est nullable et la politique de lecture
 * laisse passer `expire_le is null` : la traiter comme une date invalide — ce que faisait
 * `new Date('') > now`, toujours faux — l'aurait fait disparaitre de l'ecran alors que la base la
 * publie. Une date illisible, elle, reste un rejet : mieux vaut masquer une annonce que d'en afficher
 * une dont on ne sait pas si elle est encore d'actualite.
 */
export function estValide(annonce: BdeAnnonce, now: Date): boolean {
    if (annonce.expires_at === '') {
        return true;
    }

    const expiration = new Date(annonce.expires_at).getTime();
    return Number.isNaN(expiration) ? false : expiration > now.getTime();
}

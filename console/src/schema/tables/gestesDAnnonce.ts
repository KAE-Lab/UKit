/**
 * Les gestes d'une annonce (7-F), hors ecriture du formulaire : dupliquer, archiver, changer
 * l'audience. Charges paresseusement par le descripteur : ils tirent le client de la base.
 *
 * Chacun rend la ligne telle que la base l'a ecrite, pour que le formulaire la suive — la meme,
 * modifiee, ou la copie. Le journal, tenu par la base, trace chaque geste comme une ecriture.
 */

import { borneDe, peutPublier, type DroitsDeSession } from '../../auth/droits';
import { enregistrer } from '../../lib/base';
import type { ResultatDAction } from '../descripteurs';
import type { Ligne } from '../../supabase';
import { ANNONCES } from './annonces';

/** Ce que la copie ne reprend pas : la cle, les horodatages et la version que la base pose, ce qui se recalcule. */
const NON_COPIE: readonly string[] = ['id', 'creee_le', 'maj_le'];

/**
 * Une copie en brouillon, titre suffixe, pour refaire la meme affiche d'une semaine a l'autre sans
 * qu'elle parte en ligne avant d'etre relue. Un redacteur borne peut copier l'annonce d'un autre campus
 * (7-H) : la copie vise alors les siens — sans quoi la base la refuserait.
 */
export async function dupliquer(ligne: Ligne, droits: DroitsDeSession): Promise<ResultatDAction> {
    const copie: Ligne = Object.fromEntries(Object.entries(ligne).filter(([nom]) => !NON_COPIE.includes(nom)));
    copie.titre = `${String(ligne.titre ?? '')} (copie)`;
    copie.statut = 'brouillon';
    const borne = borneDe(droits);
    const recible = borne !== null && !peutPublier(droits, ligne.etablissements);
    if (recible) copie.etablissements = [...borne];
    const ecrite = await enregistrer(ANNONCES, copie, null);
    return { texte: recible ? 'Copie créée en brouillon, sur tes campus : c’est elle qui est ouverte.' : 'Copie créée en brouillon : c’est elle qui est ouverte.', ligne: ecrite };
}

export async function archiver(ligne: Ligne): Promise<ResultatDAction> {
    const ecrite = await enregistrer(ANNONCES, { statut: 'archivee' }, ligne);
    return { texte: 'Archivée : les téléphones ne la montrent plus, sa trace reste.', ligne: ecrite };
}

export async function changerAudience(ligne: Ligne, audience: 'tous' | 'testeurs'): Promise<ResultatDAction> {
    const ecrite = await enregistrer(ANNONCES, { audience }, ligne);
    return {
        texte: audience === 'testeurs'
            ? 'En audience « testeurs » : ouvre l’application sur un appareil enregistré, puis « Rendre à tout le monde ».'
            : 'De nouveau pour tout le monde.',
        ligne: ecrite,
    };
}

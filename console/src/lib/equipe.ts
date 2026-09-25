/**
 * La page Equipe parle a la fonction `editeurs` (supabase/functions/editeurs/, jalon 7-H) : inviter,
 * donner un nouveau mot de passe provisoire, revoquer. Changer un role ou des campus, lui, est une
 * ecriture ordinaire de la table, que la politique reserve a l'admin.
 *
 * Le mot de passe provisoire revient une seule fois, dans la reponse ; il ne part que vers le dialogue
 * qui le montre (SecretUnique.tsx), jamais vers l'URL, un cache ou le journal.
 */

import type { ResultatDAction, Secret } from '../schema/descripteurs';
import type { Ligne } from '../supabase';
import { appelerUneFonction } from './fonctions';

interface MotDePasseDonne {
    readonly ligne: Ligne | null;
    readonly motDePasse: string;
}

interface Revocation {
    readonly revoque: boolean;
    readonly compteSupprime: boolean;
    readonly avertissement?: string;
}

function secretPour(email: unknown, motDePasse: string): Secret {
    return {
        titre: `Mot de passe provisoire de ${String(email)}`,
        valeur: motDePasse,
        consigne: 'Transmets-le de vive voix, ou par un message privé : il ne s’affichera plus, et se change à la première connexion.',
    };
}

export async function inviter(ligne: Ligne): Promise<ResultatDAction> {
    const reponse = await appelerUneFonction<MotDePasseDonne>('editeurs', {
        action: 'inviter', email: ligne.email, role: ligne.role, etablissements: ligne.etablissements ?? null,
    });
    return {
        texte: 'Invitation faite : le compte existe, avec un mot de passe provisoire.',
        ligne: reponse.ligne ?? undefined,
        secret: secretPour(ligne.email, reponse.motDePasse),
    };
}

export async function reinitialiser(ligne: Ligne): Promise<ResultatDAction> {
    const reponse = await appelerUneFonction<MotDePasseDonne>('editeurs', { action: 'reinitialiser', email: ligne.email });
    return {
        texte: 'Nouveau mot de passe provisoire donné : l’ancien ne fonctionne plus.',
        ligne: reponse.ligne ?? undefined,
        secret: secretPour(ligne.email, reponse.motDePasse),
    };
}

export async function revoquer(ligne: Ligne): Promise<string> {
    const reponse = await appelerUneFonction<Revocation>('editeurs', { action: 'revoquer', email: ligne.email });
    return reponse.avertissement ?? (reponse.compteSupprime ? 'Révoqué : droits coupés, compte supprimé.' : 'Révoqué : droits coupés.');
}

/**
 * Les ecritures d'une table : enregistrer, creer par une fonction, supprimer ou retirer, agir. Chacune
 * invalide la table entiere et le journal — c'est ce qui remplace les rechargements a la main de
 * l'ancienne console —, et une ecriture de l'equipe invalide aussi les droits : un admin qui change son
 * propre role le voit aussitot.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enregistrer, supprimer } from '../lib/base';
import type { ActionDeLigne, CompteQuiAgit, Descripteur, ResultatDAction } from '../schema/descripteurs';
import type { Ligne } from '../supabase';
import { cles } from './client';

export function useEcriture(descripteur: Descripteur) {
    const client = useQueryClient();
    const invalider = async () => {
        await Promise.all([
            client.invalidateQueries({ queryKey: cles.table(descripteur.table) }),
            client.invalidateQueries({ queryKey: cles.table('journal') }),
            descripteur.table === 'editeurs' ? client.invalidateQueries({ queryKey: cles.toutesLesDroits }) : Promise.resolve(),
        ]);
    };

    const ecriture = useMutation({
        mutationFn: ({ valeurs, existante }: { readonly valeurs: Ligne; readonly existante: Ligne | null }) => enregistrer(descripteur, valeurs, existante),
        onSuccess: invalider,
    });
    // Une ligne neuve qui demande plus qu'une insertion : un membre de l'equipe a besoin d'un compte (7-H).
    const creation = useMutation({
        mutationFn: (valeurs: Ligne): Promise<ResultatDAction> => {
            if (descripteur.creer === undefined) throw new Error(`${descripteur.table} : aucune fonction de création`);
            return descripteur.creer(valeurs);
        },
        onSuccess: invalider,
    });
    // Retirer une ligne : la supprimer, ou le geste qui la remplace (revoquer un membre de l'equipe).
    const suppression = useMutation({
        mutationFn: async (ligne: Ligne): Promise<string | null> => {
            if (descripteur.retrait !== undefined) return descripteur.retrait.executer(ligne);
            await supprimer(descripteur, ligne);
            return null;
        },
        onSuccess: invalider,
    });
    const action = useMutation({
        mutationFn: ({ action: geste, ligne, compte }: { readonly action: ActionDeLigne; readonly ligne: Ligne; readonly compte: CompteQuiAgit }) => geste.executer(ligne, compte),
        onSuccess: invalider,
    });

    return { ecriture, creation, suppression, action };
}

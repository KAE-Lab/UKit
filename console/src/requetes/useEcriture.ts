/**
 * Les ecritures d'une table : enregistrer, supprimer, agir. Chacune invalide la table entiere et
 * le journal — c'est ce qui remplace les rechargements a la main de l'ancienne console.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enregistrer, supprimer } from '../lib/base';
import type { ActionDeLigne, Descripteur } from '../schema/descripteurs';
import type { Ligne } from '../supabase';
import { cles } from './client';

export function useEcriture(descripteur: Descripteur) {
    const client = useQueryClient();
    const invalider = async () => {
        await Promise.all([
            client.invalidateQueries({ queryKey: cles.table(descripteur.table) }),
            client.invalidateQueries({ queryKey: cles.table('journal') }),
        ]);
    };

    const ecriture = useMutation({
        mutationFn: ({ valeurs, existante }: { readonly valeurs: Ligne; readonly existante: Ligne | null }) => enregistrer(descripteur, valeurs, existante),
        onSuccess: invalider,
    });
    const suppression = useMutation({
        mutationFn: (ligne: Ligne) => supprimer(descripteur, ligne),
        onSuccess: invalider,
    });
    const action = useMutation({
        mutationFn: ({ action: geste, ligne }: { readonly action: ActionDeLigne; readonly ligne: Ligne }) => geste.executer(ligne),
        onSuccess: invalider,
    });

    return { ecriture, suppression, action };
}

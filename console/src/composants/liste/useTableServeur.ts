/**
 * Une table en mode serveur : l'etat (tri, filtres, recherche, page) vit dans l'URL, se traduit en
 * requete, et la base rend la page et le total. TanStack Table tient l'etat et les colonnes ; la
 * console garde sa peau.
 */

import { useCallback, useMemo } from 'react';

import { specDepuisEtat, type EtatDeTable } from '../../lib/requete';
import { useCampusChoisi } from '../campus';
import { useListe } from '../../requetes/useListe';
import type { Descripteur } from '../../schema/descripteurs';
import { naviguer, useRoute } from '../../routeur';
import { etatDepuisParams, paramsDepuisEtat, type Defauts } from './etatUrl';

export function useTableServeur(descripteur: Descripteur, defauts: Defauts = {}) {
    const { chemin, params } = useRoute();
    const campus = useCampusChoisi();
    const filtres = descripteur.filtres ?? [];
    const etat = useMemo(() => etatDepuisParams(params, filtres, defauts), [params, filtres, defauts]);
    const spec = useMemo(() => specDepuisEtat(descripteur, etat, campus), [descripteur, etat, campus]);
    const requete = useListe(descripteur, spec);

    const poser = useCallback((suivant: EtatDeTable) => {
        naviguer(chemin, paramsDepuisEtat(suivant, filtres, defauts), { remplacer: true });
    }, [chemin, filtres, defauts]);

    return { etat, poser, spec, requete, campus };
}

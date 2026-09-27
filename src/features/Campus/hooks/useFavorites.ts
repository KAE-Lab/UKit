/**
 * Les favoris d'une liste Campus, persistes, et relus a chaque retour sur l'ecran.
 *
 * `useFocusEffect` et non `useEffect` : le tableau de bord est un onglet qui ne se demonte jamais, et
 * la liste complete ecrit la meme cle ; une lecture au montage le laisserait sur ses favoris du
 * lancement (useSavedFilter.ts porte le meme raisonnement).
 *
 * **`pret` dit que la premiere lecture a eu lieu** (7-I). Avant elle, `favorites` vaut `[]` : une
 * section qui rendait ses cartes a ce moment les triait sans favori, puis les retriait quand la
 * lecture arrivait — et le ressort de `Card` faisait glisser les cartes sous les yeux a chaque
 * ouverture de l'onglet (docs/inventaire-mouvement.md, 5.7). Une section attend donc `pret` avant
 * de montrer ses cartes ; une relecture au retour sur l'onglet ne repasse pas par l'attente, et un
 * favori change entre-temps y reordonne bien les cartes — c'est le reflux voulu.
 */

import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export function useFavorites(storageKey: string) {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [pret, setPret] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const loadFavorites = async () => {
                try {
                    const savedFavs = await AsyncStorage.getItem(storageKey);
                    if (savedFavs) {
                        setFavorites(JSON.parse(savedFavs));
                    }
                } catch (e) {
                    console.error(`Erreur de lecture des favoris (${storageKey})`, e);
                } finally {
                    // Meme en echec : une lecture ratee rend la liste sans favori, elle ne la bloque pas.
                    setPret(true);
                }
            };
            loadFavorites();
        }, [storageKey])
    );

    const toggleFavorite = async (id: string) => {
        try {
            let newFavs = [...favorites];
            if (newFavs.includes(id)) {
                newFavs = newFavs.filter(favId => favId !== id);
            } else {
                newFavs.push(id);
            }
            setFavorites(newFavs);
            await AsyncStorage.setItem(storageKey, JSON.stringify(newFavs));
        } catch (e) {
            console.error(`Erreur de sauvegarde des favoris (${storageKey})`, e);
        }
    };

    return { favorites, toggleFavorite, pret };
}

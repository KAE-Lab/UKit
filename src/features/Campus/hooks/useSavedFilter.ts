import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Un filtre de liste Campus, persiste, et **relu a chaque retour sur l'ecran**.
 *
 * `useFocusEffect` et non `useEffect`, exactement pour la meme raison que `useFavorites` juste a
 * cote : deux ecrans lisent la meme cle — le tableau de bord et la liste complete — et chacun en a
 * **sa propre instance**, sans rien entre elles. Une lecture au montage suffisait a la liste, qui se
 * remonte a chaque ouverture ; elle ne suffisait pas au tableau de bord, qui est un onglet et **ne se
 * demonte jamais**. Il restait donc sur la valeur lue au lancement de l'application, definitivement :
 * changer le filtre depuis la liste ne faisait rien reapparaitre sur l'accueil, et passer en arriere-
 * plan n'y changeait rien non plus. Mesure sur appareil.
 *
 * Le troisieme element, `pret`, dit que la premiere lecture a eu lieu (7-I) : avant elle le filtre
 * vaut sa valeur par defaut, et une section qui rendait ses cartes a ce moment les refiltrait une
 * fraction de seconde plus tard (docs/inventaire-mouvement.md, 5.7).
 */
export function useSavedFilter(storageKey: string, defaultValue: string = 'all') {
    const [selectedFilter, setSelectedFilter] = useState(defaultValue);
    const [pret, setPret] = useState(false);

    useFocusEffect(useCallback(() => {
        const loadFilter = async () => {
            try {
                const savedFilter = await AsyncStorage.getItem(storageKey);
                setSelectedFilter(savedFilter ?? defaultValue);
            } catch (e) {
                console.error(`Erreur de lecture du filtre (${storageKey})`, e);
            } finally {
                setPret(true);
            }
        };
        loadFilter();
    }, [storageKey, defaultValue]));

    const updateFilter = useCallback(async (filter: string) => {
        setSelectedFilter(filter);
        try {
            await AsyncStorage.setItem(storageKey, filter);
        } catch (e) {
            console.error(`Erreur de sauvegarde du filtre (${storageKey})`, e);
        }
    }, [storageKey]);

    return [selectedFilter, updateFilter, pret] as const;
}

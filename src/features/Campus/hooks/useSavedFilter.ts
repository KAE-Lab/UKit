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
 */
export function useSavedFilter(storageKey: string, defaultValue: string = 'all') {
    const [selectedFilter, setSelectedFilter] = useState(defaultValue);

    useFocusEffect(useCallback(() => {
        const loadFilter = async () => {
            try {
                const savedFilter = await AsyncStorage.getItem(storageKey);
                setSelectedFilter(savedFilter ?? defaultValue);
            } catch (e) {
                console.error(`Erreur de lecture du filtre (${storageKey})`, e);
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

    return [selectedFilter, updateFilter] as const;
}

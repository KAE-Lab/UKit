import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export function useFavorites(storageKey: string) {
    const [favorites, setFavorites] = useState<string[]>([]);

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

    return { favorites, toggleFavorite };
}

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSavedFilter(storageKey: string, defaultValue: string = 'all') {
    const [selectedFilter, setSelectedFilter] = useState(defaultValue);

    useEffect(() => {
        const loadFilter = async () => {
            try {
                const savedFilter = await AsyncStorage.getItem(storageKey);
                if (savedFilter) {
                    setSelectedFilter(savedFilter);
                }
            } catch (e) {
                console.error(`Erreur de lecture du filtre (${storageKey})`, e);
            }
        };
        loadFilter();
    }, [storageKey]);

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

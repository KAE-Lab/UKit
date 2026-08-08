import { useState, useEffect, useRef } from 'react';
import { FlatList } from 'react-native';
import LibraryService, { TimetableEntry, LibraryInfo } from '../../services/LibraryService';
import type { UkitFailure } from '../../../../shared/aetherius';

export function useLibraryTimetableData(library: LibraryInfo) {
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    // Une semaine sans horaires publies et une source injoignable produisaient le meme ecran vide.
    // C'est ce que ce champ separe.
    const [failure, setFailure] = useState<UkitFailure | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [weekOffset, setWeekOffset] = useState(0);
    
    const flatListRef = useRef<FlatList>(null);
    const mountedRef = useRef(true);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        loadTimetable(weekOffset);
    }, [weekOffset]);

    const loadTimetable = async (offset: number) => {
        setLoading(true);
        const resultat = await LibraryService.fetchLibraryTimetable(library.slug, offset);
        if (!mountedRef.current) return;

        // `=== false` et non `!resultat.ok` : sans `strictNullChecks`, la seconde forme ne restreint
        // pas l'union. Voir shared/aetherius/runBlueprint.ts.
        if (resultat.ok === false) {
            setTimetable([]);
            setFailure(resultat.failure);
            setSelectedIndex(0);
            setLoading(false);
            return;
        }

        const data = resultat.entries;
        setTimetable(data);
        setFailure(undefined);

        if (offset === 0) {
            const todayIndex = data.findIndex(entry => entry.isToday);
            setSelectedIndex(todayIndex !== -1 ? todayIndex : 0);
        } else {
            setSelectedIndex(0);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (timetable.length > 0 && flatListRef.current) {
            const timerId = setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: selectedIndex,
                    animated: true,
                    viewPosition: 0.5
                });
            }, 100);
            return () => clearTimeout(timerId);
        }
    }, [selectedIndex, timetable]);

    return {
        timetable,
        failure,
        loading,
        selectedIndex,
        setSelectedIndex,
        weekOffset,
        setWeekOffset,
        flatListRef,
        scrollTimeoutRef,
        retry: () => loadTimetable(weekOffset)
    };
}

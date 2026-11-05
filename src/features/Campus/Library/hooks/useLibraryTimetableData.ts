import { useState, useEffect, useRef } from 'react';
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
    
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
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

    // Le recentrage de la case choisie vit dans le bandeau partage des fiches (`BandeauDeCases`).

    return {
        timetable,
        failure,
        loading,
        selectedIndex,
        setSelectedIndex,
        weekOffset,
        setWeekOffset,
        retry: () => loadTimetable(weekOffset)
    };
}

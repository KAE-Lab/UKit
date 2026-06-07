import { useState, useEffect, useRef } from 'react';
import { FlatList } from 'react-native';
import LibraryService, { TimetableEntry, LibraryInfo } from '../../services/LibraryService';

export function useLibraryTimetableData(library: LibraryInfo) {
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
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
        const data = await LibraryService.fetchLibraryTimetable(library.slug, offset);
        if (!mountedRef.current) return;
        setTimetable(data);

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
        loading,
        selectedIndex,
        setSelectedIndex,
        weekOffset,
        setWeekOffset,
        flatListRef,
        scrollTimeoutRef
    };
}

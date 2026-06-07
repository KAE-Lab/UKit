import { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import { BuildingInfo, FreeRoomSlot } from '../../services/FreeRoomService';
import { CampusApiService as FetchManager } from '../../services/CampusApiService';

export function useFreeRoomsData(building: BuildingInfo) {
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [freeRooms, setFreeRooms] = useState<FreeRoomSlot[]>([]);
    const [allEvents, setAllEvents] = useState<{ roomId: string, events: import('../../services/CampusApiService').CampusEvent[] }[]>([]);
    
    const [isClosed, setIsClosed] = useState(false);
    const [hoursList, setHoursList] = useState<string[]>([]);
    const [buildingCloseTime, setBuildingCloseTime] = useState('20:00');

    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        let closed = false;
        const currentDay = new Date().getDay() || 7;
        const daySchedule = building.schedule ? building.schedule[String(currentDay)] : null;

        if (!daySchedule) {
            closed = true;
        } else {
            setBuildingCloseTime(daySchedule.close);
            const openTime = parseInt(daySchedule.open.split(':')[0]);
            let closeTime = parseInt(daySchedule.close.split(':')[0]);
            
            if (daySchedule.close.includes(':00')) {
                closeTime -= 1;
            }
            
            const list = [];
            for (let i = openTime; i <= closeTime; i++) {
                list.push(`${i.toString().padStart(2, '0')}:00`);
            }
            setHoursList(list);

            const currentHour = new Date().getHours();
            let defaultIndex = list.findIndex(h => parseInt(h.split(':')[0]) === currentHour);
            if (defaultIndex === -1) {
                defaultIndex = currentHour < openTime ? 0 : list.length - 1;
            }
            setSelectedIndex(defaultIndex);
        }
        
        setIsClosed(closed);
        loadSchedules();
    }, [building]);

    const loadSchedules = async () => {
        setLoading(true);
        const today = moment().format('YYYY-MM-DD');

        const promises = building.rooms.map(async (room) => {
            try {
                const res = await FetchManager.fetchRoomsScheduleDay([room.id], today);
                return { roomId: room.id, events: res || [] };
            } catch (e) {
                return { roomId: room.id, events: [] };
            }
        });

        const results = await Promise.all(promises);

        if (!mountedRef.current) return;
        setAllEvents(results);
        setLoading(false);
    };

    useEffect(() => {
        if (!loading && allEvents && allEvents.length > 0) {
            if (allEvents.some(r => r.events.some((e: import('../../services/CampusApiService').CampusEvent) => e.isVacances))) {
                setIsClosed(true);
            } else if (!isClosed && hoursList.length > 0) {
                computeFreeRooms();
            }
        }
    }, [selectedIndex, loading, allEvents, isClosed, hoursList]);

    const computeFreeRooms = () => {
        const availableSlots = calculateFreeRooms(
            hoursList, selectedIndex, buildingCloseTime, building, allEvents
        );
        if (availableSlots) {
            setFreeRooms(availableSlots);
        }
    };

    return {
        loading,
        isClosed,
        hoursList,
        selectedIndex,
        setSelectedIndex,
        freeRooms
    };
}

export function calculateFreeRooms(
    hoursList: string[], 
    selectedIndex: number, 
    buildingCloseTime: string, 
    building: BuildingInfo, 
    allEvents: { roomId: string, events: import('../../services/CampusApiService').CampusEvent[] }[]
): FreeRoomSlot[] | null {
    if (hoursList.length === 0 || selectedIndex >= hoursList.length) return null;

    const selectedHourStr = hoursList[selectedIndex];
    const selectedTime = moment(selectedHourStr, 'HH:mm');
    const endOfDayTime = moment(buildingCloseTime, 'HH:mm');

    const availableSlots: FreeRoomSlot[] = [];

    for (const room of building.rooms) {
        const roomResult = allEvents.find(r => r.roomId === room.id);
        const roomEvents = roomResult ? roomResult.events : [];

        let isOccupied = false;
        let nextEventStart = endOfDayTime;

        for (const event of roomEvents) {
            const eventStart = moment(event.starttime, 'HH:mm');
            const eventEnd = moment(event.endtime, 'HH:mm');

            if (selectedTime.isSameOrAfter(eventStart) && selectedTime.isBefore(eventEnd)) {
                isOccupied = true;
                break;
            }

            if (eventStart.isAfter(selectedTime)) {
                if (eventStart.isBefore(nextEventStart)) {
                    nextEventStart = eventStart;
                }
            }
        }

        if (!isOccupied) {
            const durationMinutes = nextEventStart.diff(selectedTime, 'minutes');
            if (durationMinutes >= 15) {
                availableSlots.push({
                    room,
                    availableUntil: nextEventStart.format('HH:mm'),
                    durationMinutes
                });
            }
        }
    }

    availableSlots.sort((a, b) => {
        if (b.durationMinutes !== a.durationMinutes) {
            return b.durationMinutes - a.durationMinutes;
        }
        return a.room.name.localeCompare(b.room.name);
    });

    return availableSlots;
}

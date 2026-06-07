import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

export function useCampusLocation() {
    const [locationError, setLocationError] = useState(false);

    const fetchLocation = useCallback(async () => {
        let lat: number | undefined = undefined;
        let lon: number | undefined = undefined;
        let error = false;

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let location = await Location.getLastKnownPositionAsync({});
                if (!location) {
                    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                }
                if (location) {
                    lat = location.coords.latitude;
                    lon = location.coords.longitude;
                }
            } else {
                error = true;
                setLocationError(true);
            }
        } catch (e) {
            error = true;
            setLocationError(true);
        }

        // Fallback pour émulateur (Talence par défaut)
        if (lat === undefined || lon === undefined) {
            lat = 44.8048;
            lon = -0.5954;
        }

        return { lat, lon, error };
    }, []);

    return { fetchLocation, locationError };
}

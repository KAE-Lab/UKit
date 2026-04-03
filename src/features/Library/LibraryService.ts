import Translator from "../../shared/i18n/Translator";

export interface LibraryInfo {
    id: string;
    name: string;
    campus: string;
    lat: number;
    lng: number;
    slug: string; 
    distance?: number;
    imageUrl?: string;
}

export interface AffluencesData {
    isOpen: boolean;
    occupancyRate: number | null; 
    closingTime?: string;
    openingText?: string;
}

export interface TimetableEntry {
    day: string;
    isToday: boolean;
    openingHours: {
        openingHour: string;
        closingHour: string;
    }[];
}

function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default class LibraryService {
    
    static async fetchNearbyLibraries(userLat: number, userLng: number): Promise<LibraryInfo[]> {
        try {
            const scanPoints = [
                { lat: userLat, lng: userLng }, 
                { lat: 44.8377, lng: -0.5791 }, // Bordeaux Centre (Victoire, Bastide, Chartrons)
                { lat: 44.7963, lng: -0.6277 }, // Campus Talence / Pessac / Gradignan
                { lat: 43.2951, lng: -0.3707 }, // Pau
                { lat: 46.1603, lng: -1.1511 }, // La Rochelle
                { lat: 45.8336, lng: 1.2611 },  // Limoges
                { lat: 46.5802, lng: 0.3403 },  // Poitiers
                { lat: 43.4929, lng: -1.4748 }, // Bayonne / Anglet
                { lat: 45.1920, lng: 0.7194 },  // Perigueux
                { lat: 44.2031, lng: 0.6163 },  // Agen
                { lat: 45.6483, lng: 0.1562 },  // Angouleme
                { lat: 46.3237, lng: -0.4647 }  // Niort
            ];

            const fetchPromises = scanPoints.map(point => 
                fetch('https://api.affluences.com/app/v3/sites/map', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'fr',
                        'Content-Type': 'application/json',
                        'x-service-name': 'website',
                        'Origin': 'https://affluences.com',
                        'Referer': 'https://affluences.com/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: JSON.stringify({
                        latitude: point.lat,
                        longitude: point.lng,
                    })
                }).then(res => res.ok ? res.json() : { data: { results: [] } })
            );

            const allResponses = await Promise.all(fetchPromises);
            
            const uniqueLibraries = new Map();
            
            allResponses.forEach(json => {
                const results = json.data?.results || [];
                results.forEach((site: any) => {
                    // Filtrage sur les categories BU classiques et universitaires
                    if (site.categories?.some((cat: any) => cat.id === 1 || cat.id === 20)) {
                        if (!uniqueLibraries.has(site.id)) {
                            uniqueLibraries.set(site.id, site);
                        }
                    }
                });
            });

            const formattedLibraries = Array.from(uniqueLibraries.values()).map((lib: any) => {
                const city = lib.location?.address?.city;
                const imageUrl = (lib.images && lib.images.length > 0 ? lib.images[0] : lib.poster_image) || null;
                const siteLat = lib.location?.coordinates?.latitude;
                const siteLng = lib.location?.coordinates?.longitude;
                
                // Recalcul strict de la distance par rapport au vrai GPS de l'utilisateur
                let trueDistance = undefined;
                if (siteLat !== undefined && siteLng !== undefined && userLat !== undefined && userLng !== undefined) {
                    trueDistance = getDistanceInKm(userLat, userLng, siteLat, siteLng);
                } else {
                    trueDistance = lib.estimated_distance / 1000;
                }

                return {
                    id: lib.id,
                    name: lib.primary_name,
                    campus: city || Translator.get('CAMPUS'),
                    lat: siteLat,
                    lng: siteLng,
                    slug: lib.slug,
                    distance: trueDistance,
                    imageUrl: imageUrl
                };
            });

            formattedLibraries.sort((a, b) => (a.distance || 0) - (b.distance || 0));

            return formattedLibraries;
        } catch (error) {
            console.error("Erreur lors de la récupération de la liste des BUs", error);
            return [];
        }
    }

    // Récupère les données en temps réel pour une BU spécifique
    static async getAffluencesData(slug: string): Promise<AffluencesData | null> {
        try {
            const response = await fetch(`https://api.affluences.com/app/v4/sites/${slug}/live-data`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'fr',
                    'x-service-name': 'website',
                    'Origin': 'https://affluences.com',
                    'Referer': 'https://affluences.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.ok) return null;

            const json = await response.json();
            const payload = json.data;

            const isOpen = payload?.status?.isOpen ?? false;
            let occupancyRate = null;
            
            if (payload?.liveAttendance) {
                occupancyRate = payload.liveAttendance.percentage ?? payload.liveAttendance.occupancy ?? null;
            }
            
            return {
                isOpen: isOpen,
                occupancyRate: occupancyRate,
                closingTime: payload?.status?.closingAt,
                openingText: payload?.status?.openingText
            };
        } catch (error) {
            console.error(`Erreur lors de la récupération des données Affluences pour ${slug}:`, error);
            return null;
        }
    }

    static async fetchLibraryTimetable(slug: string, weekOffset: number = 0): Promise<TimetableEntry[]> {
        try {
            const response = await fetch(`https://api.affluences.com/app/v4/sites/${slug}/timetables?weekOffset=${weekOffset}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'fr',
                    'x-service-name': 'website',
                    'Origin': 'https://affluences.com',
                    'Referer': 'https://affluences.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) return [];

            const json = await response.json();
            return json.data?.entries || [];
        } catch (error) {
            console.error(`Erreur lors de la récupération des horaires pour ${slug}:`, error);
            return [];
        }
    }
}
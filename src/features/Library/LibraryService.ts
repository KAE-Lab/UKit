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

export default class LibraryService {
    
    // Récupère la liste dynamique des BU autour de l'utilisateur
    static async fetchNearbyLibraries(userLat: number, userLng: number): Promise<LibraryInfo[]> {
        try {
            const response = await fetch('https://api.affluences.com/app/v3/sites/map', {
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
                    latitude: userLat,
                    longitude: userLng,
                    // page: 0
                })
            });

            if (!response.ok) {
                console.error("Erreur HTTP de l'API", response.status);
                return [];
            }

            const json = await response.json();
            const results = json.data?.results || [];

            // Filtrer pour ne garder que les bibliothèques (Cat 1 = BU classique, Cat 20 = BU Universitaire)
            const libraries = results.filter((site: any) => 
                site.categories?.some((cat: any) => cat.id === 1 || cat.id === 20)
            );

            return libraries.map((lib: any) => {
                const city = lib.location?.address?.city;
                const campusStr = city;

                const imageUrl = (lib.images && lib.images.length > 0 ? lib.images[0] : lib.poster_image) || null;

                return {
                    id: lib.id,
                    name: lib.primary_name,
                    campus: campusStr || Translator.get('CAMPUS'),
                    lat: lib.location?.coordinates?.latitude,
                    lng: lib.location?.coordinates?.longitude,
                    slug: lib.slug,
                    distance: lib.estimated_distance / 1000,
                    imageUrl: imageUrl
                };
            });
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
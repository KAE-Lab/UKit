// ─── INTERFACES ─────────────────────────────────────────────────────────────

export interface CrousDish {
    name: string;
}

export interface CrousMenuCategory {
    name: string;
    dishes: CrousDish[];
}

export interface CrousMenu {
    date: string;
    meal: 'midi' | 'soir';
    categories: CrousMenuCategory[];
}

export interface CrousRestaurant {
    id: string;
    title: string;
    short_desc: string;
    lat: number;
    lon: number;
    opening: string;
    menus?: CrousMenu[];
    distance?: number;
}

export interface CrousDayMenu {
    date: string;
    midi: { name: string, dishes: string[] }[];
    soir: { name: string, dishes: string[] }[];
}


// ─── OUTILS ─────────────────────────────────────────────────────────────────

function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ─── SERVICE ───────────────────────────────────────────────

class CrousServiceManager {
    private readonly API_URL = 'https://api.croustillant.menu/v1';

    // Récupération de la liste des restaurants
    async fetchRestaurantsBordeaux(userLat?: number, userLon?: number): Promise<CrousRestaurant[]> {
        try {
            // Nouvelle-Aquitaine (code 1)
            const response = await fetch(`${this.API_URL}/regions/1/restaurants`);
            
            if (!response.ok) throw new Error(`Erreur réseau : ${response.status}`);

            const jsonResponse = await response.json();
            if (!jsonResponse.data) return [];

            let restaurants: CrousRestaurant[] = jsonResponse.data.map((resto: any) => {
                let distance = undefined;
                if (userLat !== undefined && userLon !== undefined) {
                    distance = getDistanceInKm(userLat, userLon, resto.latitude, resto.longitude);
                }

                return {
                    id: String(resto.code),
                    title: resto.nom,
                    short_desc: resto.zone || resto.adresse,
                    lat: resto.latitude,
                    lon: resto.longitude,
                    opening: Array.isArray(resto.horaires) ? resto.horaires.join(' | ') : 'Horaires non spécifiés',
                    distance: distance
                };
            });

            // Tri par distance (plus proche en premier)
            if (userLat !== undefined && userLon !== undefined) {
                restaurants.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            }

            return restaurants;

        } catch (error) {
            console.error('Erreur fetchRestaurantsBordeaux:', error);
            return [];
        }
    }

    // Récupération du menu d'un restaurant spécifique
    async fetchRestaurantMenu(restaurantId: string): Promise<CrousDayMenu[]> {
        try {
            const response = await fetch(`${this.API_URL}/restaurants/${restaurantId}/menu`);
            if (!response.ok) return [];
            
            const jsonResponse = await response.json();
            if (!jsonResponse.data) return [];
            
            const rawMenus = Array.isArray(jsonResponse.data) ? jsonResponse.data : [jsonResponse.data];
            
            return rawMenus.map((day: any) => {
                
                // "DD-MM-YYYY" -> "YYYY-MM-DD" 
                let formattedDate = day.date || 'Inconnue';
                if (formattedDate.includes('-') && formattedDate.length === 10) {
                    const [d, m, y] = formattedDate.split('-');
                    if (y.length === 4) {
                        formattedDate = `${y}-${m}-${d}`;
                    }
                }

                const repasMidi = (day.repas || []).find((r: any) => r.type === 'midi');
                const repasSoir = (day.repas || []).find((r: any) => r.type === 'soir');

                const parseMeal = (mealData: any) => {
                    if (!mealData || !Array.isArray(mealData.categories)) return [];
                    
                    return mealData.categories.map((cat: any) => ({
                        name: cat.libelle || 'Catégorie', // "Entrées", "Plats du jour"...
                        dishes: Array.isArray(cat.plats) ? cat.plats.map((p:any) => p.libelle || '') : []
                    }));
                };

                return {
                    date: formattedDate,
                    midi: parseMeal(repasMidi),
                    soir: parseMeal(repasSoir)
                };
            });
            
        } catch (error) {
            console.error('Erreur fetch menu:', error);
            return [];
        }
    }
}

export const CrousService = new CrousServiceManager();
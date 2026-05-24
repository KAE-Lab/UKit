export interface BdeAnnonce {
    id: string;
    is_active: boolean;
    expires_at: string;
    title: string;
    issuer_name: string;
    image_url?: string;
    info_label?: string;
    long_desc?: string;
    cta_text?: string;
    cta_link?: string;
}

const BdeService = {
    fetchAnnonces: async (): Promise<BdeAnnonce[]> => {
        try {
            const response = await fetch('https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/annonces.json');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            
            const now = new Date();
            
            if (data && data.annonces) {
                return data.annonces.filter((item: BdeAnnonce) => {
                    if (!item.is_active) return false;
                    const expiresAt = new Date(item.expires_at);
                    return expiresAt > now;
                });
            }
            return [];
        } catch (error) {
            console.error("Error fetching annonces:", error);
            return [];
        }
    }
};

export default BdeService;

const BdeService = {
    fetchAnnonces: async () => {
        try {
            const response = await fetch('https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/annonces.json');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            
            const now = new Date();
            
            if (data && data.annonces) {
                return data.annonces.filter(item => {
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

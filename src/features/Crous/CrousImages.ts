
const defaultImage = require('../../../assets/images/default_resto.png');

const imagesMap: { [key: string]: any } = {
    
    // "Crous Market' La Soucoupe": require('../../../assets/images/la_soucoupe.jpg'),
    // "Crous Market' BUST": require('../../../assets/images/bust.jpg'),
    // "Restaurant administratif Le Haut-Carré": require('../../../assets/images/haut_carre.jpg'),
    // "Resto U L'Amazone": require('../../../assets/images/amazone.jpg'),
    // "CHU de Bordeaux Arnozan": require('../../../assets/images/arnozan.jpg'),
    // "Resto U' n°2": require('../../../assets/images/resto_u_2.jpg'),
    // "Restaurant la Passerelle": require('../../../assets/images/la_passerelle.jpg'),
    // "Resto U' le Mascaret": require('../../../assets/images/le_mascaret.jpg'),
    // "Crous Market' Le Musée": require('../../../assets/images/le_musee.jpg'),
    // "Resto U' le Capu": require('../../../assets/images/le_capu.jpg'),
    // "INSPE Bordeaux - Site Caudéran": require('../../../assets/images/inspe_cauderan.jpg'),
    // "Resto U' la Bastide": require('../../../assets/images/la_bastide.jpg'),
    // "Crous Cafet' le 98": require('../../../assets/images/le_98.jpg'),
    // "Lycée Saint Louis": require('../../../assets/images/saint_louis.jpg'),
    // etc..
};

export const getCrousImage = (restaurantName: string) => {
    // Nettoyage pour éviter les problèmes d'espaces ou de casse
    const cleanName = restaurantName.trim();
    
    if (imagesMap[cleanName]) {
        return imagesMap[cleanName];
    }
    
    return defaultImage;
};
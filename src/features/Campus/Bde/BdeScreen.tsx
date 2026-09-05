import React, { useContext, useMemo, useState } from 'react';
import { Dimensions } from 'react-native';

import { AppContext } from '../../../shared/services/AppCore';
import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import type { BdeAnnonce } from '../services/BdeService';
import { useBdeAnnonces } from '../hooks/useBdeAnnonces';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';

import { CampusListLayout } from '../components/CampusListLayout';
import { BdeAnnonceCard } from './BdeAnnonceCard';

export interface BdeScreenProps {
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setOptions?: (options: unknown) => void };
    onAnimatedScroll?: (event: unknown) => void;
}

const { width } = Dimensions.get('window');
// Deux affiches par rangee : la largeur d'ecran, moins le rembourrage de rangee et la gouttiere
// poses par le socle de liste quand il passe en grille.
const CELL_WIDTH = Math.floor((width - tokens.space.sm * 2 - tokens.space.md) / 2);

function BdeScreen({ navigation, onAnimatedScroll }: BdeScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const { annonces, failure, loading, retry } = useBdeAnnonces();
    const [recherche, setRecherche] = useState('');

    // La recherche porte sur ce que l'oeil connait d'une carte : le titre, l'emetteur, l'accroche.
    const visibles = useMemo(() => {
        const requete = recherche.trim().toLowerCase();
        if (requete === '') return annonces;
        return annonces.filter((annonce) =>
            annonce.title.toLowerCase().includes(requete)
            || annonce.issuer_name.toLowerCase().includes(requete)
            || (annonce.info_label ?? '').toLowerCase().includes(requete));
    }, [annonces, recherche]);

    const renderItem = ({ item }: { item: BdeAnnonce }) => (
        <BdeAnnonceCard
            annonce={item}
            width={CELL_WIDTH}
            theme={theme}
            style={{ marginBottom: tokens.space.md }}
            onPress={() => navigation.navigate('BdeDetail', { annonce: item })}
        />
    );

    return (
        <CampusListLayout
            data={visibles}
            loading={loading}
            messageChargement={Translator.get('LOADING_ANNOUNCEMENTS')}
            renderItem={renderItem}
            numColumns={2}
            onAnimatedScroll={onAnimatedScroll}
            navigation={navigation}
            hasSearch
            searchText={recherche}
            onSearchChange={setRecherche}
            searchPlaceholder={Translator.get('SEARCH_ANNONCE')}
            // Le double du seuil des listes : la grille range deux affiches par rangee, et la barre
            // n'a de sens que si la page deborde de l'ecran.
            seuilRecherche={8}
            emptyIcon="party-popper"
            emptyTitle={Translator.get('NO_RESULTS_TITLE')}
            emptyMessage={Translator.get('NO_RESULTS')}
            failure={failure}
            onRetry={retry}
        />
    );
}

export default withHeaderAnimation(BdeScreen);

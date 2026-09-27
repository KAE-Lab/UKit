/**
 * La section des annonces du tableau de bord : un carrousel d'affiches 4:5.
 *
 * Ses annonces arrivent par le contexte du tableau de bord (annonces.tsx), lu une fois pour elle et
 * pour les cartes speciales des sections de lieux. Elle attend sous un squelette a la forme des
 * affiches ; une panne prend le gabarit d'une affiche. Et quand la base n'a rien, la section se
 * retire — en fondu, et les sections du dessous remontent au ressort (SectionDuTableau) : une absence
 * d'annonces ne merite pas de ligne, mais une section qui disparait d'un coup faisait sauter l'ecran.
 */

import React, { useContext } from 'react';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import { useImpressionsDAnnonces } from '../../../../shared/mesure/impressions';
import { BdeAnnonceCard } from '../../Bde/BdeAnnonceCard';
import type { BdeAnnonce } from '../../services/BdeService';
import { useAnnoncesDuTableau } from '../annonces';
import { CarrouselDeSection } from './CarrouselDeSection';
import { LARGEUR_CARTE_ANNONCE } from './gabarits';
import { SectionDuTableau } from './SectionDuTableau';
import { SectionEtatVide } from './SectionEtatVide';
import { SqueletteDeCarrouselDAnnonces } from './SqueletteDeCarrousel';

const identifiant = (annonce: BdeAnnonce) => annonce.id;

export function BdeSection({ navigation }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const { annonces, failure, loading, retry } = useAnnoncesDuTableau();
    const enEchec = failure !== undefined && failure.silent !== true;
    // Les impressions (7-D) : le couple de visibilite, stable, declare avant le retour conditionnel.
    const visibilite = useImpressionsDAnnonces<BdeAnnonce>(identifiant);

    // Une absence d'annonces ne merite pas de section. Un echec, si : disparaitre en silence est
    // precisement ce qui rendait « la source est morte » indiscernable de « il n'y a rien ».
    if (!loading && annonces.length === 0 && !enEchec) return null;

    const renderCard = ({ item, index }: { item: BdeAnnonce; index: number }) => (
        <BdeAnnonceCard
            annonce={item}
            width={LARGEUR_CARTE_ANNONCE}
            rang={index}
            theme={theme}
            style={{ marginRight: tokens.space.md }}
            onPress={() => navigation.navigate('BdeDetail', { annonce: item })}
        />
    );

    return (
        <SectionDuTableau>
            <SectionHeader
                title={Translator.get('ANNOUNCEMENTS')}
                theme={theme}
                onPress={() => navigation.navigate('Bde')}
            />

            {loading ? (
                <SqueletteDeCarrouselDAnnonces theme={theme} libelle={Translator.get('LOADING_ANNOUNCEMENTS')} />
            ) : enEchec ? (
                <SectionEtatVide
                    theme={theme}
                    failure={failure}
                    masquesParFiltre={false}
                    gabarit="annonce"
                    onRetry={retry}
                    onOuvrir={() => navigation.navigate('Bde')}
                />
            ) : (
                <CarrouselDeSection data={annonces} renderItem={renderCard} keyExtractor={identifiant} largeurCarte={LARGEUR_CARTE_ANNONCE} {...visibilite} />
            )}
        </SectionDuTableau>
    );
}

/**
 * Les amis (docs/phase-8/8-amis.md) : partager son emploi du temps, et la liste de ceux qui ont partage
 * le leur. Une page de detail, dans le gabarit des Reglages : son court paragraphe en tete, puis des
 * rangees qui menent. Ouverte du Planning, par le bouton de l'en-tete.
 */

import moment from 'moment';
import React, { useContext } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import { AppContext } from '../../../shared/services/AppCore';
import { maintenant } from '../../../shared/services/Temps';
import style, { tokens } from '../../../shared/theme/Theme';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { GroupeDeReglages, IntroDePage, RangeeDeReglage } from '../../../shared/ui/GroupeDeReglages';
import { amiExpire, type Ami } from '../services/amis';
import { useAmis } from '../services/AmisStore';
import { dateDuJour, dernierJour } from '../services/instantane';

interface AmisScreenProps {
    navigation: { navigate: (route: string, params?: object) => void };
    headerPadding?: Record<string, unknown>;
    onAnimatedScroll?: (event: unknown) => void;
}

/** Ce que la rangee d'un ami dit a droite : ses groupes, la fin de son instantane, ou qu'il a expire. */
function valeurDe(ami: Ami, aujourdhui: string): string {
    if (ami.contenu.genre === 'groupes') return ami.contenu.groupes.join(', ');
    if (amiExpire(ami, aujourdhui)) return Translator.get('AMI_EXPIRE');
    return Translator.get('AMI_JUSQUAU', moment(dernierJour(ami.contenu.premierJour)).format('D MMM'));
}

export default function AmisScreen({ navigation, headerPadding, onAnimatedScroll }: AmisScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];
    const amis = useAmis();
    const aujourdhui = dateDuJour(maintenant());

    return (
        <View style={[styles.page, { backgroundColor: theme.background }]}>
            <Animated.ScrollView contentContainerStyle={[headerPadding, styles.contenu]} onScroll={onAnimatedScroll as never} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
                <IntroDePage theme={theme}>{Translator.get('AMIS_INTRO')}</IntroDePage>
                <GroupeDeReglages theme={theme}>
                    <RangeeDeReglage theme={theme} icone="qrcode" libelle={Translator.get('AMIS_PARTAGER')} onPress={() => navigation.navigate('PartageAmi')} />
                </GroupeDeReglages>
                {amis !== null && amis.length > 0 ? (
                    <GroupeDeReglages theme={theme} titre={Translator.get('AMIS_TITRE')}>
                        {amis.map((ami) => (
                            <RangeeDeReglage
                                key={ami.id}
                                theme={theme}
                                icone={ami.contenu.genre === 'groupes' ? 'account-group-outline' : 'clock-outline'}
                                libelle={ami.nom}
                                valeur={valeurDe(ami, aujourdhui)}
                                onPress={() => navigation.navigate('Ami', { id: ami.id, nom: ami.nom })}
                            />
                        ))}
                    </GroupeDeReglages>
                ) : null}
                {amis !== null && amis.length === 0 ? (
                    <View style={styles.vide}>
                        <EmptyState theme={theme} icon="account-multiple-outline" title={Translator.get('AMIS_VIDE_TITRE')} message={Translator.get('AMIS_VIDE')} />
                    </View>
                ) : null}
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    contenu: {
        paddingBottom: tokens.space.xxl,
    },
    vide: {
        marginHorizontal: tokens.space.sm,
        marginTop: tokens.space.lg,
    },
});

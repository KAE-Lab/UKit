/**
 * La pastille d'etat de service, en tete des onglets.
 *
 * Toujours la, a droite du grand titre, au gabarit des boutons d'en-tete (`HeaderButton`) : un « i »
 * gris quand tout va bien, rouge quand un incident est en cours. Le toucher ouvre, dans le premier
 * cas, une feuille « Rien a signaler » avec le lien du formulaire — celui ou l'on dit un bug, une
 * idee, une demande, publie par le catalogue (`services.adaptation`), ouvert dans le navigateur
 * integre comme partout ailleurs — et dans le second la feuille de l'incident.
 *
 * Elle a d'abord ete un rappel qui n'existait que pendant un incident, puis un bandeau permanent qui
 * cachait le grand titre (retours d'appareil du 2026-09-03). Une pastille toujours presente vaut
 * mieux qu'une qui apparait : sa presence n'inquiete pas, sa couleur informe, et elle donne un chemin
 * vers le formulaire depuis chaque onglet — quelqu'un qui a trouve un bug le cherche precisement la.
 *
 * Chaque en-tete d'onglet la pose lui-meme, comme il pose son titre : c'est ce qui l'aligne avec lui,
 * et ce qui lui evite d'entrer en collision avec les boutons des ecrans pousses, qui ne la montrent
 * pas. Le `style` recu — la marge qui la pousse a droite — s'applique a son enveloppe, pas a la
 * surface du bouton : posee sur la surface, la marge ne jouait que dans la boite tactile et la
 * pastille restait collee au titre.
 *
 * Voir docs/pilotage.md.
 */

import React, { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { contexteDeCiblage } from '../ciblage';
import { serviceEtablissement } from '../etablissements/catalogue';
import Translator from '../i18n/Translator';
import { maintenant } from '../services/Temps';
import type { AppThemeType } from '../theme/Theme';
import { Dialogue } from '../ui/Dialogue';
import { HEADER_BUTTON_ICON, HeaderButton } from '../ui/HeaderButton';
import { messagesConnus, onMessages } from './index';
import { choisirPresentation } from './presentation';
import { vusConnus } from './vus';

export interface PastilleServiceProps {
    readonly theme: AppThemeType;
    /** La place dans la rangee du titre : le plus souvent `marginLeft: 'auto'` et la marge basse du titre. */
    readonly style?: StyleProp<ViewStyle>;
}

export function PastilleService({ theme, style }: PastilleServiceProps) {
    const [, setRevision] = useState(0);
    const [ouverte, setOuverte] = useState(false);

    useEffect(() => onMessages(() => setRevision((revision) => revision + 1)), []);

    // Le navigateur integre, comme chaque autre chemin vers le formulaire dans l'application (la
    // demande de campus, l'action d'une annonce) : la pastille vit dans les en-tetes d'onglet, donc
    // toujours sous le navigateur de la pile.
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const { rappel } = choisirPresentation(messagesConnus(), vusConnus(), contexteDeCiblage(), maintenant());
    const formulaire = serviceEtablissement('adaptation');
    const fermer = () => setOuverte(false);

    return (
        <View style={style}>
            <HeaderButton theme={theme} onPress={() => setOuverte(true)}>
                <MaterialCommunityIcons
                    name="information"
                    size={HEADER_BUTTON_ICON}
                    color={rappel !== null ? theme.danger : theme.fontSecondary}
                />
            </HeaderButton>
            {rappel !== null ? (
                <Dialogue
                    theme={theme}
                    visible={ouverte}
                    fermer={fermer}
                    titre={rappel.titre}
                    corps={rappel.corps ?? ''}
                    libelleFermer={Translator.get('MESSAGE_COMPRIS')}
                />
            ) : (
                <Dialogue
                    theme={theme}
                    visible={ouverte}
                    fermer={fermer}
                    titre={Translator.get('SERVICE_OK_TITLE')}
                    corps={Translator.get('SERVICE_OK_BODY')}
                    lien={formulaire === null ? undefined : {
                        libelle: Translator.get('SERVICE_REPORT_LINK'),
                        onPress: () => { fermer(); navigation.navigate('WebBrowser', { href: formulaire }); },
                    }}
                />
            )}
        </View>
    );
}

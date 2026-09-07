/**
 * Les identifiants que le navigateur integre a memorises, et le geste de les oublier.
 *
 * Ils existent depuis que la page Scolarite se montre sans compte (6.1.x-B) : quelqu'un qui ouvre le
 * webmail depuis les portes, se connecte a la main sur le CAS, et accepte de « memoriser », a des
 * identifiants dans le trousseau **sans avoir de compte UKit**. Une donnee chiffree qu'aucun ecran ne
 * montre est une donnee qu'on ne peut pas retirer : cette rangee la nomme, la et l'oublie.
 *
 * Elle ne s'affiche que lorsqu'il y en a, et seulement sur l'ecran du compte sans compte — avec un
 * compte, la session remplit le navigateur, et ces identifiants-la ne servent plus.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Translator from '../../../shared/i18n/Translator';
import SecureStoreService from '../../../shared/services/SecureStoreService';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { ConfirmationScolarite } from './ConfirmationScolarite';
import { GroupeScolarite, LigneScolarite } from './LigneScolarite';

export interface IdentifiantsNavigateurProps {
    theme: AppThemeType;
    teinte: string;
}

export function IdentifiantsNavigateur({ theme, teinte }: IdentifiantsNavigateurProps) {
    const [identifiant, setIdentifiant] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState(false);

    // Relu a chaque retour sur l'ecran : le navigateur ecrit le trousseau sans prevenir personne, et
    // c'est juste apres l'avoir ferme qu'on revient ici.
    const relire = useCallback(() => {
        void SecureStoreService.getAutofill().then((compte) => setIdentifiant(compte?.username ?? null));
    }, []);
    useEffect(relire, [relire]);
    useFocusEffect(relire);

    const oublier = () => {
        setConfirmation(false);
        void SecureStoreService.deleteAutofill().then(relire);
    };

    if (identifiant === null) return null;

    return (
        <View style={{ marginHorizontal: tokens.space.md, marginTop: tokens.space.lg }}>
            <GroupeScolarite theme={theme}>
                <LigneScolarite
                    theme={theme}
                    icon={{ name: 'form-textbox-password' }}
                    teinte={teinte}
                    titre={Translator.get('BROWSER_AUTOFILL_TITLE')}
                    sousTitre={`${identifiant} · ${Translator.get('BROWSER_AUTOFILL_DESC')}`}
                    chevron
                    onPress={() => setConfirmation(true)}
                />
            </GroupeScolarite>
            <ConfirmationScolarite
                theme={theme}
                visible={confirmation}
                titre={Translator.get('BROWSER_AUTOFILL_FORGET')}
                description={Translator.get('BROWSER_AUTOFILL_FORGET_DESC')}
                confirmer={Translator.get('BROWSER_AUTOFILL_FORGET')}
                onClose={() => setConfirmation(false)}
                onConfirm={oublier}
                destructif
            />
        </View>
    );
}

/**
 * Le bloc Mesure du menu de developpement (7-D), au bas de l'onglet Testeur : ce que l'appareil
 * compte et ce qu'il a envoye — l'interrupteur, la taille de la file, le dernier envoi —, et les deux
 * gestes qui rendent le protocole jouable sans attendre un passage en arriere-plan : envoyer, vider.
 *
 * Un bloc et non un sixieme onglet : la barre du menu n'a pas la place (ModMenu, MENU_WIDTH). Dans
 * l'onglet Testeur, a cote du jeton push, parce que c'est l'autre chose que l'appareil ecrit vers la
 * base. Les libelles sont en dur, comme le reste du menu (docs/qualite.md).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Text, TouchableOpacity, View } from 'react-native';
import moment from 'moment';

import { EVENEMENT_MESURE, envoyerLesMesures, etatDeLaMesure, viderLaFile, type DernierEnvoi, type EtatDeLaMesure } from '../mesure';
import { tokens, type AppThemeType } from '../theme/Theme';

export interface ModMenuMesureProps {
    readonly theme: AppThemeType;
}

function Ligne({ theme, cle, valeur, ton }: { theme: AppThemeType; cle: string; valeur: string; ton?: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.space.xxs }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs }}>{cle}</Text>
            <Text style={{ color: ton ?? theme.font, fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.bold, flexShrink: 1, textAlign: 'right' }}>
                {valeur}
            </Text>
        </View>
    );
}

function Bouton({ theme, libelle, onPress, occupe }: { theme: AppThemeType; libelle: string; onPress: () => void; occupe: boolean }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={occupe}
            style={{ flex: 1, backgroundColor: theme.greyBackground, borderRadius: tokens.radius.md, paddingVertical: tokens.space.sm, alignItems: 'center', opacity: occupe ? 0.5 : 1 }}
        >
            <Text style={{ color: theme.accent ?? theme.primary, fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.bold }}>{libelle}</Text>
        </TouchableOpacity>
    );
}

function decrireEnvoi(envoi: DernierEnvoi | null): string {
    if (envoi === null) return 'aucun depuis le démarrage';
    const quand = moment(envoi.at).format('HH:mm:ss');
    if (envoi.etat === 'envoye') return `${quand} · envoyé · ${envoi.comptes} comptés, ${envoi.rejetes} rejetés`;
    return `${quand} · ${envoi.etat}${envoi.raison === undefined ? '' : ` · ${envoi.raison}`}`;
}

export default function ModMenuMesure({ theme }: ModMenuMesureProps) {
    const [etat, setEtat] = useState<EtatDeLaMesure>(etatDeLaMesure);
    const [occupe, setOccupe] = useState(false);

    const relire = useCallback(() => setEtat(etatDeLaMesure()), []);

    useEffect(() => {
        const abonnement = DeviceEventEmitter.addListener(EVENEMENT_MESURE, relire);
        return () => abonnement.remove();
    }, [relire]);

    const envoyer = useCallback(() => {
        setOccupe(true);
        void envoyerLesMesures().finally(() => {
            setOccupe(false);
            relire();
        });
    }, [relire]);

    const vider = useCallback(() => {
        setOccupe(true);
        void viderLaFile().finally(() => {
            setOccupe(false);
            relire();
        });
    }, [relire]);

    return (
        <View style={{ marginTop: tokens.space.sm, paddingTop: tokens.space.xs, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xxs }}>Mesure anonyme (7-D)</Text>
            <Ligne theme={theme} cle="interrupteur" valeur={etat.active ? 'actif' : 'coupé'} ton={etat.active ? theme.success : theme.warning} />
            <Ligne theme={theme} cle="file" valeur={`${etat.lignes} lignes · ${etat.total} comptés`} />
            <Ligne theme={theme} cle="dernier envoi" valeur={decrireEnvoi(etat.dernierEnvoi)} />
            <View style={{ flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm }}>
                <Bouton theme={theme} libelle="Envoyer" onPress={envoyer} occupe={occupe} />
                <Bouton theme={theme} libelle="Vider" onPress={vider} occupe={occupe} />
            </View>
        </View>
    );
}

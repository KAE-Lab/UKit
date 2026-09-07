/**
 * Le bloc de sonde de l'entretien, dans l'onglet Temps du menu de developpement.
 *
 * Il existe parce que « la synchronisation automatique ne part jamais » a plusieurs causes qui ne se
 * distinguent pas a l'ecran : la tache jamais enregistree, refusee par le systeme, enregistree mais
 * jamais reveillee, ou reveillee et echouee en silence. Sans ce bloc, on corrige a l'aveugle — et la
 * mesure de 24 heures du jalon 6.1.x-B n'aurait rien a lire.
 *
 * Il montre l'etat de la tache aupres du systeme, la derniere tentative de synchronisation telle que
 * la ligne d'etat des reglages la lit, le dernier bilan de l'entretien, et deux gestes : jouer
 * l'entretien tout de suite, et faire reveiller la tache par le systeme (developpement seulement).
 *
 * Un bloc et non un sixieme onglet : la barre d'onglets du menu n'a pas la place (MENU_WIDTH).
 * Les libelles sont en dur, comme le reste du menu (docs/qualite.md).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Text, TouchableOpacity, View } from 'react-native';
import moment from 'moment';

import { SettingsManager } from '../services/AppCore';
import {
    EVENEMENT_ENTRETIEN,
    declencherLaTacheDeFond,
    dernierEntretien,
    etatDeLaTacheDeFond,
    jouerEntretien,
    oublierLEcheance,
    type BilanEntretien,
    type EtatTacheDeFond,
} from '../services/entretien';
import { tokens, type AppThemeType } from '../theme/Theme';

export interface ModMenuEntretienProps {
    readonly theme: AppThemeType;
}

function Ligne({ theme, cle, valeur, ton }: { theme: AppThemeType; cle: string; valeur: string; ton?: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.space.xxs }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs }}>{cle}</Text>
            <Text style={{ color: ton ?? theme.font, fontSize: tokens.fontSize.xs, fontWeight: 'bold', flexShrink: 1, textAlign: 'right' }}>
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
            style={{ backgroundColor: theme.greyBackground, borderRadius: tokens.radius.md, paddingVertical: tokens.space.sm, alignItems: 'center', marginTop: tokens.space.xs, opacity: occupe ? 0.5 : 1 }}
        >
            <Text style={{ color: theme.accent ?? theme.primary, fontSize: tokens.fontSize.xs, fontWeight: 'bold' }}>{libelle}</Text>
        </TouchableOpacity>
    );
}

function decrireBilan(bilan: BilanEntretien | null): string {
    if (bilan === null) return '—';
    return `${bilan.origine} · synchro ${bilan.synchro} · rappels ${bilan.rappels} · ${moment(bilan.at).format('HH:mm:ss')}`;
}

export default function ModMenuEntretien({ theme }: ModMenuEntretienProps) {
    const [tache, setTache] = useState<EtatTacheDeFond | null>(null);
    const [bilan, setBilan] = useState<BilanEntretien | null>(dernierEntretien());
    const [occupe, setOccupe] = useState(false);
    // Un compteur de rendus : la tentative vit dans le manager, ce bloc ne fait que la relire.
    const [, setRevision] = useState(0);

    const relire = useCallback(() => {
        void etatDeLaTacheDeFond().then(setTache);
        setRevision((revision) => revision + 1);
    }, []);

    useEffect(() => {
        relire();
        const abonnement = DeviceEventEmitter.addListener(EVENEMENT_ENTRETIEN, (nouveau: BilanEntretien) => {
            setBilan(nouveau);
            relire();
        });
        const surTentative = () => relire();
        SettingsManager.on('synchroCalendrier', surTentative);
        return () => {
            abonnement.remove();
            SettingsManager.unsubscribe('synchroCalendrier', surTentative);
        };
    }, [relire]);

    const jouer = useCallback(() => {
        setOccupe(true);
        void jouerEntretien('sonde').finally(() => setOccupe(false));
    }, []);

    const oublier = useCallback(() => {
        setOccupe(true);
        void oublierLEcheance().finally(() => setOccupe(false));
    }, []);

    const reveiller = useCallback(() => {
        setOccupe(true);
        void declencherLaTacheDeFond().finally(() => setOccupe(false));
    }, []);

    const tentative = SettingsManager.getDerniereTentativeSynchro();

    return (
        <View style={{ marginTop: tokens.space.md, paddingTop: tokens.space.sm, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xxs }}>Entretien (synchro + rappels)</Text>
            <Ligne
                theme={theme}
                cle="tâche système"
                valeur={tache === null ? '…' : tache.statut === 'expo-go' ? 'indisponible sous Expo Go (build requis)' : tache.statut}
                ton={tache?.statut === 'disponible' ? theme.success : theme.warning}
            />
            <Ligne theme={theme} cle="enregistrée" valeur={tache === null ? '…' : String(tache.enregistree)} ton={tache?.enregistree ? theme.success : theme.warning} />
            <Ligne theme={theme} cle="synchro active" valeur={String(SettingsManager.getCalendarSyncEnabled())} />
            <Ligne
                theme={theme}
                cle="dernière tentative"
                valeur={tentative === null ? '—' : `${tentative.origine} · ${tentative.ok ? 'ok' : 'échec'} · ${moment(tentative.at).format('DD/MM HH:mm')}`}
                ton={tentative === null ? undefined : tentative.ok ? theme.success : theme.warning}
            />
            <Ligne theme={theme} cle="dernier bilan" valeur={decrireBilan(bilan)} />
            <Bouton theme={theme} libelle="Jouer l’entretien maintenant" onPress={jouer} occupe={occupe} />
            <Bouton theme={theme} libelle="Oublier l’échéance (dû au prochain lancement)" onPress={oublier} occupe={occupe} />
            <Bouton theme={theme} libelle="Réveiller la tâche (dev)" onPress={reveiller} occupe={occupe} />
            <Bouton theme={theme} libelle="Relire" onPress={relire} occupe={occupe} />
        </View>
    );
}

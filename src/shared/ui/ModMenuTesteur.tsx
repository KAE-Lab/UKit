/**
 * Le panneau Testeur du menu de developpement : l'identifiant de cet appareil, et ce que les
 * messages de service en font.
 *
 * C'est le seul endroit ou l'identifiant d'installation s'affiche — pour que son proprietaire le
 * recopie dans la console et devienne testeur. Le geste d'ouverture est celui du menu, sept touchers
 * sur la version : il etait deja pris, et un second geste cache aurait ete un geste de plus a
 * retenir (docs/phase-6/6-1-b-pilotage-a-distance.md, ecarts).
 *
 * Il porte aussi les deux gestes qui rendent le canal verifiable sans relancer l'application :
 * relire les messages, et oublier ceux qu'on a vus. Sans eux, chaque cas du plan de test coute un
 * redemarrage.
 *
 * Les libelles sont en dur, comme le reste du menu : il n'est pas une capacite utilisateur et ne
 * passe pas par les dictionnaires (docs/qualite.md).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { dernierRapportMessages, messagesConnus, oublierVus, rafraichirMessages, vusConnus } from '../messages';
import { estTesteur, identifiantInstallation, rafraichirStatutTesteur } from '../testeur';
import { deposerLeJeton, etatDuPush, retirerLeJeton, type EtatDepot, type MemoireDeDepot } from '../push';
import { tokens, type AppThemeType } from '../theme/Theme';

export interface ModMenuTesteurProps {
    readonly theme: AppThemeType;
}

function Ligne({ theme, cle, valeur, ton }: {
    theme: AppThemeType;
    cle: string;
    valeur: string;
    ton?: string;
}) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.space.xxs }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs }}>{cle}</Text>
            <Text
                selectable
                style={{ color: ton ?? theme.font, fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.bold, flexShrink: 1, textAlign: 'right' }}
            >
                {valeur}
            </Text>
        </View>
    );
}

function Bouton({ theme, libelle, onPress }: { theme: AppThemeType; libelle: string; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                flex: 1,
                backgroundColor: theme.greyBackground,
                borderRadius: tokens.radius.md,
                paddingVertical: tokens.space.sm,
                alignItems: 'center',
            }}
        >
            <Text style={{ color: theme.accent ?? theme.primary, fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.bold }}>
                {libelle}
            </Text>
        </TouchableOpacity>
    );
}

function rapportEnClair(): string {
    const rapport = dernierRapportMessages();
    if (rapport === null) return 'aucune lecture depuis le démarrage';
    return rapport.ok
        ? `${rapport.messages} en ligne à ${rapport.quand}`
        : `échec à ${rapport.quand} : ${rapport.reason ?? 'sans détail'}`;
}

export default function ModMenuTesteur({ theme }: ModMenuTesteurProps) {
    const [identifiant, setIdentifiant] = useState<string>('…');
    const [copie, setCopie] = useState(false);
    const [push, setPush] = useState<{ etat: EtatDepot | null; memoire: MemoireDeDepot | null }>({ etat: null, memoire: null });
    const [, setRevision] = useState(0);

    const relire = useCallback(() => {
        void etatDuPush().then(setPush);
        setRevision((revision) => revision + 1);
    }, []);

    useEffect(() => {
        void identifiantInstallation().then(setIdentifiant);
        void etatDuPush().then(setPush);
    }, []);

    const deposer = useCallback(() => { void deposerLeJeton().then(relire); }, [relire]);
    const retirer = useCallback(() => { void retirerLeJeton().then(relire); }, [relire]);

    const copier = useCallback(() => {
        void Clipboard.setStringAsync(identifiant).then(() => setCopie(true));
    }, [identifiant]);

    const verifier = useCallback(() => {
        void rafraichirStatutTesteur().then(relire);
    }, [relire]);

    const relireLesMessages = useCallback(() => {
        void rafraichirMessages().then(relire);
    }, [relire]);

    const oublier = useCallback(() => {
        // Oublier puis relire : la relecture previent l'hote, qui rejoue la presentation.
        void oublierVus().then(rafraichirMessages).then(relire);
    }, [relire]);

    const testeur = estTesteur();

    return (
        <View>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xs }}>
                L’identifiant de cet appareil, à recopier dans la console pour en faire un testeur. Il
                ne quitte jamais l’appareil : l’application lit la liste et compare chez elle.
            </Text>

            <Ligne theme={theme} cle="identifiant" valeur={identifiant} />
            <Ligne
                theme={theme}
                cle="statut"
                valeur={testeur ? 'testeur' : 'non enregistré'}
                ton={testeur ? theme.success : theme.warning}
            />

            <View style={{ flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm }}>
                <Bouton theme={theme} libelle={copie ? 'Copié' : 'Copier'} onPress={copier} />
                <Bouton theme={theme} libelle="Vérifier" onPress={verifier} />
            </View>

            <View style={{ marginTop: tokens.space.sm, paddingTop: tokens.space.xs, borderTopWidth: 1, borderTopColor: theme.border }}>
                <Ligne theme={theme} cle="messages connus" valeur={String(messagesConnus().length)} />
                <Ligne theme={theme} cle="dernière lecture" valeur={rapportEnClair()} />
                <Ligne theme={theme} cle="déjà vus" valeur={String(vusConnus().size)} />
            </View>

            <View style={{ flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm }}>
                <Bouton theme={theme} libelle="Relire les messages" onPress={relireLesMessages} />
                <Bouton theme={theme} libelle="Oublier les vus" onPress={oublier} />
            </View>

            {/* Le jeton push (6.1.x-E) : ce que la base sait de cet appareil, et le dernier depot. */}
            <View style={{ marginTop: tokens.space.sm, paddingTop: tokens.space.xs, borderTopWidth: 1, borderTopColor: theme.border }}>
                <Ligne theme={theme} cle="push" valeur={push.etat ?? 'pas encore joué'} />
                <Ligne theme={theme} cle="jeton" valeur={push.memoire === null ? 'aucun déposé' : push.memoire.inscription.jeton.slice(18, 30) + '…'} />
                <Ligne
                    theme={theme}
                    cle="déposé"
                    valeur={push.memoire === null ? '—' : `${new Date(push.memoire.at).toLocaleString()} · ${push.memoire.inscription.etablissement} · ${push.memoire.inscription.version} · ${push.memoire.inscription.plateforme}${push.memoire.inscription.testeur ? ' · testeur' : ''}`}
                />
            </View>

            <View style={{ flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm }}>
                <Bouton theme={theme} libelle="Déposer le jeton" onPress={deposer} />
                <Bouton theme={theme} libelle="Retirer le jeton" onPress={retirer} />
            </View>
        </View>
    );
}

/**
 * Le bloc Communaute du menu de developpement (phase 8, lot 1), au bas de l'onglet Testeur : ce que
 * l'appareil sait attester, et les deux gestes qui rendent le chemin d'ecriture verifiable sans aucun
 * ecran — un envoi d'essai, qui joue le defi, la preuve, l'appareil et ses plafonds sans rien publier,
 * et la lecture des signalements du jour. C'est par lui que le banc juge le chemin degrade et que le
 * protocole sur telephone juge le chemin atteste (docs/phase-8/1-base-communautaire.md).
 *
 * Un bloc et non un onglet, comme la mesure (ModMenuMesure) ; les libelles sont en dur, comme le reste
 * du menu (docs/qualite.md).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import moment from 'moment';

import { capacites, envoyerUneContribution, lireLesSignalementsDuJour, type ResultatDeContribution } from '../communaute';
import { tokens, type AppThemeType } from '../theme/Theme';

export interface ModMenuCommunauteProps {
    readonly theme: AppThemeType;
}

/** Une contribution d'essai : `essai` la fait juger sans l'ecrire, le sujet n'a pas a exister. */
const ESSAI = { sujet: 'essai.essai', cible: 'essai', valeur: 'essai' } as const;

type Capacites = Awaited<ReturnType<typeof capacites>>;

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

function decrireResultat(resultat: ResultatDeContribution): string {
    switch (resultat.etat) {
        case 'essai':
        case 'acceptee':
            return `${resultat.etat} · ${resultat.atteste ? 'attesté' : 'non attesté'} · poids ${resultat.poids}`;
        case 'sans-base':
            return 'sans base';
        default:
            return `${resultat.etat} · ${resultat.raison}`;
    }
}

function decrireCapacites(c: Capacites | null): string {
    if (c === null) return '…';
    if (c.appAttest) return `App Attest${c.enregistree ? ' · clé enregistrée' : ' · clé à enregistrer'}`;
    if (c.playIntegrity) return 'Play Integrity';
    return 'aucune : contributions non attestées';
}

export default function ModMenuCommunaute({ theme }: ModMenuCommunauteProps) {
    const [attestation, setAttestation] = useState<Capacites | null>(null);
    const [essai, setEssai] = useState<string>('aucun depuis le démarrage');
    const [lecture, setLecture] = useState<string>('aucune depuis le démarrage');
    const [occupe, setOccupe] = useState(false);

    const relire = useCallback(() => {
        void capacites().then(setAttestation, () => setAttestation(null));
    }, []);

    useEffect(relire, [relire]);

    const envoyer = useCallback(() => {
        setOccupe(true);
        void envoyerUneContribution(ESSAI, { essai: true })
            .then((resultat) => setEssai(`${moment().format('HH:mm:ss')} · ${decrireResultat(resultat)}`))
            .finally(() => {
                setOccupe(false);
                relire();
            });
    }, [relire]);

    const lire = useCallback(() => {
        setOccupe(true);
        void lireLesSignalementsDuJour()
            .then((r) => setLecture(`${moment().format('HH:mm:ss')} · ${r.etat} · ${r.signalements.length} signalements`))
            .finally(() => setOccupe(false));
    }, []);

    return (
        <View style={{ marginTop: tokens.space.sm, paddingTop: tokens.space.xs, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xxs }}>Communauté (7.0, lot 1)</Text>
            <Ligne theme={theme} cle="attestation" valeur={decrireCapacites(attestation)} ton={attestation?.appAttest || attestation?.playIntegrity ? theme.success : theme.warning} />
            <Ligne theme={theme} cle="essai" valeur={essai} />
            <Ligne theme={theme} cle="lecture du jour" valeur={lecture} />
            <View style={{ flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm }}>
                <Bouton theme={theme} libelle="Essai d’envoi" onPress={envoyer} occupe={occupe} />
                <Bouton theme={theme} libelle="Lire le jour" onPress={lire} occupe={occupe} />
            </View>
        </View>
    );
}

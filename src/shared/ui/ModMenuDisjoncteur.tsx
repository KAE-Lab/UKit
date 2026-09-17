/**
 * Le bloc du disjoncteur, dans l'onglet Temps du menu de developpement.
 *
 * Il existe pour la meme raison que le bloc Entretien : « la source ne repond plus » et « le
 * disjoncteur a coupe » se ressemblent a l'ecran, et le second est voulu. Le bloc montre chaque hote
 * connu du disjoncteur — ses echecs `unavailable` consecutifs, son palier, l'heure de fin de son
 * refroidissement — et deux gestes : rearmer, et relire. Le protocole du jalon 7-C s'y lit :
 * HORS LIGNE, trois retours au premier plan, l'hote passe « ouvert » ; un geste reussi le referme.
 *
 * Un bloc et non un sixieme onglet : la barre d'onglets du menu n'a pas la place (MENU_WIDTH).
 * Les libelles sont en dur, comme le reste du menu (docs/qualite.md).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import moment from 'moment';

import { etatDesHotes, onEchecDeRun, rearmer, refroidissementLisible, type EtatHote } from '../aetherius';
import { tokens, type AppThemeType } from '../theme/Theme';

export interface ModMenuDisjoncteurProps {
    readonly theme: AppThemeType;
}

/** Relu chaque seconde tant qu'un hote est ouvert : le compte a rebours doit se voir tomber. */
const TIC_MS = 1000;

function decrire(etat: EtatHote, maintenant: number): { texte: string; ouvert: boolean } {
    if (etat.ouvertJusqua === null) return { texte: `${etat.echecs} échec(s), fermé`, ouvert: false };
    const ouvert = maintenant < etat.ouvertJusqua;
    const jusqua = moment(etat.ouvertJusqua).format('HH:mm:ss');
    return {
        texte: ouvert
            ? `${etat.echecs} échec(s), ouvert jusqu’à ${jusqua} (${refroidissementLisible(etat.palier)})`
            : `${etat.echecs} échec(s), refroidi depuis ${jusqua} : le prochain run part`,
        ouvert,
    };
}

function Bouton({ theme, libelle, onPress }: { theme: AppThemeType; libelle: string; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{ backgroundColor: theme.greyBackground, borderRadius: tokens.radius.md, paddingVertical: tokens.space.sm, alignItems: 'center', marginTop: tokens.space.xs }}
        >
            <Text style={{ color: theme.accent ?? theme.primary, fontSize: tokens.fontSize.xs, fontWeight: 'bold' }}>{libelle}</Text>
        </TouchableOpacity>
    );
}

export default function ModMenuDisjoncteur({ theme }: ModMenuDisjoncteurProps) {
    const [hotes, setHotes] = useState<readonly EtatHote[]>(etatDesHotes());
    const [maintenant, setMaintenant] = useState(Date.now());

    const relire = useCallback(() => {
        setHotes(etatDesHotes());
        setMaintenant(Date.now());
    }, []);

    useEffect(() => onEchecDeRun(relire), [relire]);

    useEffect(() => {
        if (!hotes.some((etat) => etat.ouvertJusqua !== null && maintenant < etat.ouvertJusqua)) return undefined;
        const tic = setInterval(relire, TIC_MS);
        return () => clearInterval(tic);
    }, [hotes, maintenant, relire]);

    const rearmerTout = useCallback(() => {
        rearmer();
        relire();
    }, [relire]);

    return (
        <View style={{ marginTop: tokens.space.md, paddingTop: tokens.space.sm, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xxs }}>Disjoncteur (sources, Act I)</Text>
            {hotes.length === 0 ? (
                <Text style={{ color: theme.font, fontSize: tokens.fontSize.xs, paddingVertical: tokens.space.xxs }}>aucun échec en cours</Text>
            ) : (
                hotes.map((etat) => {
                    const { texte, ouvert } = decrire(etat, maintenant);
                    return (
                        <View key={etat.hote} style={{ paddingVertical: tokens.space.xxs }}>
                            <Text style={{ color: ouvert ? theme.warning : theme.font, fontSize: tokens.fontSize.xs, fontWeight: 'bold' }} numberOfLines={1}>
                                {etat.hote}
                            </Text>
                            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs }}>{texte}</Text>
                        </View>
                    );
                })
            )}
            <Bouton theme={theme} libelle="Réarmer" onPress={rearmerTout} />
            <Bouton theme={theme} libelle="Relire" onPress={relire} />
        </View>
    );
}

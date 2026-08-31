/**
 * Le panneau de sonde de la biometrie, dans le menu de developpement.
 *
 * Il existe parce que le symptome — « l'iPhone demande le code sans tenter Face ID » — a plusieurs
 * causes qui ne se distinguent **pas** a l'ecran et qui n'ont pas le meme remede : Face ID refuse a
 * l'application, aucun visage enrole, verrouillage apres trop d'echecs, ou simplement iOS qui
 * court-circuite parce que la politique le lui permet. Sans ce panneau, on corrige a l'aveugle.
 *
 * Il montre deux choses. Les **capacites**, qui ne demandent rien a personne et repondent deja a la
 * moitie des questions. Et le resultat **brut** d'une demande, jouable par les deux politiques cote
 * a cote : celle d'avant le correctif et celle des deux temps. C'est cette comparaison qui tranche,
 * et la faire en une session vaut mieux que mesurer, corriger, puis remesurer.
 *
 * Les libelles sont en dur, comme le reste du menu de developpement : il n'est pas une capacite
 * utilisateur et ne passe pas par les dictionnaires (docs/qualite.md).
 *
 * Voir docs/features/scolarite.md.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

import {
    capacites,
    demander,
    demanderPolitiqueHistorique,
    type CapacitesBiometrie,
    type ResultatBiometrie,
} from '../biometrie';
import { tokens, type AppThemeType } from '../theme/Theme';

export interface ModMenuBiometrieProps {
    readonly theme: AppThemeType;
}

/** Une ligne de diagnostic : un libelle a gauche, une valeur a droite. */
function Ligne({ theme, cle, valeur, ton }: {
    theme: AppThemeType;
    cle: string;
    valeur: string;
    ton?: string;
}) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.space.xxs }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs }}>{cle}</Text>
            <Text style={{ color: ton ?? theme.font, fontSize: tokens.fontSize.xs, fontWeight: 'bold', flexShrink: 1, textAlign: 'right' }}>
                {valeur}
            </Text>
        </View>
    );
}

function Bouton({ theme, libelle, onPress, occupe }: {
    theme: AppThemeType;
    libelle: string;
    onPress: () => void;
    occupe: boolean;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={occupe}
            style={{
                backgroundColor: theme.greyBackground,
                borderRadius: tokens.radius.md,
                paddingVertical: tokens.space.sm,
                alignItems: 'center',
                marginTop: tokens.space.xs,
                opacity: occupe ? 0.5 : 1,
            }}
        >
            <Text style={{ color: theme.accent ?? theme.primary, fontSize: tokens.fontSize.xs, fontWeight: 'bold' }}>
                {libelle}
            </Text>
        </TouchableOpacity>
    );
}

/** Le verdict d'une demande, brut : c'est le champ `error` qui designe la cause, lui seul. */
function Verdict({ theme, titre, resultat }: {
    theme: AppThemeType;
    titre: string;
    resultat: ResultatBiometrie;
}) {
    return (
        <View style={{ marginTop: tokens.space.sm, paddingTop: tokens.space.xs, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xxs }}>{titre}</Text>
            <Ligne
                theme={theme}
                cle="success"
                valeur={String(resultat.success)}
                ton={resultat.success ? theme.success : theme.danger}
            />
            {/*
              * La ligne qui repond a la question posee. Un succes par le code ne dit rien de la
              * biometrie ; ces deux lignes disent si elle a ete tentee, et pourquoi elle n'a pas
              * suffi — y compris quand tout a fini par reussir.
              */}
            <Ligne
                theme={theme}
                cle="biometrie"
                valeur={resultat.biometrie}
                ton={resultat.biometrie === 'reussie' ? theme.success : theme.warning}
            />
            <Ligne theme={theme} cle="cause biometrie" valeur={resultat.erreurBiometrie ?? '—'} />
            <Ligne theme={theme} cle="error" valeur={resultat.error ?? '—'} />
            <Ligne theme={theme} cle="warning" valeur={resultat.warning ?? '—'} />
            <Ligne theme={theme} cle="porte" valeur={resultat.etape} />
        </View>
    );
}

export default function ModMenuBiometrie({ theme }: ModMenuBiometrieProps) {
    const [etat, setEtat] = useState<CapacitesBiometrie | null>(null);
    const [deuxTemps, setDeuxTemps] = useState<ResultatBiometrie | null>(null);
    const [historique, setHistorique] = useState<ResultatBiometrie | null>(null);
    const [occupe, setOccupe] = useState(false);

    const relire = useCallback(() => {
        void capacites().then(setEtat);
    }, []);

    useEffect(relire, [relire]);

    const jouer = useCallback((quoi: 'deux-temps' | 'historique') => {
        setOccupe(true);
        const demande = quoi === 'deux-temps' ? demander() : demanderPolitiqueHistorique();
        void demande
            .then((resultat) => (quoi === 'deux-temps' ? setDeuxTemps(resultat) : setHistorique(resultat)))
            .finally(() => setOccupe(false));
    }, []);

    return (
        <View>
            <Ligne theme={theme} cle="plateforme" valeur={`${Platform.OS} ${String(Platform.Version)}`} />
            <Ligne theme={theme} cle="materiel" valeur={etat === null ? '…' : String(etat.materiel)} />
            <Ligne theme={theme} cle="enrole" valeur={etat === null ? '…' : String(etat.enrole)} />
            <Ligne theme={theme} cle="modalites" valeur={etat === null ? '…' : (etat.modalites.join(', ') || 'aucune')} />
            <Ligne theme={theme} cle="niveau" valeur={etat === null ? '…' : etat.niveau} />

            <Bouton theme={theme} libelle="Demander — deux temps" onPress={() => jouer('deux-temps')} occupe={occupe} />
            <Bouton theme={theme} libelle="Demander — politique d'avant" onPress={() => jouer('historique')} occupe={occupe} />
            <Bouton theme={theme} libelle="Relire les capacites" onPress={relire} occupe={occupe} />

            {deuxTemps !== null && <Verdict theme={theme} titre="Deux temps (correctif)" resultat={deuxTemps} />}
            {historique !== null && <Verdict theme={theme} titre="Politique d'avant" resultat={historique} />}
        </View>
    );
}

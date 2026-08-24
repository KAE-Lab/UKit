/**
 * Le panneau de sonde des propositions du dossier, dans le menu de developpement.
 *
 * Il existe pour la meme raison que celui de la biometrie : **l'absence de dialogue n'est pas un
 * symptome.** Quatre situations la produisent et ne se distinguent pas a l'ecran — l'annuaire n'a
 * rien rendu, l'etudiant suit toutes les UE de son planning, le planning n'est pas encore charge, ou
 * la proposition a deja ete appliquee. Sans ce panneau, on corrige a l'aveugle, et la campagne
 * biometrique a deja montre ce que ca coute.
 *
 * Il lit la trace posee par la modale a **chaque** calcul de decision, pas seulement quand elle
 * s'affiche : c'est justement le cas « rien » qu'il faut pouvoir expliquer.
 *
 * Les libelles sont en dur, comme le reste du menu : il n'est pas une capacite utilisateur et ne
 * passe pas par les dictionnaires (docs/qualite.md).
 *
 * Voir docs/features/scolarite.md.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import {
    derniereLectureDossier,
    dernierePropositionsTrace,
    type TraceLecture,
    type TracePropositions,
} from '../services/PropositionsTrace';
import { SettingsManager } from '../services/AppCore';
import { PlanningDataManager } from '../../features/Planning/services/PlanningDataManager';
import { edtPersonnelActif } from '../etablissements';
import { tokens, type AppThemeType } from '../theme/Theme';

export interface ModMenuPropositionsProps {
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
            <Text style={{ color: ton ?? theme.font, fontSize: tokens.fontSize.xs, fontWeight: 'bold', flexShrink: 1, textAlign: 'right' }}>
                {valeur}
            </Text>
        </View>
    );
}

/** Ce que dit une decision, en une phrase — c'est la ligne qu'on vient lire. */
function explication(trace: TracePropositions): string {
    if (trace.decision === 'demander') return 'le dialogue doit etre affiche';
    if (trace.decision === 'attendre') return 'le planning n a pas encore livre ses UE';
    if (trace.uesInscrites.length === 0 && trace.edtLu === null) return 'le dossier n a rien rendu a proposer';
    return 'rien a proposer : tout est deja suivi, filtre ou accepte';
}

export default function ModMenuPropositions({ theme }: ModMenuPropositionsProps) {
    const [lecture, setLecture] = useState<TraceLecture | null>(derniereLectureDossier());
    const [trace, setTrace] = useState<TracePropositions | null>(dernierePropositionsTrace());
    const [ues, setUes] = useState<number>(PlanningDataManager.getAvailableUEs().length);

    const relire = useCallback(() => {
        setLecture(derniereLectureDossier());
        setTrace(dernierePropositionsTrace());
        setUes(PlanningDataManager.getAvailableUEs().length);
    }, []);

    useEffect(relire, [relire]);

    const personnel = edtPersonnelActif();

    return (
        <View>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xs }}>
                Ce que la derniere lecture du dossier a propose. Vide tant qu aucun parcours froid n a
                eu lieu depuis le demarrage : « Actualiser le dossier » en rejoue un.
            </Text>

            <Ligne theme={theme} cle="UE du planning (maintenant)" valeur={String(ues)} />
            <Ligne theme={theme} cle="filtres poses" valeur={String(SettingsManager.getFilters().length)} />
            <Ligne
                theme={theme}
                cle="edt personnel enregistre"
                valeur={personnel === null ? '—' : `${personnel.nom} (${personnel.ressource})`}
            />

            {/*
              * Le run d'abord, la decision ensuite. Les deux blocs repondent a deux questions qui
              * n'ont pas le meme remede : « le dossier a-t-il rendu quelque chose ? » et « qu'en
              * a-t-on fait ? ». Un seul bloc les confondrait.
              */}
            {lecture === null ? (
                <Text style={{ color: theme.warning, fontSize: tokens.fontSize.xs, marginTop: tokens.space.sm }}>
                    1. aucun parcours froid depuis le demarrage — « Actualiser le dossier » en rejoue un
                </Text>
            ) : (
                <View style={{ marginTop: tokens.space.sm, paddingTop: tokens.space.xs, borderTopWidth: 1, borderTopColor: theme.border }}>
                    <Ligne theme={theme} cle="1. dossier lu a" valeur={lecture.heure} />
                    <Ligne theme={theme} cle="blueprint" valeur={lecture.blueprint} />
                    {lecture.sorties.map((sortie) => (
                        <Text key={sortie} style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs }}>
                            {sortie}
                        </Text>
                    ))}
                </View>
            )}

            {trace === null ? (
                <Text style={{ color: theme.warning, fontSize: tokens.fontSize.xs, marginTop: tokens.space.sm }}>
                    2. aucune decision calculee — les propositions n ont pas atteint l ecran
                </Text>
            ) : (
                <View style={{ marginTop: tokens.space.sm, paddingTop: tokens.space.xs, borderTopWidth: 1, borderTopColor: theme.border }}>
                    <Ligne theme={theme} cle="2. decidee a" valeur={trace.heure} />
                    <Ligne
                        theme={theme}
                        cle="UE inscrites lues"
                        valeur={String(trace.uesInscrites.length)}
                        ton={trace.uesInscrites.length === 0 ? theme.warning : theme.success}
                    />
                    <Ligne theme={theme} cle="edt lu" valeur={trace.edtLu ?? '—'} />
                    <Ligne
                        theme={theme}
                        cle="decision"
                        valeur={trace.decision}
                        ton={trace.decision === 'demander' ? theme.success : theme.warning}
                    />
                    <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: tokens.space.xxs }}>
                        {explication(trace)}
                    </Text>
                    <Ligne theme={theme} cle="UE a masquer" valeur={String(trace.complement.length)} />
                    {trace.complement.length > 0 ? (
                        <Text style={{ color: theme.font, fontSize: tokens.fontSize.xs }}>
                            {trace.complement.join(', ')}
                        </Text>
                    ) : null}
                    {trace.uesInscrites.length > 0 ? (
                        <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: tokens.space.xxs }}>
                            inscrites : {trace.uesInscrites.join(', ')}
                        </Text>
                    ) : null}
                </View>
            )}

            <TouchableOpacity
                onPress={relire}
                style={{
                    backgroundColor: theme.greyBackground,
                    borderRadius: tokens.radius.md,
                    paddingVertical: tokens.space.sm,
                    alignItems: 'center',
                    marginTop: tokens.space.sm,
                }}
            >
                <Text style={{ color: theme.accent ?? theme.primary, fontSize: tokens.fontSize.xs, fontWeight: 'bold' }}>
                    Relire
                </Text>
            </TouchableOpacity>
        </View>
    );
}

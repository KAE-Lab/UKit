/**
 * Le panneau de diagnostic de la livraison, dans le menu de developpement.
 *
 * Ce n'est pas du confort. Quand une correction publiee « n'arrive pas », les causes possibles sont
 * nombreuses et se ressemblent toutes vues de l'ecran principal : version pas strictement
 * superieure, empreinte fausse, entree desactivee, `min_engine` trop haut, document refuse a la
 * validation, ou simplement pas encore rafraichi. Ce panneau repond en trois secondes a une question
 * qui, sans lui, coute une soiree.
 *
 * Il dit trois choses par Blueprint — nom, version, origine — plus le rapport du dernier
 * rafraichissement, et porte les deux gestes de retour arriere cote application.
 *
 * Les libelles y sont en dur, comme le reste du menu de developpement : il n'est pas une capacite
 * utilisateur et ne passe pas par les dictionnaires (docs/qualite.md).
 *
 * Voir docs/blueprints.md et docs/phase-6/6-c-livraison.md.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import {
    describeDelivery,
    dureeLisible,
    lastRefreshReport,
    refreshBlueprints,
    revertBlueprints,
    runBlueprint,
    type BlueprintLine,
    type RunnableBlueprintName,
    type RefreshReport,
} from '../aetherius';
import { tokens, type AppThemeType } from '../theme/Theme';


export interface ModMenuBlueprintsProps {
    readonly theme: AppThemeType;
}

/** Ce que le dernier rapport dit d'une entree : la raison, quand il y en a une. */
function raisonDe(report: RefreshReport | null, name: string): string | null {
    const entry = report?.entries.find((candidate) => candidate.name === name);
    if (entry === undefined || entry.reason === undefined) return null;
    return `${entry.outcome} : ${entry.reason}`;
}

export default function ModMenuBlueprints({ theme }: ModMenuBlueprintsProps) {
    const [lines, setLines] = useState<readonly BlueprintLine[]>([]);
    const [report, setReport] = useState<RefreshReport | null>(lastRefreshReport());
    const [busy, setBusy] = useState(false);
    const [runs, setRuns] = useState<Record<string, string>>({});

    const relire = useCallback(async () => {
        setLines(await describeDelivery());
        setReport(lastRefreshReport());
    }, []);

    useEffect(() => {
        void relire();
    }, [relire]);

    const rafraichir = useCallback(async () => {
        setBusy(true);
        setReport(await refreshBlueprints());
        setLines(await describeDelivery());
        setBusy(false);
    }, []);

    const revenir = useCallback(async () => {
        setBusy(true);
        await revertBlueprints();
        await relire();
        setRuns({});
        setBusy(false);
    }, [relire]);

    /**
     * Jouer un Blueprint depuis le panneau, et dire combien de temps il a pris.
     *
     * C'est ce qui rend le parcours de correction verifiable de bout en bout : voir une ligne passer
     * a « distant » prouve que le document publie est en place, le jouer prouve qu'il s'execute.
     *
     * La duree est la depuis le jalon 6.1-D : resserrer les attentes d'un portail demande de mesurer
     * un run **sur un appareil, en cellulaire**, et ce menu existe en production — le detail par step
     * part dans la console de developpement (chrono.ts), le total se lit ici sans poste.
     */
    const jouer = useCallback(async (name: RunnableBlueprintName) => {
        setRuns((etat) => ({ ...etat, [name]: 'en cours…' }));
        const run = await runBlueprint(name);
        const verdict =
            run.ok === false
                ? `échec ${run.failure.kind}`
                : `ok, ${Object.keys(run.outputs).length} sorties (${run.origin})`;
        setRuns((etat) => ({ ...etat, [name]: `${verdict} — ${dureeLisible(run.dureeMs)}` }));
    }, []);

    return (
        <View>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xs, fontWeight: 'bold' }}>
                LIVRAISON
            </Text>

            {renderRapport(theme, report, busy)}

            <ScrollView style={{ maxHeight: 240, marginBottom: tokens.space.md }} nestedScrollEnabled>
                {lines.map((line) => renderLigne(theme, line, raisonDe(report, line.name), runs[line.name], jouer))}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                    onPress={revenir}
                    disabled={busy}
                    style={{ flex: 1, backgroundColor: theme.danger, paddingVertical: tokens.space.sm, borderRadius: tokens.radius.md, marginRight: tokens.space.xs, alignItems: 'center', opacity: busy ? 0.5 : 1 }}
                >
                    <Text style={{ color: theme.lightFont, fontWeight: 'bold' }}>Embarqué</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={rafraichir}
                    disabled={busy}
                    style={{ flex: 1, backgroundColor: theme.primary, paddingVertical: tokens.space.sm, borderRadius: tokens.radius.md, marginLeft: tokens.space.xs, alignItems: 'center', opacity: busy ? 0.5 : 1 }}
                >
                    <Text style={{ color: theme.lightFont, fontWeight: 'bold' }}>Rafraîchir</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

/** L'etat du dernier rafraichissement : la question qu'on se pose en premier. */
function renderRapport(theme: AppThemeType, report: RefreshReport | null, busy: boolean) {
    const texte = busy
        ? 'rafraîchissement…'
        : report === null
          ? 'manifeste pas encore lu'
          : report.ok
            ? `manifeste lu, ${report.entries.length} entrée(s)`
            : `manifeste non lu : ${report.reason ?? 'sans détail'}`;

    return (
        <View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.sm, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: theme.border, marginBottom: tokens.space.sm }}>
            <Text style={{ color: report?.ok === false ? theme.warning : theme.fontSecondary, fontSize: tokens.fontSize.xs }}>
                {texte}
            </Text>
        </View>
    );
}

function renderLigne(
    theme: AppThemeType,
    line: BlueprintLine,
    raison: string | null,
    run: string | undefined,
    jouer: (name: RunnableBlueprintName) => void,
) {
    const distant = line.origin === 'remote';

    return (
        <View
            key={line.name}
            style={{ backgroundColor: theme.cardBackground, padding: tokens.space.sm, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: theme.border, marginBottom: tokens.space.xs }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: tokens.radius.pill, backgroundColor: distant ? theme.success : theme.fontSecondary, marginRight: tokens.space.xs }} />
                <Text style={{ color: theme.font, fontSize: tokens.fontSize.xs, flex: 1 }} numberOfLines={1}>
                    {line.name.replace('ukit.', '')}
                </Text>
                <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginLeft: tokens.space.xs }}>
                    v{line.version} {distant ? 'distant' : 'embarqué'}
                </Text>
            </View>

            {line.error !== undefined && (
                <Text style={{ color: theme.danger, fontSize: tokens.fontSize.xs, marginTop: tokens.space.xxs }}>{line.error}</Text>
            )}
            {raison !== null && (
                <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: tokens.space.xxs }}>{raison}</Text>
            )}

            {line.runnable && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: tokens.space.xs }}>
                    <TouchableOpacity
                        onPress={() => jouer(line.name)}
                        style={{ paddingVertical: tokens.space.xxs, paddingHorizontal: tokens.space.sm, borderRadius: tokens.radius.sm, borderWidth: 1, borderColor: theme.border }}
                    >
                        <Text style={{ color: theme.primary, fontSize: tokens.fontSize.xs }}>jouer</Text>
                    </TouchableOpacity>
                    {run !== undefined && (
                        <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginLeft: tokens.space.xs, flex: 1 }} numberOfLines={1}>
                            {run}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

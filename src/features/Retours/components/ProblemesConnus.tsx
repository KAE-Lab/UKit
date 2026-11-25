/**
 * Les problemes connus, avant d'envoyer un bug (lot 3) : ce que l'equipe a deja publie, chacun avec
 * « Moi aussi » — un vote par appareil — et « Ajouter un detail », qui rouvre le formulaire range sous
 * ce probleme. Un probleme corrige se lit avec sa version, sans geste.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import { direMoiAussi, type ProblemeConnu } from '../../../shared/retours/problemes';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import { GroupeDeReglages } from '../../../shared/ui/GroupeDeReglages';
import { Puce } from './Elements';

function LigneDeProbleme({ theme, probleme, vote, voter, detailler }: {
    theme: AppThemeType; probleme: ProblemeConnu; vote: boolean; voter: () => void; detailler: () => void;
}) {
    const corrige = probleme.statut === 'corrige';
    return (
        <View style={styles.ligne}>
            <Text style={[styles.titre, { color: theme.font }]}>{probleme.titre}</Text>
            {probleme.detail !== null ? <Text style={[styles.detail, { color: theme.fontSecondary }]}>{probleme.detail}</Text> : null}
            {corrige ? (
                <Text style={[styles.detail, { color: theme.success }]}>
                    {probleme.versionCorrigee !== null ? Translator.get('PROBLEME_CORRIGE', probleme.versionCorrigee) : Translator.get('PROBLEME_CORRIGE_SANS_VERSION')}
                </Text>
            ) : (
                <View style={styles.gestes}>
                    <Puce theme={theme} icone="thumb-up-outline" libelle={Translator.get(vote ? 'MOI_AUSSI_FAIT' : 'MOI_AUSSI')} onPress={voter} faite={vote} />
                    <Puce theme={theme} icone="plus" libelle={Translator.get('MOI_AUSSI_DETAIL')} onPress={detailler} />
                </View>
            )}
        </View>
    );
}

export function ProblemesConnus({ theme, problemes, votes, aVote, detailler }: {
    theme: AppThemeType;
    problemes: readonly ProblemeConnu[];
    votes: readonly string[];
    aVote: (id: string) => void;
    detailler: (probleme: ProblemeConnu) => void;
}) {
    const [enCours, setEnCours] = useState<string | null>(null);
    if (problemes.length === 0) return null;

    const voter = async (probleme: ProblemeConnu) => {
        if (enCours !== null) return;
        setEnCours(probleme.id);
        try {
            const resultat = await direMoiAussi(probleme.id);
            const compte = resultat !== null && (resultat.etat === 'acceptee' || (resultat.etat === 'refusee' && resultat.raison === 'deja_vote'));
            if (compte) aVote(probleme.id);
            new ErrorAlert(Translator.get(compte ? 'MOI_AUSSI_MERCI' : 'MOI_AUSSI_ECHEC')).show();
        } finally {
            setEnCours(null);
        }
    };

    return (
        <GroupeDeReglages theme={theme} titre={Translator.get('PROBLEMES_CONNUS')} filetCourt>
            {problemes.map((probleme) => (
                <LigneDeProbleme
                    key={probleme.id}
                    theme={theme}
                    probleme={probleme}
                    vote={votes.includes(probleme.id)}
                    voter={() => { void voter(probleme); }}
                    detailler={() => detailler(probleme)}
                />
            ))}
        </GroupeDeReglages>
    );
}

const styles = StyleSheet.create({
    ligne: {
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.md,
        gap: tokens.space.xs,
    },
    titre: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    detail: {
        fontSize: tokens.fontSize.sm,
        lineHeight: 20,
    },
    gestes: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: tokens.space.sm,
        marginTop: tokens.space.sm,
    },
});

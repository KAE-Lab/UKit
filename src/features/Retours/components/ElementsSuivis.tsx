/**
 * Ce que l'equipe a publie et que l'etudiant peut soutenir (lots 3 et 4) : les problemes connus avant
 * d'envoyer un bug, les idees avant d'en proposer une, et la boite a idees elle-meme. Chaque element
 * porte « Moi aussi » — un vote par appareil — et « Ajouter un detail », qui rouvre le formulaire range
 * sous lui ; un element qui ne se soutient plus (corrige, livre) se lit avec son etat, sans geste.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ResultatDeContribution } from '../../../shared/communaute';
import Translator, { type TranslationKey } from '../../../shared/i18n/Translator';
import { aCompte } from '../../../shared/retours/suivis';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import { GroupeDeReglages } from '../../../shared/ui/GroupeDeReglages';
import { Puce } from './Elements';

export interface ElementSuivi {
    readonly id: string;
    readonly titre: string;
    readonly detail: string | null;
    /** L'etat d'un element qu'on ne soutient plus — « Corrige dans la 7.0.1 », « Livree » —, a la place des gestes. */
    readonly fin: string | null;
    /** L'etat d'un element encore ouvert, quand il en dit plus que sa presence — « En cours ». */
    readonly etat?: string;
}

function Ligne({ theme, element, vote, fait, voter, detailler }: {
    theme: AppThemeType; element: ElementSuivi; vote: boolean; fait: TranslationKey; voter: () => void; detailler: () => void;
}) {
    return (
        <View style={styles.ligne}>
            <Text style={[styles.titre, { color: theme.font }]}>{element.titre}</Text>
            {element.detail !== null ? <Text style={[styles.detail, { color: theme.fontSecondary }]}>{element.detail}</Text> : null}
            {element.fin !== null ? (
                <Text style={[styles.detail, { color: theme.success }]}>{element.fin}</Text>
            ) : (
                <>
                    {element.etat !== undefined ? <Text style={[styles.detail, { color: theme.accent }]}>{element.etat}</Text> : null}
                    <View style={styles.gestes}>
                        <Puce theme={theme} icone="thumb-up-outline" libelle={Translator.get(vote ? fait : 'MOI_AUSSI')} onPress={voter} faite={vote} />
                        <Puce theme={theme} icone="plus" libelle={Translator.get('MOI_AUSSI_DETAIL')} onPress={detailler} />
                    </View>
                </>
            )}
        </View>
    );
}

export function ElementsSuivis({ theme, titre, elements, votes, soutenir, fait = 'MOI_AUSSI_FAIT', aVote, detailler }: {
    theme: AppThemeType;
    titre?: string;
    /** Le mot d'un « moi aussi » donne : « Signale » pour un probleme, « Soutenue » pour une idee. */
    fait?: TranslationKey;
    elements: readonly ElementSuivi[];
    votes: readonly string[];
    /** Le vote, par le service du genre ; `null` quand il ne peut pas partir. */
    soutenir: (id: string) => Promise<ResultatDeContribution | null>;
    aVote: (id: string) => void;
    detailler: (element: ElementSuivi) => void;
}) {
    const [enCours, setEnCours] = useState<string | null>(null);
    if (elements.length === 0) return null;

    const voter = async (element: ElementSuivi) => {
        if (enCours !== null) return;
        setEnCours(element.id);
        try {
            const compte = aCompte(await soutenir(element.id));
            if (compte) aVote(element.id);
            new ErrorAlert(Translator.get(compte ? 'MOI_AUSSI_MERCI' : 'MOI_AUSSI_ECHEC')).show();
        } finally {
            setEnCours(null);
        }
    };

    return (
        <GroupeDeReglages theme={theme} titre={titre} filetCourt>
            {elements.map((element) => (
                <Ligne
                    key={element.id}
                    theme={theme}
                    element={element}
                    vote={votes.includes(element.id)}
                    fait={fait}
                    voter={() => { void voter(element); }}
                    detailler={() => detailler(element)}
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

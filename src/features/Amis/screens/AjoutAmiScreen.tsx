/**
 * Un lien d'ami recu (docs/phase-8/8-amis.md) : ce qu'il porte, le prenom sous lequel le ranger, et un
 * geste, « Ajouter ». Un lien illisible, d'une version plus recente, expire ou d'un etablissement que
 * le catalogue ne connait pas se dit, sans rien ranger (`verdictDuLien`).
 */

import moment from 'moment';
import React, { useContext, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getEtablissement } from '../../../shared/etablissements';
import Translator, { type TranslationKey } from '../../../shared/i18n/Translator';
import { AppContext } from '../../../shared/services/AppCore';
import { maintenant } from '../../../shared/services/Temps';
import style, { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { GroupeDeReglages, RangeeDeReglage } from '../../../shared/ui/GroupeDeReglages';
import { ChampDePrenom } from '../components/ChampDePrenom';
import { amiDuMemeNom, verdictDuLien, type VerdictDuLien } from '../services/amis';
import { ajouterLAmi, useAmis } from '../services/AmisStore';
import { dateDuJour, dernierJour } from '../services/instantane';
import { nomAffichable, type Partage } from '../services/lienAmi';

interface AjoutAmiScreenProps {
    navigation: { replace: (route: string, params?: object) => void };
    route: { params: { lien: string } };
    headerPadding?: Record<string, unknown>;
}

const REFUS: Readonly<Record<Extract<VerdictDuLien, { ok: false }>['raison'], { titre: TranslationKey; corps: TranslationKey; icone: 'link-variant-off' | 'update' | 'clock-outline' | 'school-outline' }>> = {
    illisible: { titre: 'AJOUT_ILLISIBLE_TITRE', corps: 'AJOUT_ILLISIBLE', icone: 'link-variant-off' },
    version: { titre: 'AJOUT_VERSION_TITRE', corps: 'AJOUT_VERSION', icone: 'update' },
    expire: { titre: 'AJOUT_EXPIRE_TITRE', corps: 'AJOUT_EXPIRE', icone: 'clock-outline' },
    'etablissement-inconnu': { titre: 'AJOUT_ILLISIBLE_TITRE', corps: 'AJOUT_ETABLISSEMENT_INCONNU', icone: 'school-outline' },
};

/** Ce que le lien porte, en deux rangees : l'etablissement, puis les groupes ou la fin de l'instantane. */
function ContenuDuLien({ theme, partage }: { theme: AppThemeType; partage: Partage }) {
    const etablissement = getEtablissement(partage.etablissement);
    const contenu = partage.contenu;
    return (
        <GroupeDeReglages theme={theme}>
            {etablissement !== null ? <RangeeDeReglage theme={theme} icone="school-outline" libelle={Translator.get('INSTITUTION')} valeur={etablissement.nomCourt ?? etablissement.nom} /> : null}
            {contenu.genre === 'groupes'
                ? <RangeeDeReglage theme={theme} icone="account-group-outline" libelle={Translator.get('AJOUT_GROUPES')} valeur={contenu.groupes.join(', ')} />
                : <RangeeDeReglage theme={theme} icone="clock-outline" libelle={Translator.get('AJOUT_CRENEAUX')} valeur={Translator.get('AMI_JUSQUAU', moment(dernierJour(contenu.premierJour)).format('D MMM'))} />}
        </GroupeDeReglages>
    );
}

export default function AjoutAmiScreen({ navigation, route, headerPadding }: AjoutAmiScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];
    const verdict = useMemo(() => verdictDuLien(route.params.lien, dateDuJour(maintenant()), (code) => getEtablissement(code) !== null), [route.params.lien]);
    const amis = useAmis();
    const [nom, setNom] = useState(verdict.ok === true ? verdict.partage.nom ?? '' : '');
    const [envoi, setEnvoi] = useState(false);

    if (verdict.ok === false) {
        const refus = REFUS[verdict.raison];
        const date = verdict.dernierJour === undefined ? '' : moment(verdict.dernierJour).format('D MMMM');
        return (
            <View style={[styles.page, { backgroundColor: theme.background }, headerPadding]}>
                <View style={styles.etat}>
                    <EmptyState theme={theme} icon={refus.icone} tone="warning" title={Translator.get(refus.titre)} message={Translator.get(refus.corps, date)} />
                </View>
            </View>
        );
    }

    const { partage } = verdict;
    const prenom = nomAffichable(nom);
    const remplace = prenom !== null && amis !== null ? amiDuMemeNom(amis, prenom) : null;
    const ajouter = () => {
        if (prenom === null) return;
        setEnvoi(true);
        ajouterLAmi(partage, prenom)
            .then((id) => navigation.replace('Ami', { id, nom: prenom }))
            .catch((erreur) => {
                console.warn('[amis] ajout en erreur', erreur);
                setEnvoi(false);
            });
    };

    return (
        <View style={[styles.page, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={[headerPadding, styles.contenu]} keyboardShouldPersistTaps="handled">
                <Text style={[tokens.texte.titreDeSection, styles.titre, { color: theme.font }]}>
                    {partage.nom !== null ? Translator.get('AJOUT_PARTAGE_DE', partage.nom) : Translator.get('AJOUT_PARTAGE_ANONYME')}
                </Text>
                <ContenuDuLien theme={theme} partage={partage} />
                <GroupeDeReglages theme={theme} pied={remplace !== null ? Translator.get('AJOUT_REMPLACE', remplace.nom) : undefined}>
                    <ChampDePrenom theme={theme} libelle={Translator.get('AJOUT_PRENOM')} valeur={nom} onChange={setNom} />
                </GroupeDeReglages>
                <ActionButton theme={theme} label={Translator.get('AJOUT_AJOUTER')} icon={{ name: 'account-plus-outline' }} disabled={prenom === null || envoi} style={styles.bouton} onPress={ajouter} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    contenu: {
        paddingBottom: tokens.space.xxl,
    },
    titre: {
        marginHorizontal: tokens.space.xl,
        marginTop: tokens.space.md,
    },
    etat: {
        marginHorizontal: tokens.space.sm,
        marginTop: tokens.space.lg,
    },
    bouton: {
        marginHorizontal: tokens.space.md,
        marginTop: tokens.space.lg,
    },
});

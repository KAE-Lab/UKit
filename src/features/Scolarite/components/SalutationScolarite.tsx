/**
 * La salutation de l'onglet Scolarite, et l'etablissement qui va avec (7-J, deuxieme passe).
 *
 * **Elle vit dans la page, sous l'en-tete fixe**, et defile avec elle. Elle tenait dans un bandeau
 * collant, propre a cet onglet — un titre, la salutation, le filigrane de l'etablissement, un filet —,
 * a cote d'un titre flottant qui s'effacait quand il n'y avait rien a saluer : deux gabarits de plus
 * que le reste de l'application. L'onglet porte desormais l'en-tete de tous les autres (`EnTeteDOnglet`).
 *
 * Ce qui ne change pas, et pourquoi : le titre reste « Scolarite », jamais la salutation (un titre au
 * contenu variable cassait sa ligne au premier prenom compose, essai defait le 2026-08-30) ; sans
 * dossier lu, il n'y a rien a saluer et ce bloc ne se pose pas (`ScolariteDashboard`) ; sans logo
 * publie, le nom court de l'etablissement en dit autant en toutes lettres.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Badge } from '../../../shared/ui/Badge';
import { getEtablissementActif, nomCourtEtablissement } from '../../../shared/etablissements';
import type { ScolariteColdData } from '../services/ScolariteMapping';
import GreetingBlock from './GreetingBlock';
import { LogoEtablissement } from './LogoEtablissement';

export function SalutationScolarite({ theme, teinte, coldData }: { theme: AppThemeType; teinte: string; coldData: ScolariteColdData | null }) {
    const logo = getEtablissementActif().logo;
    return (
        <View style={styles.bloc}>
            <View style={styles.rangee}>
                <View style={styles.texte}>
                    <GreetingBlock coldData={coldData} theme={theme} />
                </View>
                {logo !== null ? (
                    <LogoEtablissement logo={logo} theme={theme} teinte={teinte} filigrane style={styles.logo} />
                ) : null}
            </View>
            {logo === null ? (
                <View style={styles.nomCourt}>
                    <Badge label={nomCourtEtablissement()} theme={theme} icon={{ name: 'school-outline' }} />
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    bloc: {
        marginHorizontal: tokens.space.md,
    },
    rangee: {
        flexDirection: 'row',
        // Le logo se pose sur le bas de la salutation, comme un texte sur sa ligne d'ecriture.
        alignItems: 'flex-end',
        gap: tokens.space.md,
    },
    texte: {
        flex: 1,
    },
    logo: {
        marginBottom: tokens.space.xxs,
    },
    nomCourt: {
        flexDirection: 'row',
        marginTop: tokens.space.md,
    },
});

/**
 * Le formulaire de connexion de l'ecran du compte, et ce qui vit avec lui.
 *
 * Sorti de `CredentialsSettingsScreen` pour le garder sous la limite de lignes, le jour ou le
 * formulaire a quitte l'onglet Scolarite (6.1.x-B) et que deux choses l'ont suivi ici : le choix d'un
 * autre campus, et les identifiants memorises par le navigateur integre.
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { HEADER_OFFSET } from '../../../shared/ui/ScreenState';
import { getCodeEtablissementActif } from '../../../shared/etablissements';
import { basculerEtablissement } from '../../../shared/etablissements/bascule';
import { ChoixEtablissement } from '../../../shared/ui/ChoixEtablissement';
import ScolariteLoginView from './ScolariteLoginView';
import { IdentifiantsNavigateur } from './IdentifiantsNavigateur';

/**
 * Aucun compte enregistre : on propose de se connecter, pas une fiche vide.
 *
 * C'est le meme formulaire que partout ailleurs, et il referme l'ecran une fois la session partie —
 * on revient donc la d'ou l'on venait, le plus souvent les Reglages.
 *
 * **C'est ici que vit le formulaire depuis le jalon 6.1.x-B** : l'onglet Scolarite montre la meme
 * page avec ou sans compte, et son encart mene ici. Deux choses ont suivi le formulaire : le choix
 * d'un autre campus, que l'onglet portait, et les identifiants memorises par le navigateur integre,
 * qui n'ouvrent aucune session et que cet ecran est le seul a pouvoir montrer et oublier.
 */
/**
 * `onScroll` est le rapporteur de l'en-tete anime : le titre « Compte » s'efface au defilement ici
 * aussi. Le formulaire a sa propre vue defilante, et sans lui le titre restait plante (iPhone,
 * 2026-09-07).
 */
export const CompteADemander = ({ theme, onDebut, onSuccess, onScroll = undefined }) => {
    const [choixCampus, setChoixCampus] = useState(false);

    return (
    <SafeAreaInsetsContext.Consumer>
        {(insets) => (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                <ScolariteLoginView
                    theme={theme}
                    color={theme.accent ?? theme.primary}
                    // `HEADER_OFFSET` et non un 65 ecrit ici : c'etait un troisieme nombre pour la
                    // meme hauteur d'en-tete, a cote du 70 du socle. Le depot dit qu'il ne doit pas y
                    // en avoir deux (shared/ui/ScreenState.tsx).
                    topPadding={(insets?.top || 0) + HEADER_OFFSET}
                    onDebut={onDebut}
                    onSuccess={onSuccess}
                    onAutreCampus={() => setChoixCampus(true)}
                    onScroll={onScroll}
                    compact
                    pied={<IdentifiantsNavigateur theme={theme} teinte={theme.accent ?? theme.primary} />}
                />
                {/* La meme bascule que les Reglages, avertissement de purge compris : un etudiant
                    venu de la v5 voit le portail de Bordeaux sans autre indice que le logo (6.1-A). */}
                <ChoixEtablissement
                    theme={theme}
                    visible={choixCampus}
                    fermer={() => setChoixCampus(false)}
                    codeActif={getCodeEtablissementActif()}
                    onConfirmer={(code) => { void basculerEtablissement(code); }}
                />
            </View>
        )}
    </SafeAreaInsetsContext.Consumer>
    );
};

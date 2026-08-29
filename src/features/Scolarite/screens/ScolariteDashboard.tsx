/**
 * L'onglet Scolarite.
 *
 * Trois sections, et elles n'ont pas la meme nature — c'est ce qui les empeche de se ressembler :
 * « Ton dossier » est ce que l'application **sait**, « Tes services » ce que l'etudiant peut
 * **ouvrir**, « Tes documents » ce qu'il a **range**. Une grille de tuiles indifferenciees se lit
 * comme un brouillon ; trois sections dont l'intention est nommee se lisent comme une decision
 * (docs/features/scolarite.md).
 *
 * ## L'aiguillage s'est inverse, et c'est le changement structurant
 *
 * Cet ecran rendait un etat **plein ecran** et rien d'autre des que la session n'etait pas nominale.
 * Depuis que les documents existent — locaux, sans compte, sans portail — cacher toute la page
 * derriere un ecran d'erreur rendrait l'onglet mort pour ceux a qui il sert le plus. Les etats sont
 * donc des **encarts en tete de page** (`EncartSession`), et la page se poursuit dessous.
 *
 * Une seule exception, deliberee : le **parcours froid** reste plein ecran, parce qu'il est
 * transitoire et qu'une page qui se remplit sous un indicateur de progression fait sauter le contenu.
 *
 * ## Le verrou biometrique ne garde que ce qui merite d'etre garde
 *
 * Il ne s'arme que lorsqu'un compte est enregistre. Sans compte il n'y a **rien a proteger** dans cet
 * onglet — l'identite n'a pas ete lue — et demander une empreinte pour atteindre ses propres fichiers
 * serait un peage sans serrure derriere. Il reste une porte d'interface : le trousseau, lui, n'exige
 * pas d'authentification (docs/features/scolarite.md).
 */

import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { demandeUneRessaisie, presenterEchec } from '../services/ScolariteMapping';
import { useCredentials } from '../services/CredentialsContext';
import BiometryGate from '../components/BiometryGate';
import ScolariteLoadingScreen from '../components/ScolariteLoadingScreen';
import { useEcranDeProgression } from '../hooks/useEcranDeProgression';
import { PageScolarite } from '../components/PageScolarite';
import { EnteteScolarite } from '../components/EnteteScolarite';
import type { PointWidget } from '../widgets/definitions';

const ScolariteDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const accent = theme.accent ?? theme.primary;

    const {
        credentials, credentialsLoaded, coldData, widgets, certificatEnCours, portailDisponible,
        scrapeStatus, scrapeProgress, sessionMode, sessionFailure, retrySession,
    } = useCredentials();

    const renderHeader = (insets) => (
        <EnteteScolarite
            theme={theme}
            teinte={accent}
            insets={insets}
            coldData={coldData}
            valeurs={widgets.valeurs}
        />
    );

    if (!credentialsLoaded) return null;

    // `useEcranDeProgression` et non un test direct : l'ecran doit **survivre** quelques centaines de
    // millisecondes a la fin du run, le temps que la barre rejoigne 100 %. Sans ce delai, elle restait
    // a 80 % et la page se substituait d'un coup.
    const progression = useEcranDeProgression(sessionMode, scrapeStatus);

    /**
     * L'echec qui merite un encart : la session a echoue **et** il n'y a aucune identite a afficher.
     * Quand des donnees froides existent, le dossier reste montrable et c'est la ligne de messagerie
     * qui porte l'echec. Un run annule ne montre rien : l'utilisateur est deja parti.
     */
    const echecBloquant = scrapeStatus === 'error' && coldData === null
        && sessionFailure !== null && !sessionFailure.silent
        ? presenterEchec(sessionFailure)
        : null;

    const ouvrirRessaisie = () => navigation.navigate('CredentialsSettings', { ressaisie: true });
    const ouvrirFiche = () => navigation.navigate('CredentialsSettings');
    const ouvrirDocuments = () => navigation.navigate('Documents');
    const ouvrirPorte = (point: string) => navigation.navigate('WebBrowser', { entrypoint: point });
    const ouvrirLien = (href: string) => navigation.navigate('WebBrowser', { href });

    /**
     * Ou mene une rangee de widget.
     *
     * Quand elle dit « identifiants incorrects », la toucher doit mener a les **corriger**, pas ouvrir
     * un service auquel on n'a plus acces. C'est l'autre moitie de l'impasse : celle qui se produit
     * quand des donnees froides existent deja, donc que l'encart d'echec ne s'affiche pas. La regle
     * valait pour la messagerie seule ; elle vaut pour les quatre, et pour la meme raison.
     *
     * La messagerie s'ouvre sous `email` : le point de catalogue porte le nom du service, pas celui du
     * widget. Les trois autres coincident (docs/features/scolarite.md).
     */
    const ouvrirWidget = (point: PointWidget) => {
        const echec = widgets.echecs[point] ?? sessionFailure;
        if (demandeUneRessaisie(echec)) return ouvrirRessaisie();
        return ouvrirPorte(point === 'messagerie' ? 'email' : point);
    };

    // Le parcours froid prend l'ecran : il est transitoire, et une page qui se remplit sous lui
    // ferait sauter le contenu a chaque etape franchie.
    if (portailDisponible && credentials && progression.visible) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <SafeAreaInsetsContext.Consumer>
                    {(insets) => renderHeader(insets)}
                </SafeAreaInsetsContext.Consumer>
                <ScolariteLoadingScreen
                    scrapeProgress={scrapeProgress}
                    terminee={progression.terminee}
                    theme={theme}
                    color={accent}
                />
            </View>
        );
    }

    const corps = () => (
        <PageScolarite
            certificatEnCours={certificatEnCours}
            theme={theme}
            teinte={accent}
            coldData={coldData}
            widgets={widgets}
            credentials={credentials}
            portailDisponible={portailDisponible}
            sessionFailure={sessionFailure}
            echecBloquant={echecBloquant}
            onRetry={retrySession}
            onRessaisir={ouvrirRessaisie}
            onConnecter={ouvrirFiche}
            onDemanderCampus={ouvrirLien}
            onWidget={ouvrirWidget}
            onPorte={ouvrirPorte}
            onDocuments={ouvrirDocuments}
        />
    );

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}
                    {credentials
                        ? <BiometryGate theme={theme}>{corps()}</BiometryGate>
                        : corps()}
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default ScolariteDashboard;

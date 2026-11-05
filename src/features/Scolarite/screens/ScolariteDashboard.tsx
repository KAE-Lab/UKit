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
 * ## Sans compte, la meme page (6.1.x-B)
 *
 * L'onglet sans compte a ete le formulaire, du 2026-08-31 au 2026-09-07. Un enseignant-chercheur a
 * demande ou etait le webmail : il ne pouvait pas le trouver, la page ne montrait qu'un formulaire
 * etudiant. Les portes des services n'ont pourtant jamais eu besoin d'une session — elles viennent
 * du catalogue. La page sans compte est donc **la meme** que la page connectee : le bandeau avec la
 * salutation sans prenom, la grille en portes, les documents.
 * Le formulaire vit dans l'ecran du compte, ou l'encart mene. « Autre campus », lui, ne bouge pas.
 *
 * ## Un seul en-tete, celui de tous les onglets (7-J, deuxieme passe)

L'onglet portait deux gabarits a lui : un titre flottant qui s'effacait au defilement tant qu'il n'y
avait pas de dossier a saluer, et un bandeau collant — titre, salutation, filigrane, filet — des qu'il
y en avait un. Il porte desormais l'en-tete fixe des autres onglets (`EnTeteDOnglet`), et la
salutation ouvre la page (`SalutationScolarite`), dans les memes cas qu'avant : avec un dossier, ou
sans compte ; jamais sur un compte sans dossier, ou il n'y a rien a saluer (2026-09-04).

## Le verrou biometrique ne garde que ce qui merite d'etre garde
 *
 * Il ne s'arme que lorsqu'un compte est enregistre. Sans compte il n'y a **rien a proteger** dans cet
 * onglet — l'identite n'a pas ete lue — et demander une empreinte pour atteindre ses propres fichiers
 * serait un peage sans serrure derriere. Il reste une porte d'interface : le trousseau, lui, n'exige
 * pas d'authentification (docs/features/scolarite.md).
 */

import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useAnimatedScrollHandler, useSharedValue, type SharedValue } from 'react-native-reanimated';

import style, { type AppThemeType } from '../../../shared/theme/Theme';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Translator from '../../../shared/i18n/Translator';
import { PastilleService } from '../../../shared/messages/PastilleService';
import { ouvrirLeFormulaire } from '../../../shared/navigation/formulaireDeRetours';
import { parametresDuFormulaire } from '../../../shared/navigation/liensDuFormulaire';
import { AppContext } from '../../../shared/services/AppCore';
import { demandeUneRessaisie, echecBloquantDe } from '../services/ScolariteMapping';
import { useCredentials } from '../services/CredentialsContext';
import BiometryGate from '../components/BiometryGate';
import ScolariteLoadingScreen from '../components/ScolariteLoadingScreen';
import { useEcranDeProgression } from '../hooks/useEcranDeProgression';
import { useSessionDemandeeIci } from '../hooks/useSessionDemandeeIci';
import { PageScolarite } from '../components/PageScolarite';
import { CampusNonRelie } from '../components/CampusNonRelie';
import { serviceDuPoint, type PointWidget } from '../widgets/definitions';
import { EnTeteDOnglet, hauteurDeLEnTete } from '../../../shared/ui/EnTeteDOnglet';

/** L'en-tete de l'onglet : celui de Campus et des Reglages, fixe, dans tous les etats. */
const EnTeteDeLOnglet = ({ theme, defilement, insets }: { theme: AppThemeType; defilement: SharedValue<number>; insets: EdgeInsets | null }) => (
    <EnTeteDOnglet
        theme={theme}
        onglet="scolarite"
        titre={Translator.get('SCOLARITY')}
        defilement={defilement}
        repos={0}
        hautSur={insets?.top ?? 0}
        droite={<PastilleService theme={theme} onglet="Scolarité" />}
    />
);

/**
 * Le parcours froid **qui n'a rien a preserver** : au lancement, ou apres une annulation.
 *
 * Il prend l'ecran parce qu'il est transitoire, et qu'une page qui se remplirait sous lui ferait
 * sauter le contenu a chaque etape franchie. Des qu'il y a quelque chose a garder — un dossier deja
 * lu, ou un geste fait sur la page — la progression se pose en encart et la page tient
 * (`PageScolarite`).
 */
/**
 * Ou mene chaque geste de l'onglet. Regroupees parce qu'elles n'ont rien a decider : ce sont cinq
 * destinations, et les laisser dans le corps de l'ecran l'allongeait sans rien lui apprendre.
 */
function destinations(navigation) {
    return {
        ouvrirRessaisie: () => navigation.navigate('CredentialsSettings', { ressaisie: true }),
        ouvrirFiche: () => navigation.navigate('CredentialsSettings'),
        ouvrirDocuments: () => navigation.navigate('Documents'),
        ouvrirPorte: (point: string) => navigation.navigate('WebBrowser', { entrypoint: point }),
        // Un lien vers le formulaire, depuis une rangee de widget : avec la regle des domaines internes
        // (liensDuFormulaire), sans quoi la page d'engagement remplacait le formulaire (7-C).
        ouvrirLien: (href: string) => navigation.navigate('WebBrowser', parametresDuFormulaire(href)),
    };
}

const EcranDeParcoursFroid = ({ theme, accent, renderHeader, scrapeProgress, terminee }) => (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaInsetsContext.Consumer>
            {(insets) => renderHeader(insets)}
        </SafeAreaInsetsContext.Consumer>
        <ScolariteLoadingScreen
            scrapeProgress={scrapeProgress}
            terminee={terminee}
            theme={theme}
            color={accent}
        />
    </View>
);


const ScolariteDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const accent = theme.accent ?? theme.primary;

    const {
        credentials, credentialsLoaded, coldData, widgets, certificatEnCours, portailDisponible,
        scrapeStatus, scrapeProgress, sessionMode, sessionFailure, retrySession,
    } = useCredentials();

    /** Le defilement de la page, que l'en-tete lit pour faire paraitre son fondu. */
    const defilement = useSharedValue(0);
    const surDefilement = useAnimatedScrollHandler((evenement) => {
        defilement.value = evenement.contentOffset.y;
    });

    const sansCompte = !credentials;
    const renderHeader = (insets: EdgeInsets | null) => (
        <EnTeteDeLOnglet theme={theme} defilement={defilement} insets={insets} />
    );

    // `useEcranDeProgression` et non un test direct : l'ecran doit **survivre** quelques centaines de
    // millisecondes a la fin du run, le temps que la barre rejoigne 100 %. Sans ce delai, elle restait
    // a 80 % et la page se substituait d'un coup.
    const progression = useEcranDeProgression(sessionMode, scrapeStatus);
    // Une session lancee par un geste fait **ici** laisse la page a ce geste jusqu'a son terme :
    // `credentials` est pose au dixieme step, et sans ce drapeau l'ecran basculait en plein run
    // (voir le hook). Les deux hooks vivent au-dessus du premier retour, comme les regles l'exigent.
    const geste = useSessionDemandeeIci(progression.visible);

    if (!credentialsLoaded) return null;

    /**
     * L'echec qui merite un encart. Avec un dossier deja lu, l'encart se pose au-dessus de la page
     * qui reste — une actualisation qui echoue ne doit pas etre muette (6.1-A). La regle est partagee
     * avec la fiche du compte (ScolariteMapping.echecBloquantDe).
     */
    const echecBloquant = echecBloquantDe(scrapeStatus, sessionFailure);

    /**
     * « Reessayer », depuis l'encart d'echec de la page.
     *
     * Le geste s'annonce **ici**, dans le `onPress`, et non dans `retrySession` : un parcours froid
     * repart aussi tout seul au retour au premier plan apres une annulation
     * (`useCycleDeVieSession`), et cette reprise-la n'est pas un geste — elle doit garder l'ecran
     * plein, qui est le bon rendu quand il n'y a rien a preserver.
     */
    const reessayerDepuisLaPage = () => {
        geste.depuisLaPage();
        retrySession();
    };

    const { ouvrirRessaisie, ouvrirFiche, ouvrirDocuments, ouvrirPorte, ouvrirLien } = destinations(navigation);

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
        return ouvrirPorte(serviceDuPoint(point));
    };

    // Un campus que l'application ne porte pas a sa page — pas le tableau de bord avec un encart de
    // plus (voir CampusNonRelie). Elle passe devant tout : sans portail, il n'y a ni formulaire, ni
    // session, ni grille a montrer.
    if (!portailDisponible) {
        return <CampusNonRelie theme={theme} onDemande={() => ouvrirLeFormulaire(navigation, { porte: 'campus' })} />;
    }

    // Sans compte, aucun aiguillage particulier (6.1.x-B) : la page ordinaire, en portes, avec son
    // encart d'invitation. Le formulaire vit dans l'ecran du compte, ou l'encart mene. Le retour
    // anticipe sur `credentialsLoaded` evite le flash de la page en portes le temps de lire le
    // trousseau au lancement.

    /*
     * Le parcours froid prend l'ecran **tant qu'il n'y a aucun dossier a montrer** : il est
     * transitoire, et une page qui se remplit sous lui ferait sauter le contenu a chaque etape
     * franchie. Avec un dossier deja lu — « Actualiser mon dossier » —, la page reste et la
     * progression s'y pose en encart (PageScolarite) : revenir sur l'onglet pendant l'actualisation
     * retombait sur l'ecran plein, l'ancienne barre (constat du 2026-09-02, 6.1-A).
     *
     * **Sauf si le geste vient de cette page**, correctif du 2026-09-04 : un dossier qui echoue apres
     * l'ecriture des identifiants laisse la page sur son encart d'echec, sans `coldData` ; toucher
     * « Reessayer » **dans l'encart** faisait donc reprendre l'ecran plein, et la page changeait sous
     * le doigt de quelqu'un en train de reparer. La page tient, la barre remplace l'encart. Il reste
     * l'ecran plein pour ce que personne n'a demande **ici** : le lancement, et la reprise apres une
     * annulation.
     */
    if (progression.visible && coldData === null && geste.origine !== 'page') {
        return (
            <EcranDeParcoursFroid
                theme={theme}
                accent={accent}
                renderHeader={renderHeader}
                scrapeProgress={scrapeProgress}
                terminee={progression.terminee}
            />
        );
    }

    const corps = (insets) => (
        <PageScolarite
            paddingHaut={hauteurDeLEnTete(insets?.top ?? 0)}
            onScroll={surDefilement}
            salutation={coldData !== null || sansCompte}
            certificatEnCours={certificatEnCours}
            theme={theme}
            teinte={accent}
            progression={progression}
            scrapeProgress={scrapeProgress}
            coldData={coldData}
            widgets={widgets}
            credentials={credentials}
            portailDisponible={portailDisponible}
            sessionFailure={sessionFailure}
            echecBloquant={echecBloquant}
            onRetry={reessayerDepuisLaPage}
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
                        ? <BiometryGate theme={theme}>{corps(insets)}</BiometryGate>
                        : corps(insets)}
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

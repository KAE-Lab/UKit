import React, { useState, useRef, useMemo, useContext, useEffect } from 'react';
import { Linking, Platform, View, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import style from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { URL } from '../../../shared/constants/urls';
import { serviceEtablissement } from '../../../shared/etablissements';
import SecureStoreService from '../../../shared/services/SecureStoreService';
import Translator from '../../../shared/i18n/Translator';
import { ChargementPleinePage } from '../../../shared/ui/ChargementPleinePage';
import { destinationReelle, resteDansLaVue } from '../../../shared/navigation/liensDuFormulaire';

import { FloatingActionBar, SaveCredentialsModal, getPortalInjectedScript } from '../components/WebBrowserComponents';

/**
 * L'adresse d'un point d'entree, telle que **l'etablissement selectionne** la declare.
 *
 * Les quatre adresses etaient en dur ici jusqu'au jalon 6-G, et c'etait le dernier hote bordelais
 * compile dans un ecran : un etudiant d'une autre fac s'y serait retrouve sur le portail de Bordeaux.
 * Elles vivent desormais dans le catalogue, corrigeables sans release comme le reste.
 *
 * Un point d'entree que l'etablissement ne declare pas retombe sur le site de UKit — le repli qui
 * existait deja pour un parametre absent. C'est benin et explicable, et les appelants ne mènent de
 * toute facon ici que lorsque le service existe (ScolariteDashboard).
 */
function adresseDuService(entrypoint?: string, href?: string): string {
    if (entrypoint) {
        const adresse = serviceEtablissement(entrypoint);
        if (adresse !== null) return adresse;
    }
    return href ?? URL.UKIT_WEBSITE;
}

export interface WebBrowserScreenProps {
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setOptions: (options: unknown) => void };
    route: { params?: { entrypoint?: 'ent' | 'email' | 'cas' | 'apogee'; href?: string; domainesInternes?: readonly string[] } };
    onDismiss?: () => void;
}

const useWebBrowser = (route, onDismiss, navigation) => {
    const initialUri = adresseDuService(route.params?.entrypoint, route.params?.href);

    const [uri, setUri] = useState(initialUri);
    const [url, setUrl] = useState(initialUri);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [loading, setLoading] = useState(true);

    const [savedCredentials, setSavedCredentials] = useState(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [tempCredentials, setTempCredentials] = useState(null);
    const [dismissing, setDismissing] = useState(false);
    const webViewRef = useRef(null);


    /*
     * Le trousseau se lit en asynchrone, et le script injecte en depend. Tant qu'il n'a pas repondu,
     * monter la vue lui donnerait un script **provisoire**, remplace une fraction de seconde plus
     * tard : `injectedJavaScript` changerait alors en pleine charge de page, ce qui refait le jeu de
     * scripts de la vue au pire moment. On attend donc la reponse — elle est locale et rapide — et le
     * script est stable des le premier rendu.
     */
    const [trousseauLu, setTrousseauLu] = useState(false);
    useEffect(() => {
        // La session d'abord, le navigateur ensuite (6.1.x-B) : un compte connecte remplit avec ses
        // identifiants ; sans compte, ceux que la modale de cet ecran a memorises. Les seconds ne
        // sont lus que par cet ecran — ils n'ouvrent aucune session.
        SecureStoreService.getCredentials()
            .then((session) => session ?? SecureStoreService.getAutofill())
            .then(setSavedCredentials)
            .finally(() => setTrousseauLu(true));
    }, []);

    /*
     * **Un report par `InteractionManager` a ete essaye ici, et retire.** Il partait de l'idee que la
     * creation de la vue native se disputait la frame avec l'animation de poussee de l'ecran. C'etait
     * faux : le gel venait de la synchronisation des cookies (voir le rendu plus bas), et retarder le
     * montage ne faisait que **rallonger l'attente** — on voyait l'indicateur plus longtemps, puis le
     * gel quand meme. Deplacer un cout n'est pas le supprimer.
     */

    useEffect(() => {
        const newUri = adresseDuService(route.params?.entrypoint, route.params?.href);
        if (newUri !== uri) {
            setUri(newUri);
            setUrl(newUri);
        }
    }, [route.params?.entrypoint, route.params?.href]);

    useEffect(() => {
        if (onDismiss) return;
        navigation.setOptions({ gestureEnabled: !canGoBack });
        const onBackPress = () => {
            if (canGoBack && webViewRef.current) {
                webViewRef.current.goBack();
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [canGoBack, navigation, onDismiss]);

    const onRefresh = () => webViewRef.current?.reload();
    const onBack = () => webViewRef.current?.goBack();
    const onForward = () => webViewRef.current?.goForward();
    const onQuit = () => {
        setDismissing(true);
        if (onDismiss) onDismiss();
        else navigation.goBack();
    };

    const openURL = async () => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
        } catch (err) {
            console.error('An error occurred', err);
        }
    };

    /*
     * Dans le magasin du **navigateur**, jamais dans la table de session (6.1.x-B). Ecrits la, ils
     * devenaient un compte etudiant au lancement suivant — sans avoir ete prouves, et chez un
     * enseignant sans dossier a lire. Un compte UKit se connecte depuis le formulaire, qui valide.
     */
    const saveCredentials = async () => {
        if (tempCredentials) {
            await SecureStoreService.saveAutofill(tempCredentials.username, tempCredentials.password);
            setSavedCredentials(tempCredentials);
        }
        setShowSaveModal(false);
    };

    const handleMessage = (event: import('react-native-webview').WebViewMessageEvent) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'CAS_CREDENTIALS') {
                if (savedCredentials && savedCredentials.username === data.username && savedCredentials.password === data.password) {
                    return;
                }
                setTempCredentials({ username: data.username, password: data.password });
                setShowSaveModal(true);
            }
        } catch {
        }
    };

    /*
     * Le formulaire de retours seul pose des domaines internes (shared/navigation/liensDuFormulaire.ts).
     * Un lien qui en sort s'ouvre **par-dessus**, dans une seconde instance de cet ecran : le
     * formulaire reste monte en dessous, et « retour » le retrouve la ou il en etait. Deux chemins
     * y menent, parce que Google Forms ouvre ses liens en « nouvelle fenetre » : la WebView les
     * signale par `onOpenWindow` quand ce gestionnaire existe, sinon les charge dans la meme vue en
     * repassant par `onShouldStartLoadWithRequest`. Les deux appliquent la meme regle.
     *
     * **Android partait dans le navigateur du systeme**, et c'est le troisieme fil de la meme
     * histoire. Google Forms pose ses liens en `target="_blank"` ; avec le defaut de
     * `setSupportMultipleWindows` (`true`), la WebView d'Android ne les charge pas elle-meme et les
     * confie au navigateur — on quittait UKit, formulaire perdu. Le formulaire le passe donc a
     * `false`, ce qui ramene le lien dans `onShouldStartLoadWithRequest` ou la regle decide. Les
     * portails universitaires gardent le defaut : eux ouvrent de vraies fenetres, une deconnexion
     * CAS ou un PDF.
     */
    const domainesInternes = route.params?.domainesInternes;
    const ouvrirParDessus = (adresse: string) => {
        // La destination reelle, et non le redirecteur : la seconde vue s'ouvre directement sur la
        // page, sans garder un saut dans son historique que « precedent » rejouerait.
        const destination = destinationReelle(adresse);
        console.log(`[navigateur] lien hors du formulaire, ouvert par-dessus : ${destination}`);
        (navigation as unknown as { push: (name: string, params: object) => void }).push('WebBrowser', { href: destination });
    };
    /*
     * **Ce gestionnaire est pose sur tous les ecrans, pas seulement sur le formulaire**, et c'est
     * la seconde moitie du defaut Android. Quand il manque, la WebView d'Android fabrique pour la
     * nouvelle fenetre une vue **sans client** (`RNCWebChromeClient.onCreateWindow`), et une vue
     * sans client confie l'adresse au **navigateur du systeme** : on quittait UKit. C'est vrai du
     * formulaire comme d'un portail — ou c'est pire, puisque la session reste ici.
     *
     * Sans domaines internes, une nouvelle fenetre s'ouvre donc simplement par-dessus, dans une
     * seconde instance de cet ecran. Avec, la regle decide : ce qui est chez Google revient dans la
     * vue courante, le reste s'empile.
     */
    const ouvrirNouvelleFenetre = ({ nativeEvent }: { nativeEvent: { targetUrl: string } }) => {
        if (domainesInternes !== undefined && resteDansLaVue(nativeEvent.targetUrl, domainesInternes)) {
            webViewRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(nativeEvent.targetUrl)}; true;`);
            return;
        }
        ouvrirParDessus(nativeEvent.targetUrl);
    };

    return {
        uri, url, canGoBack, canGoForward, loading, trousseauLu,
        savedCredentials, showSaveModal, setShowSaveModal,
        dismissing, webViewRef, setUrl, setCanGoBack, setCanGoForward, setLoading,
        onRefresh, onBack, onForward, onQuit, openURL, saveCredentials, handleMessage,
        domainesInternes, ouvrirParDessus, ouvrirNouvelleFenetre
    };
};

/**
 * Le script injecte dans le portail, memorise.
 *
 * Il ne depend que du trousseau et du catalogue, jamais du rendu : le reconstruire a chaque passage
 * rebatirait quelques kilo-octets de chaine pour rien, sur le thread qui est justement charge au
 * moment ou l'ecran s'ouvre. A part parce que ses deux hotes possibles sont l'un et l'autre a la
 * barre des cent lignes.
 */
function useScriptInjecte(savedCredentials: unknown): string {
    return useMemo(
        () => getPortalInjectedScript(
            savedCredentials,
            serviceEtablissement('cas'),
            serviceEtablissement('idp_shibboleth'),
        ),
        [savedCredentials],
    );
}

function WebBrowserScreen({ navigation, route, onDismiss }: WebBrowserScreenProps) {
    const { themeName } = useContext(AppContext);
    const insets = useSafeAreaInsets();
    
    const {
        uri, trousseauLu, canGoBack, canGoForward, loading, savedCredentials, showSaveModal, setShowSaveModal,
        dismissing, webViewRef, setUrl, setCanGoBack, setCanGoForward, setLoading,
        onRefresh, onBack, onForward, onQuit, openURL, saveCredentials, handleMessage, domainesInternes, ouvrirParDessus, ouvrirNouvelleFenetre
    } = useWebBrowser(route, onDismiss, navigation);

    const theme = style.Theme[themeName];
    const scriptInjecte = useScriptInjecte(savedCredentials);

    /*
     * Une seule phrase pour deux attentes, et c'est le bon compromis : la lecture du trousseau et le
     * chargement de la page ne durent pas pareil, mais elles disent la meme chose a qui regarde —
     * le portail n'est pas encore la. `topOffset: 0` parce que cet ecran n'a pas d'en-tete de pile,
     * il porte sa propre barre flottante.
     */
    const renderLoading = () => (
        <ChargementPleinePage
            theme={theme}
            message={Translator.get('LOADING_PORTAL')}
            patience={Translator.get('LOADING_PATIENCE_UNIVERSITY')}
            topOffset={0}
        />
    );

    // On attend la reponse du trousseau : elle decide du script injecte, et un script qui change
    // apres le montage refait le jeu de scripts de la vue en pleine charge de page.
    if (!uri || !trousseauLu) return renderLoading();


    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <SafeAreaView
                edges={onDismiss
                    ? ['top', 'left', 'right']           // mode modal : SafeAreaView gère le top
                    : (Platform.OS === 'ios'
                        ? ['left', 'right']              // mode normal iOS : contentInset gère le top
                        : ['top', 'left', 'right'])}
                style={{ flex: 1 }}
            >
                <WebView
                    ref={webViewRef}
                    style={{ flex: 1, backgroundColor: theme.background }}
                    startInLoadingState={true}
                    renderLoading={renderLoading}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    /*
                      * Ce qui fait que cet ecran s'ouvre **deja authentifie** — et ce qu'il ne faut
                      * SURTOUT pas y ajouter.
                      *
                      * Les parcours de portail persistent leur session (`options.session.persist`),
                      * donc le ticket CAS vit dans le magasin de cookies de la WebView. Ce magasin
                      * est **deja partage** : sans `incognito` et avec le cache actif, `WKWebView`
                      * emploie `WKWebsiteDataStore.defaultDataStore`, qui vaut pour tout le
                      * processus (RNCWebViewImpl.m, lignes 462-465). La WebView du moteur et
                      * celle-ci s'y retrouvent donc sans qu'on demande quoi que ce soit.
                      *
                      * **`sharedCookiesEnabled` a ete essaye et retire, et il faut dire pourquoi**
                      * pour que personne ne le remette. Il ne sert pas a partager entre WebViews
                      * mais a ponter le magasin d'`NSHTTPCookieStorage` — celui des requetes
                      * natives — vers celle-ci. On n'en a pas besoin : les deux cotes sont des
                      * WebViews. Et il coute cher : `syncCookiesToWebView` prend **tous** les
                      * cookies de l'application — pas ceux de l'URL visee, tous — et les ecrit un
                      * par un, chacun avec un aller-retour, **sur la file principale**
                      * (RNCWebViewImpl.m, ligne 1798). D'ou un gel a l'ouverture, qui **s'allonge a
                      * mesure que le magasin grossit** : plus on ouvrait de services, plus c'etait
                      * long. Mesure en lisant la source native, pas en supposant.
                      *
                      * `cacheEnabled` est explicite et non laisse au defaut : a `false`, la meme
                      * source bascule sur un magasin NON persistant (ligne 1872), ce qui ferait
                      * perdre la session en silence.
                      */
                    cacheEnabled={true}
                    thirdPartyCookiesEnabled={true}
                    pullToRefreshEnabled={true}
                    // Désactiver le swipe-back iOS en mode modal (c'est le widget qui gère le dismiss)
                    allowsBackForwardNavigationGestures={onDismiss ? canGoBack : true}
                    contentInset={(!onDismiss && Platform.OS === 'ios') ? { top: insets.top || 0, left: 0, bottom: 0, right: 0 } : undefined}
                    contentInsetAdjustmentBehavior="never"
                    injectedJavaScript={scriptInjecte}
                    onMessage={handleMessage}
                    originWhitelist={['*']}
                    setSupportMultipleWindows={domainesInternes === undefined}
                    onOpenWindow={ouvrirNouvelleFenetre}
                    onShouldStartLoadWithRequest={(event) => {
                        if (event.url.startsWith('http://') || event.url.startsWith('https://') || event.url === 'about:blank') {
                            // Pas de garde sur `isTopFrame` : sur iOS, la WebView le calcule en comparant
                            // l'adresse au document courant, et une navigation « nouvelle fenetre » le
                            // rend faux alors que c'est bien l'utilisateur qui a touche le lien.
                            if (domainesInternes !== undefined && !resteDansLaVue(event.url, domainesInternes)) {
                                ouvrirParDessus(event.url);
                                return false;
                            }
                            return true;
                        }

                        Linking.canOpenURL(event.url).then((supported) => {
                            if (supported) Linking.openURL(event.url);
                        }).catch(() => { });

                        return false;
                    }}
                    onNavigationStateChange={(e) => {
                        if (!e.loading) {
                            setUrl(e.url);
                            setCanGoBack(e.canGoBack);
                            setCanGoForward(e.canGoForward);
                            setLoading(e.loading);
                        }
                    }}
                    source={{ uri }}
                />
            </SafeAreaView>

            {!dismissing && (
                <FloatingActionBar
                    theme={theme}
                    insets={insets}
                    onBack={onBack}
                    onForward={onForward}
                    onRefresh={onRefresh}
                    openURL={openURL}
                    onQuit={onQuit}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    loading={loading}
                />
            )}

            <SaveCredentialsModal
                theme={theme}
                visible={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={saveCredentials}
            />
        </View>
    );
}

export default WebBrowserScreen;
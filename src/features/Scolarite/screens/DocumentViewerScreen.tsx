/**
 * Le lecteur de documents : ouvrir une piece **dans** l'application plutot que de la sortir.
 *
 * Jusqu'ici, consulter un certificat voulait dire passer par la feuille de partage du systeme et
 * choisir une autre application — trois gestes pour regarder une page qu'on a soi-meme rangee.
 *
 * ## La forme vient de l'ecran de carte, et c'est demande tel quel
 *
 * Meme construction que `MapScreen` : la barre de navigation est transparente (NavBarHelper), l'ecran
 * peint lui-meme un bandeau plein — encoche plus `HEADER_OFFSET`, fond de carte, filet bas — et le
 * contenu occupe tout le reste. Le geste secondaire vit **dans la barre**, en bouton d'en-tete
 * (`HeaderButton`, pose par `StackNavigator`) : ici le partage, la ou la carte propose l'ouverture
 * dans un plan externe.
 *
 * ## Trois strategies de rendu, et l'ecran bascule tout seul
 *
 * L'ecran est reste noir sur appareil a trois reprises (2026-08-29), avec des evenements de
 * chargement **normaux** — commence, puis fini, aucun echec. C'est le piege documente dans le natif :
 * une adresse `file://` que la conversion refuse fait charger une **page vide sans erreur**
 * (`RNCWebViewImpl`, `!request.URL` → `loadHTMLString:@""`). Un « chargement fini » ne prouve donc
 * pas que le document a charge ; seul le `nativeEvent.url` de l'evenement le dit.
 *
 * D'ou la construction :
 *
 *   1. **`fichier`** — l'adresse `file://`, d'abord : c'est le seul rendu PDF complet (defilement,
 *      zoom, toutes les pages). A la fin du chargement, l'URL rapportee est **verifiee** : si ce
 *      n'est pas notre fichier qui a charge, c'est la page vide — on ne le devine plus, on le lit ;
 *   2. **`inline`** — la bascule : le meme document, inline en base64 dans une page HTML
 *      (`source={{ html }}`), le chemin exact de l'ecran de carte, prouve sur l'appareil. Un `<img>`
 *      pour une image ; un `<embed>` pour un PDF, dont WebKit peut ne rendre que la premiere page —
 *      un certificat en a une, et une premiere page vaut mieux qu'un ecran noir ;
 *   3. **`pdfjs`** — Android, pour un PDF, et d'emblee : le moteur WebView d'Android n'a **aucune**
 *      visionneuse PDF, ni par `file://` ni par `<embed>`. La page du lecteur (assets/pdfjs/viewer.html)
 *      embarque pdf.js et dessine chaque page dans un canevas ; la bibliotheque, son worker et le
 *      document lui sont poses en litteraux a l'assemblage (services/LecteurPdfPage.ts). C'est la
 *      seule strategie qui execute du JavaScript, et il n'est active que pour elle. Un rendu qui ne
 *      vient pas — pieces illisibles, WebView trop ancienne, document trop lourd — retombe sur la
 *      feuille de partage, c'est-a-dire l'ecran d'avant la 6.1, et le dit (6.1-A).
 *
 * Le contenu est **lu et verifie au montage** : une piece vide ou qui n'a pas la signature de son
 * type part au repli au lieu d'un noir muet — c'est aussi ce qui distinguerait un fichier mal ecrit
 * d'un rendu qui echoue. Les traces `[lecteur]` nomment chaque etape et chaque bascule. Tout ce qui
 * decide vit dans `hooks/useLectureDuDocument.ts` ; cet ecran compose.
 *
 * ## Ce qui ne change pas
 *
 * **La piece ne quitte pas l'appareil.** Elle est lue depuis le repertoire prive de l'application, la
 * WebView ne va sur aucun reseau — pdf.js compris, qui tourne sur la page sans rien charger — et le
 * partage reste une decision de l'utilisateur. La formulation de PRIVACY.md tient telle quelle.
 */

import React, { useContext } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';

import style, { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator, { type TranslationKey } from '../../../shared/i18n/Translator';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { HEADER_OFFSET } from '../../../shared/ui/ScreenState';
import type { RootStackParamList } from '../../../shared/navigation/StackNavigator';
import { useLectureDuDocument } from '../hooks/useLectureDuDocument';

/** Envoie la piece vers une autre application. Exporte pour le bouton d'en-tete (`StackNavigator`). */
export async function partagerDocument(uri: string): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(uri);
}

/** L'ecran de repli : la feuille de partage, et une ligne qui dit pourquoi. */
function Repli({ theme, uri, messageKey, bandeau }: {
    theme: AppThemeType;
    uri: string;
    messageKey: TranslationKey;
    bandeau: React.ReactNode;
}) {
    return (
        <View style={[styles.ecran, { backgroundColor: theme.background }]}>
            {bandeau}
            <View style={styles.repli}>
                <EmptyState
                    icon="file-eye-outline"
                    title={Translator.get('DOCUMENT_PREVIEW_UNAVAILABLE_TITLE')}
                    message={Translator.get(messageKey)}
                    theme={theme}
                    variant="card"
                    action={{
                        label: Translator.get('DOCUMENT_OPEN_ELSEWHERE'),
                        onPress: () => { void partagerDocument(uri); },
                    }}
                />
            </View>
        </View>
    );
}

export function DocumentViewerScreen({ route }: {
    route: RouteProp<RootStackParamList, 'DocumentViewer'>;
}) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();
    const uri = route.params?.uri ?? '';
    const lecture = useLectureDuDocument(uri, route.params?.nom ?? '', theme.background);

    /*
     * Le meme bandeau que la carte : la barre de navigation est transparente, c'est l'ecran qui peint
     * le fond derriere elle. `HEADER_OFFSET` et non le 65 que la carte ecrit encore en dur — c'est la
     * constante que le compte et le lien d'abonnement utilisent deja pour la meme chose.
     */
    const bandeau = (
        <View
            style={[
                styles.bandeau,
                {
                    height: (insets.top || 0) + HEADER_OFFSET,
                    backgroundColor: theme.cardBackground,
                    borderBottomColor: theme.border,
                },
            ]}
        />
    );

    if (lecture.repli !== null) {
        return <Repli theme={theme} uri={uri} bandeau={bandeau} messageKey={lecture.repli} />;
    }

    return (
        <View style={[styles.ecran, { backgroundColor: theme.background }]}>
            {bandeau}
            <View style={styles.vue}>
                {/* `key` : changer de strategie doit recreer la vue, pas recharger la meme — une
                    WebView qui a charge une page vide garde parfois son etat de navigation. */}
                {lecture.source !== null ? (
                    <WebView
                        key={lecture.strategie}
                        source={lecture.source}
                        style={{ backgroundColor: theme.background }}
                        // `['*']` comme la carte : une entree qui ne correspond pas fait SORTIR la
                        // navigation vers le systeme au lieu de la rendre. Le contenu est local, il
                        // n'y a rien a proteger.
                        originWhitelist={['*']}
                        allowFileAccess
                        // Du JavaScript pour le seul lecteur pdf.js : les deux autres strategies
                        // affichent un document, elles n'ont rien a executer.
                        javaScriptEnabled={lecture.strategie === 'pdfjs'}
                        onMessage={({ nativeEvent }) => lecture.surMessage(nativeEvent.data)}
                        // Le pincement pour zoomer, sur Android : celui de la WebView, sans ses
                        // boutons a l'ecran.
                        setBuiltInZoomControls={lecture.strategie === 'pdfjs'}
                        setDisplayZoomControls={false}
                        onLoadStart={() => console.log(`[lecteur] chargement commence (${lecture.strategie})`)}
                        onLoadEnd={({ nativeEvent }) => lecture.surFinDeChargement(nativeEvent.url ?? '')}
                        onError={({ nativeEvent }) => lecture.surErreur(nativeEvent.description ?? 'sans detail')}
                        // Le processus web peut mourir en rendant un document : l'evenement existe
                        // pour ca, et il ne passe par aucun des deux precedents.
                        onContentProcessDidTerminate={lecture.surFinDuProcessus}
                        showsVerticalScrollIndicator={false}
                    />
                ) : null}
                {lecture.chargement ? (
                    // Sans fond : l'indicateur flotte sur le contenu au lieu de le couvrir. Un voile
                    // opaque transformerait « l'evenement de fin n'est pas arrive » en ecran noir
                    // permanent — indiscernable d'un rendu qui a echoue.
                    <View style={styles.attente} pointerEvents="none">
                        <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                    </View>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    ecran: { flex: 1 },
    bandeau: {
        borderBottomWidth: 1,
    },
    vue: { flex: 1 },
    repli: {
        flex: 1,
        justifyContent: 'center',
        padding: tokens.space.md,
    },
    attente: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default DocumentViewerScreen;

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
 * ## Deux strategies de rendu, et l'ecran bascule tout seul
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
 *      un certificat en a une, et une premiere page vaut mieux qu'un ecran noir.
 *
 * Le contenu est **lu et verifie au montage** : une piece vide ou qui n'a pas la signature de son
 * type part au repli au lieu d'un noir muet — c'est aussi ce qui distinguerait un fichier mal ecrit
 * d'un rendu qui echoue. Les traces `[lecteur]` nomment chaque etape et chaque bascule.
 *
 * ## Ce qui ne change pas
 *
 * **La piece ne quitte pas l'appareil.** Elle est lue depuis le repertoire prive de l'application, la
 * WebView ne va sur aucun reseau, et le partage reste une decision de l'utilisateur. La formulation
 * de PRIVACY.md tient telle quelle.
 */

import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { HEADER_OFFSET } from '../../../shared/ui/ScreenState';
import type { RootStackParamList } from '../../../shared/navigation/StackNavigator';

/** Envoie la piece vers une autre application. Exporte pour le bouton d'en-tete (`StackNavigator`). */
export async function partagerDocument(uri: string): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(uri);
}

/**
 * L'adresse telle que la vue peut la charger.
 *
 * Un nom de piece peut porter des espaces — « Certificat 2026-2027.pdf » — et une adresse `file://`
 * qui en porte un traverse trois convertisseurs dont chacun a sa tolerance. Le garde-fou sur `%`
 * evite le double encodage d'une adresse qui arriverait deja propre.
 */
function adresseChargeable(uri: string): string {
    return uri.includes('%') ? uri : encodeURI(uri);
}

/** Le type MIME d'une piece, ou `null` quand la vue ne saura pas la rendre sur cette plateforme. */
function mimeRendable(nom: string): string | null {
    const extension = nom.slice(nom.lastIndexOf('.') + 1).toLowerCase();
    const images: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    };
    if (images[extension] !== undefined) return images[extension];
    // Le PDF : iOS seulement — le moteur d'Android n'a pas de visionneuse integree.
    return extension === 'pdf' && Platform.OS === 'ios' ? 'application/pdf' : null;
}

/**
 * Le contenu de la piece, lu et verifie.
 *
 * `'illisible'` couvre deux cas qu'un rendu ne distingue pas d'un ecran noir : un fichier **vide**
 * (une ecriture interrompue apres la creation laisse zero octet), et un contenu qui n'a pas la
 * signature de son type — `%PDF` s'encode `JVBERi` en base64. Les refuser ici les rend nommables.
 */
function lireContenu(uri: string, mime: string): string | 'illisible' {
    try {
        const base64 = new File(uri).base64Sync();
        if (base64.length === 0) {
            console.warn('[lecteur] piece vide : zero octet');
            return 'illisible';
        }
        if (mime === 'application/pdf' && !base64.startsWith('JVBERi')) {
            // Le debut du contenu, en clair : c'est ce qui a permis d'identifier le defaut d'ecriture
            // — un « PDF » qui commencait par sa propre base64 reencodee, donc du texte range en 2026.
            console.warn(`[lecteur] signature inattendue : ${base64.slice(0, 12)}… (${base64.length} caracteres)`);
            return 'illisible';
        }
        return base64;
    } catch (erreur) {
        console.warn(`[lecteur] piece illisible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return 'illisible';
    }
}

/**
 * La page de la strategie `inline` : le document en donnee, dans une page que `loadHTMLString` sait
 * rendre — le chemin de l'ecran de carte. Aucun reseau, aucun script.
 */
function pageInline(base64: string, mime: string, fond: string): string {
    const source = `data:${mime};base64,${base64}`;
    const element = mime === 'application/pdf'
        ? `<embed src="${source}" type="application/pdf" />`
        : `<img src="${source}" alt="" />`;

    return `<!DOCTYPE html><html><head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
            html, body { margin: 0; height: 100%; background-color: ${fond}; }
            embed, img { display: block; width: 100%; height: 100%; object-fit: contain; }
        </style>
    </head><body>${element}</body></html>`;
}

export function DocumentViewerScreen({ route }: {
    route: RouteProp<RootStackParamList, 'DocumentViewer'>;
}) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();
    const [chargement, setChargement] = useState(true);
    const [strategie, setStrategie] = useState<'fichier' | 'inline'>('fichier');
    const [contenu, setContenu] = useState<string | 'illisible' | null>(null);
    // Une vue qui echoue a charger retombe sur le partage : mieux vaut la feuille du systeme qu'un
    // cadre vide qui a l'air en panne.
    const [enEchec, setEnEchec] = useState(false);

    const uri = route.params?.uri ?? '';
    const nom = route.params?.nom ?? '';
    const mime = mimeRendable(nom);

    // La lecture est courte (un certificat fait 94 Ko) mais elle reste hors du rendu : un montage ne
    // doit pas lire le disque au milieu d'une transition de navigation.
    useEffect(() => {
        if (uri === '' || mime === null) return;
        setContenu(lireContenu(uri, mime));
    }, [uri, mime]);

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

    if (uri === '' || mime === null || contenu === 'illisible' || enEchec) {
        return (
            <View style={[styles.ecran, { backgroundColor: theme.background }]}>
                {bandeau}
                <View style={styles.repli}>
                    <EmptyState
                        icon="file-eye-outline"
                        title={Translator.get('DOCUMENT_PREVIEW_UNAVAILABLE_TITLE')}
                        message={Translator.get('DOCUMENT_PREVIEW_UNAVAILABLE')}
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

    /**
     * Le verdict du chargement, lu dans l'evenement et non suppose : voir l'en-tete. Une fin de
     * chargement dont l'URL n'est pas la notre est la page vide du natif — on bascule sur `inline`.
     */
    const surFinDeChargement = (url: string) => {
        console.log(`[lecteur] chargement fini : ${url === '' ? '(vide)' : url}`);
        if (strategie === 'fichier' && !url.startsWith('file:')) {
            console.warn('[lecteur] le fichier n\'a pas charge (page vide) : bascule sur le rendu inline');
            setStrategie('inline');
            return;
        }
        setChargement(false);
    };

    const source = strategie === 'fichier'
        ? { uri: adresseChargeable(uri) }
        : { html: contenu === null ? '' : pageInline(contenu, mime, theme.background) };

    return (
        <View style={[styles.ecran, { backgroundColor: theme.background }]}>
            {bandeau}
            <View style={styles.vue}>
                {/* `key` : changer de strategie doit recreer la vue, pas recharger la meme — une
                    WebView qui a charge une page vide garde parfois son etat de navigation. */}
                <WebView
                    key={strategie}
                    source={source}
                    style={{ backgroundColor: theme.background }}
                    // `['*']` comme la carte : une entree qui ne correspond pas fait SORTIR la
                    // navigation vers le systeme au lieu de la rendre. Le contenu est local, il n'y a
                    // rien a proteger.
                    originWhitelist={['*']}
                    allowFileAccess
                    onLoadStart={() => console.log(`[lecteur] chargement commence (${strategie})`)}
                    onLoadEnd={({ nativeEvent }) => surFinDeChargement(nativeEvent.url ?? '')}
                    onError={({ nativeEvent }) => {
                        console.warn(`[lecteur] echec de rendu : ${nativeEvent.description ?? 'sans detail'}`);
                        setEnEchec(true);
                    }}
                    // Le processus web peut mourir en rendant un document : l'evenement existe pour
                    // ca, et il ne passe par aucun des deux precedents.
                    onContentProcessDidTerminate={() => {
                        console.warn('[lecteur] processus web termine : bascule sur le rendu inline');
                        setStrategie('inline');
                    }}
                    showsVerticalScrollIndicator={false}
                />
                {chargement ? (
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

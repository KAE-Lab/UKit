import React from 'react';
import { View, TouchableOpacity, Modal, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Translator from '../../../shared/i18n/Translator';
import { tokens } from '../../../shared/theme/Theme';

interface FloatingActionBarProps {
    theme: import('../../../shared/theme/Theme').AppThemeType;
    insets: import('react-native-safe-area-context').EdgeInsets | null;
    onBack: () => void;
    onForward: () => void;
    onRefresh: () => void;
    openURL: () => void;
    onQuit: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
    loading: boolean;
}

export const FloatingActionBar = ({ theme, insets, onBack, onForward, onRefresh, openURL, onQuit, canGoBack, canGoForward, loading }: FloatingActionBarProps) => {
    const buttonContainerWidth = 290;
    const translateX = useSharedValue(0);

    const context = useSharedValue({ startX: 0 });
    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { startX: translateX.value };
        })
        .onUpdate((e) => {
            let nextX = context.value.startX + e.translationX;
            nextX = Math.max(0, Math.min(nextX, buttonContainerWidth));
            translateX.value = nextX;
        })
        .onEnd((e) => {
            if (e.velocityX > 500 || translateX.value > buttonContainerWidth / 2) {
                translateX.value = withTiming(buttonContainerWidth, { duration: 250 });
            } else {
                translateX.value = withTiming(0, { duration: 250 });
            }
        });

    const toggleOpen = () => {
        if (translateX.value > 0) {
            translateX.value = withTiming(0, { duration: 250 });
        } else {
            translateX.value = withTiming(buttonContainerWidth, { duration: 250 });
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }]
        };
    });

    const chevronStyle = useAnimatedStyle(() => {
        const rotate = (buttonContainerWidth - translateX.value) / buttonContainerWidth * 180;
        return {
            transform: [{ rotate: `${rotate}deg` }]
        };
    });

    interface NavButtonProps {
        onPress: () => void;
        disabled?: boolean;
        iconName: React.ComponentProps<typeof MaterialIcons>['name'] | React.ComponentProps<typeof MaterialCommunityIcons>['name'] | string;
        iconLib?: 'material' | 'community';
        size?: number;
        colorOverride?: string;
    }

    const NavButton = ({ onPress, disabled, iconName, iconLib = 'material', size = 24, colorOverride }: NavButtonProps) => {
        const color = disabled ? theme.primary + '44' : (colorOverride || theme.primary);
        const Icon = iconLib === 'community' ? MaterialCommunityIcons : MaterialIcons;

        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled}
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: tokens.radius.md,
                    justifyContent: 'center',
                    alignItems: 'center',
                    // eslint-disable-next-line ukit/no-style-literals -- 5 : ecart mesure a l'inventaire visuel, hors echelle assume ; la passe 6.1-C ne deplace pas un pixel
                    marginHorizontal: 5,
                    backgroundColor: disabled ? 'transparent' : `${color}15`,
                }}>
                <Icon name={iconName as never} size={size} color={color} />
            </TouchableOpacity>
        );
    };

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[
                styles.floatingBar,
                {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                    bottom: Math.max(tokens.space.sm, (insets?.bottom || 0) - 15)
                },
                animatedStyle
            ]}>
                <TouchableOpacity onPress={toggleOpen} style={styles.handle}>
                    <Animated.View style={chevronStyle}>
                        <MaterialCommunityIcons name="chevron-left" size={28} color={theme.fontSecondary} />
                    </Animated.View>
                </TouchableOpacity>

                <View style={styles.buttonsContainer}>
                    <NavButton onPress={onQuit} iconName="door-open" iconLib="community" size={26} colorOverride={theme.danger} />
                    <NavButton onPress={onBack} disabled={!canGoBack} iconName="navigate-before" size={28} />
                    <NavButton onPress={onForward} disabled={!canGoForward} iconName="navigate-next" size={28} />
                    <NavButton onPress={onRefresh} disabled={loading} iconName="refresh" size={24} />
                    <NavButton onPress={openURL} iconName={Platform.OS === 'ios' ? 'apple-safari' : 'google-chrome'} iconLib="community" size={22} />
                </View>
            </Animated.View>
        </GestureDetector>
    );
};

export const SaveCredentialsModal = ({ theme, visible, onClose, onSave }: { theme: import('../../../shared/theme/Theme').AppThemeType; visible: boolean; onClose: () => void; onSave: () => void; }) => (
    <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
    >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.lg, borderRadius: tokens.radius.lg, width: '85%', alignItems: 'center', ...tokens.shadow.lg }}>
                <MaterialCommunityIcons name="shield-check" size={48} color={theme.primary} style={{ marginBottom: tokens.space.md }} />
                <Text style={{ alignSelf: 'stretch', fontSize: tokens.fontSize.md, color: theme.font, textAlign: 'center', marginBottom: tokens.space.lg }}>
                    {Translator.get('SAVE_CREDENTIALS_PROMPT')}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <TouchableOpacity
                        style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: theme.background, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, borderWidth: 1, borderColor: theme.border }}
                        onPress={onClose}
                    >
                        <Text style={{ color: theme.fontSecondary, fontWeight: 'bold' }}>{Translator.get('NO')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: theme.primary, borderRadius: tokens.radius.md, marginLeft: tokens.space.sm }}
                        onPress={onSave}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{Translator.get('YES')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

/**
 * Ce que le navigateur integre injecte pour franchir les pages d'authentification tout seul.
 *
 * **Ce n'est plus le chemin principal depuis le 2026-08-25.** Les parcours de portail persistent leur
 * session (`options.session.persist`), donc le navigateur s'ouvre normalement deja authentifie et ce
 * script ne voit meme pas ces pages. Il reste pour ce qu'une session ne couvre pas : **un ticket CAS
 * expire**, et **une page de choix d'etablissement**, qui n'est pas une authentification et qu'aucune
 * session ne dispense de remplir.
 *
 * Deux branches, deux pages, et elles ne se ressemblent pas :
 *
 * ## 1. Le formulaire du CAS
 *
 * Deux defauts mesures y ont ete corriges, et aucun ne se voyait a la relecture.
 *
 * **L'hote etait ecrit en dur.** La garde testait `cas.u-bordeaux.fr`, donc le remplissage n'a
 * **jamais** fonctionne pour un etudiant de Bordeaux INP, dont le CAS est `cas.bordeaux-inp.fr`.
 * C'etait le dernier hote bordelais compile dans un ecran, du meme genre que les onze que le jalon
 * 6-G a deterres. La racine vient desormais du **catalogue**.
 *
 * **La detection d'erreur ne discriminait rien, et empechait le remplissage.** Le script cherchait
 * `.alert-danger`, `#msg.errors` et `.errors`. Or la mesure du 2026-08-09 dit deux choses : **il
 * n'existe aucun `#msg`** sur ce CAS, et **`.errors` existe deja vide** sur la page propre. Le
 * troisieme selecteur repondait donc *toujours* — le script concluait « une erreur est affichee »,
 * sautait le remplissage, et posait seulement son ecouteur. Le seul noeud mesure comme discriminant
 * est `#loginErrorsPanel`, celui que les Blueprints emploient depuis 6-F.
 *
 * ## 2. La page WAYF de Shibboleth — « Selection de votre etablissement »
 *
 * Moodle a Bordeaux ne passe pas par le CAS mais par **Shibboleth**, et sa page d'entree est une
 * page de *decouverte* : une liste de **56 etablissements** dans laquelle il faut trouver le sien
 * avant que la moindre authentification commence. Une session persistee n'y change rien — ce n'est
 * pas une connexion, c'est un aiguillage — et c'est pourquoi cette branche existe.
 *
 * Elle **ne tape aucun secret** : elle choisit une entree dans une liste et soumet. Sa garde est
 * donc structurelle plutot que fondee sur l'URL, ce qui la rend portable a un autre WAYF : le select
 * `#userIdPSelection` doit exister **et** contenir exactement l'identite publiee pour cet
 * etablissement. Sans identite publiee, elle ne fait rien — on ne devine pas la fac de quelqu'un
 * dans une liste de 56.
 *
 * Mesure du 2026-08-25 : Bordeaux vaut `https://idp-ubx.u-bordeaux.fr/idp/shibboleth`, l'INP
 * `https://sso.bordeaux-inp.fr/idp/shibboleth`. Le Moodle de l'INP, lui, part droit sur son CAS avec
 * `gateway=true` et n'a donc **pas** de page WAYF : la session persistee suffit.
 */
export const getPortalInjectedScript = (
    savedCredentials: { username?: string; password?: string } | null,
    casRacine: string | null,
    identiteShibboleth: string | null,
) => {
    if ((casRacine === null || casRacine === '') && (identiteShibboleth === null || identiteShibboleth === '')) {
        return '';
    }

    const identifiant = JSON.stringify(savedCredentials?.username || '');
    const secret = JSON.stringify(savedCredentials?.password || '');
    const cas = JSON.stringify(casRacine || '');
    const idp = JSON.stringify(identiteShibboleth || '');

    return `
        (function() {
            const CAS = ${cas};
            const IDP = ${idp};

            /** Interroge la page jusqu'a ce que \`trouver\` rende un noeud, 5 s au plus. */
            function attendre(trouver, agir) {
                let essais = 0;
                const minuteur = setInterval(function() {
                    essais++;
                    if (essais > 50) { clearInterval(minuteur); return; }
                    const cible = trouver();
                    if (cible) { clearInterval(minuteur); agir(cible); }
                }, 100);
            }

            // --- 1. Le formulaire du CAS -------------------------------------------------
            if (CAS !== '' && window.location.href.indexOf(CAS) === 0) {
                attendre(function() {
                    const u = document.getElementById('username');
                    const p = document.getElementById('password');
                    return (u && p && u.closest('form')) ? { u: u, p: p, form: u.closest('form') } : null;
                }, function(champs) {
                    // Le seul noeud mesure comme discriminant : absent de la page propre, present
                    // des que le CAS refuse. Voir docs/sources-externes.md.
                    const refus = document.getElementById('loginErrorsPanel');

                    if (!refus && ${identifiant} !== '') {
                        champs.u.value = ${identifiant};
                        champs.p.value = ${secret};
                        champs.u.dispatchEvent(new Event('input', { bubbles: true }));
                        champs.p.dispatchEvent(new Event('input', { bubbles: true }));
                        // L'INP sert un <button id="submitBtn">, Bordeaux un input[type=submit] : on
                        // accepte les deux plutot qu'un selecteur par etablissement.
                        const envoi = document.querySelector('#submitBtn, input[name="submit"], button[name="submit"], input[type="submit"], button[type="submit"], .btn-submit');
                        if (envoi) { envoi.click(); } else { champs.form.submit(); }
                    } else {
                        champs.form.addEventListener('submit', function() {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'CAS_CREDENTIALS',
                                username: champs.u.value,
                                password: champs.p.value
                            }));
                        });
                    }
                });
                return;
            }

            // --- 2. La page de choix d'etablissement (WAYF Shibboleth) -------------------
            if (IDP === '') return;
            attendre(function() {
                const liste = document.getElementById('userIdPSelection');
                if (!liste) return null;
                // Double garde : l'identite publiee doit **exister** dans cette liste. Sans elle, on
                // n'a pas affaire au WAYF qu'on croit, et soumettre choisirait une fac au hasard.
                for (let i = 0; i < liste.options.length; i++) {
                    if (liste.options[i].value === IDP) return liste;
                }
                return null;
            }, function(liste) {
                liste.value = IDP;
                liste.dispatchEvent(new Event('change', { bubbles: true }));
                // « Se souvenir pour cette session » : sans elle, la page revient a chaque service.
                const memoriser = document.getElementById('rememberForSession');
                if (memoriser && !memoriser.checked) { memoriser.click(); }
                const envoi = document.querySelector('input[name="Select"], input[type="submit"], button[type="submit"]');
                if (envoi) { envoi.click(); }
                else if (liste.form) { liste.form.submit(); }
            });
        })();
        true;
    `;
};

const styles = StyleSheet.create({
    floatingBar: {
        position: 'absolute',
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopLeftRadius: tokens.radius.md,
        borderBottomLeftRadius: tokens.radius.md,
        borderWidth: 1,
        borderRightWidth: 0,
        height: 75,
        elevation: 8,
        // Une ombre ecrite a la main, plus marquee que les tokens (docs/theme.md § limites) ; sa couleur, elle, est la leur.
        shadowColor: tokens.shadow.md.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        paddingLeft: tokens.space.xs,
    },
    handle: {
        paddingHorizontal: tokens.space.xs,
        paddingVertical: tokens.space.sm,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: tokens.space.sm,
        height: '100%',
    }
});

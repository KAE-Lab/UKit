import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * WebView cachée gérant la session Scolarité.
 *
 * mode="cold" : connexion CAS + scraping ENT + mondossierweb + webmel (premier login)
 * mode="hot"  : connexion CAS + webmel uniquement (lancements suivants)
 */

const CAS_HOST = 'cas.u-bordeaux.fr';
const ENT_HOST = 'ent.u-bordeaux.fr';
const INTRANET_HOST = 'intranet.u-bordeaux.fr';
const WEBMEL_HOST = 'webmel.u-bordeaux.fr';
const MONDOSSIERWEB_HOST = 'mondossierweb.u-bordeaux.fr';

// ─── Script de connexion CAS ────────────────────────────────────────────────
const buildCASScript = (username, password) => `
(function() {
    try {
        if (document.querySelector('#msg.success')) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'CAS success page, navigating to ENT' }));
            window.location.href = 'https://${ENT_HOST}';
            return;
        }
        var err = document.querySelector('.alert-danger') || document.querySelector('#msg.errors') || document.querySelector('.errors');
        if (err && err.textContent && err.textContent.trim().length > 0) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGIN_FAILED' }));
            return;
        }
        var u = document.getElementById('username');
        var p = document.getElementById('password');
        var f = document.getElementById('fm1');
        if (!u || !p || !f) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'CAS form not found' }));
            return;
        }
        u.value = ${JSON.stringify(username)};
        p.value = ${JSON.stringify(password)};
        var btn = document.querySelector('input[type="submit"], button[type="submit"], .btn-submit');
        if (btn) { btn.click(); } else { f.submit(); }
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'CAS form submitted' }));
    } catch (e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'CAS error: ' + e.message }));
    }
})();
true;
`;

// ─── Scraping ENT : prénom ───────────────────────────────────────────────────
const ENT_SCRAPE = `
(function() {
    if (!window.location.href.includes('${ENT_HOST}') && !window.location.href.includes('${INTRANET_HOST}')) return;
    var posted = false;

    function extractName() {
        var selectors = [
            '.text-brand.home-title-alt',
            '.home-title-alt',
            '[class*="home-title-alt"]',
            '.home-hero-title .text-brand',
            '[class*="hero-title"] [class*="brand"]',
        ];
        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el) {
                var t = el.textContent.trim().replace(/\\s*!.*$/, '').trim();
                if (t.length > 0 && t.length < 40) return t;
            }
        }
        var body = document.body ? document.body.innerText : '';
        var m = body.match(/(?:Bonjour|Bonsoir)[\\s,]*([A-Za-z\\u00C0-\\u017E][A-Za-z\\u00C0-\\u017E'-]{1,25})\\s*!/);
        if (m && m[1]) return m[1];
        return null;
    }

    function tryPost() {
        if (posted) return false;
        var name = extractName();
        if (name !== null) {
            posted = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ENT_DATA', firstName: name }));
            return true;
        }
        return false;
    }

    if (!tryPost()) {
        var obs = new MutationObserver(function() { if (tryPost()) obs.disconnect(); });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(function() {
            obs.disconnect();
            if (!posted) {
                posted = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ENT_DATA', firstName: '' }));
            }
        }, 18000);
    }
})();
true;
`;

// ─── Scraping mondossierweb : données froides ────────────────────────────────
const DOSSIER_SCRAPE = `
(function() {
    if (!window.location.href.includes('${MONDOSSIERWEB_HOST}')) return;
    var posted = false;

    // Si le hash a été perdu pendant la redirection CAS, le restaurer
    if (!window.location.hash.includes('etatCivilView')) {
        window.location.hash = '!etatCivilView';
    }

    function extractField(id) {
        var el = document.getElementById(id);
        return el ? el.textContent.trim() : null;
    }

    function tryPost() {
        if (posted) return false;
        var studentNumber = extractField('gwt-uid-41');
        var ine = extractField('gwt-uid-43');
        var emailAddress = extractField('gwt-uid-47');
        var dateOfBirth = extractField('gwt-uid-51');
        if (studentNumber && ine && emailAddress && dateOfBirth) {
            posted = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'DOSSIER_DATA',
                studentNumber: studentNumber,
                ine: ine,
                emailAddress: emailAddress,
                dateOfBirth: dateOfBirth,
            }));
            return true;
        }
        return false;
    }

    if (!tryPost()) {
        var obs = new MutationObserver(function() { if (tryPost()) obs.disconnect(); });
        obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        setTimeout(function() {
            obs.disconnect();
            if (!posted) {
                posted = true;
                var sn = extractField('gwt-uid-41') || '';
                var ine = extractField('gwt-uid-43') || '';
                var em = extractField('gwt-uid-47') || '';
                var dob = extractField('gwt-uid-51') || '';
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'Dossier timeout. sn=' + sn + ' ine=' + ine + ' em=' + em + ' dob=' + dob + ' body500=' + (document.body ? document.body.innerText.slice(0, 500) : 'none') }));
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'DOSSIER_DATA',
                    studentNumber: sn,
                    ine: ine,
                    emailAddress: em,
                    dateOfBirth: dob,
                }));
            }
        }, 20000);
    }
})();
true;
`;

// ─── Scraping messagerie : nb de mails non lus ───────────────────────────────
// Version desktop : l'élément "Réception (760)" est dans #zti__main_Mail__2_textCell
const MAIL_SCRAPE = `
(function() {
    if (!window.location.href.includes('${WEBMEL_HOST}')) return;
    var posted = false;

    function findCount() {
        var el = document.getElementById('zti__main_Mail__2_textCell');
        if (el) {
            var t = el.textContent.trim();
            var m = t.match(/\\((\\d+)\\)/);
            if (m) return m[1];
            // Pas de parenthèse = dossier vide ou 0 non lu
            return '0';
        }
        return null;
    }

    function tryPost() {
        if (posted) return false;
        var count = findCount();
        if (count !== null) {
            posted = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAILBOX_DATA', unreadCount: count }));
            return true;
        }
        return false;
    }

    if (!tryPost()) {
        var obs = new MutationObserver(function() { if (tryPost()) obs.disconnect(); });
        obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        setTimeout(function() {
            obs.disconnect();
            if (!posted) {
                posted = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAILBOX_DATA', unreadCount: null }));
            }
        }, 18000);
    }
})();
true;
`;

const ScolariteWebSession = ({ credentials, sessionKey, mode = 'cold', onEvent }) => {
    const webViewRef = useRef(null);
    // phases: login → ent → dossier → mail → done  (cold)
    //         login → mail → done                    (hot)
    const phaseRef = useRef('login');
    const loginReportedRef = useRef(false);

    useEffect(() => {
        phaseRef.current = 'login';
        loginReportedRef.current = false;
    }, [sessionKey]);

    const handleLoadEnd = useCallback((e) => {
        if (!credentials) return;
        const url = e.nativeEvent.url || '';
        console.log('[Scolarite] onLoadEnd url:', url, '| phase:', phaseRef.current, '| mode:', mode);

        if (url.includes(CAS_HOST)) {
            webViewRef.current?.injectJavaScript(buildCASScript(credentials.username, credentials.password));
            return;
        }

        if (url.includes(INTRANET_HOST) || url.includes(ENT_HOST)) {
            if (!loginReportedRef.current) {
                loginReportedRef.current = true;
                onEvent({ type: 'LOGIN_SUCCESS' });
                onEvent({ type: 'PROGRESS', step: 'profile' });
            }
            if (mode === 'hot') {
                // Mode chaud : aller directement au webmel
                if (phaseRef.current === 'login') {
                    phaseRef.current = 'mail';
                    onEvent({ type: 'PROGRESS', step: 'mailbox' });
                    webViewRef.current?.injectJavaScript(`window.location.href = 'https://${WEBMEL_HOST}'; true;`);
                }
                return;
            }
            // Mode froid : scraper le prénom
            if (phaseRef.current === 'login' || phaseRef.current === 'ent') {
                phaseRef.current = 'ent';
                webViewRef.current?.injectJavaScript(ENT_SCRAPE);
            }
            return;
        }

        if (url.includes(MONDOSSIERWEB_HOST)) {
            if (phaseRef.current === 'dossier') {
                onEvent({ type: 'PROGRESS', step: 'dossier' });
                webViewRef.current?.injectJavaScript(DOSSIER_SCRAPE);
            }
            return;
        }

        if (url.includes(WEBMEL_HOST)) {
            if (phaseRef.current === 'mail') {
                webViewRef.current?.injectJavaScript(MAIL_SCRAPE);
            }
        }
    }, [credentials, mode, onEvent]);

    const handleMessage = useCallback((e) => {
        let data;
        try { data = JSON.parse(e.nativeEvent.data); } catch (_) { return; }

        if (data.type === 'ENT_DATA') {
            onEvent(data);
            if (mode === 'cold' && phaseRef.current !== 'dossier' && phaseRef.current !== 'mail' && phaseRef.current !== 'done') {
                phaseRef.current = 'dossier';
                webViewRef.current?.injectJavaScript(`window.location.href = 'https://${MONDOSSIERWEB_HOST}/#!etatCivilView'; true;`);
            }
        } else if (data.type === 'DOSSIER_DATA') {
            onEvent(data);
            if (phaseRef.current !== 'mail' && phaseRef.current !== 'done') {
                phaseRef.current = 'mail';
                onEvent({ type: 'PROGRESS', step: 'mailbox' });
                webViewRef.current?.injectJavaScript(`window.location.href = 'https://${WEBMEL_HOST}'; true;`);
            }
        } else if (data.type === 'MAILBOX_DATA') {
            phaseRef.current = 'done';
            onEvent(data);
        } else {
            onEvent(data);
        }
    }, [mode, onEvent]);

    if (!credentials) return null;

    const { width, height } = Dimensions.get('window');

    return (
        <View
            pointerEvents="none"
            style={{ position: 'absolute', left: -width - 200, top: 0, width, height, opacity: 0 }}
        >
            <WebView
                key={sessionKey}
                ref={webViewRef}
                source={{ uri: `https://${ENT_HOST}` }}
                style={{ width, height }}
                incognito
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                onLoadEnd={handleLoadEnd}
                onMessage={handleMessage}
                onShouldStartLoadWithRequest={() => true}
            />
        </View>
    );
};

export default ScolariteWebSession;

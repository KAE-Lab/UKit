/* eslint-disable max-lines */
import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { InstitutionDomain, INSTITUTION_ENDPOINTS } from '../../Onboarding/services/AuthenticationService';

// ─── Utils ──────────────────────────────────────────────────────────────────
const getEndpoints = (domain: InstitutionDomain) => {
    switch (domain) {
        case 'SCIENCES_TECH':
        case 'DROIT_ECO_GESTION':
        case 'SANTE':
        case 'SCIENCES_HOMME':
        case 'IUT_BORDEAUX':
            return INSTITUTION_ENDPOINTS.U_BORDEAUX;
        case 'BORDEAUX_MONTAIGNE':
            return INSTITUTION_ENDPOINTS.BORDEAUX_MONTAIGNE;
        case 'BORDEAUX_INP':
            return INSTITUTION_ENDPOINTS.BORDEAUX_INP;
        default:
            return INSTITUTION_ENDPOINTS.U_BORDEAUX;
    }
};

// ─── Scripts ─────────────────────────────────────────────────────────────────

const buildCASScript = (username, password, casHost, entHost) => `
(function() {
    function logMsg(msg) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
    }
    try {
        if (document.querySelector('#msg.success')) {
            logMsg({ type: 'DEBUG', message: 'CAS success page, navigating to ENT' });
            window.location.href = 'https://${entHost}';
            return;
        }
        var err = document.querySelector('.alert-danger') || document.querySelector('#msg.errors') || document.querySelector('.errors');
        if (err && err.textContent && err.textContent.trim().length > 0) {
            logMsg({ type: 'LOGIN_FAILED' });
            return;
        }
        var u = document.getElementById('username');
        var p = document.getElementById('password');
        var f = document.getElementById('fm1');
        if (!u || !p || !f) {
            var bodyText = document.body ? document.body.innerText.substring(0, 150).replace(/\\\\n/g, ' ') : 'no body';
            logMsg({ type: 'DEBUG', message: 'CAS form not found. Body: ' + bodyText });
            return;
        }
        u.value = ${JSON.stringify(username)};
        p.value = ${JSON.stringify(password)};
        var btn = document.querySelector('input[type="submit"], button[type="submit"], .btn-submit');
        if (btn) { btn.click(); } else { f.submit(); }
        logMsg({ type: 'DEBUG', message: 'CAS form submitted' });
    } catch (e) {
        logMsg({ type: 'DEBUG', message: 'CAS error: ' + e.message });
    }
})();
true;
`;

// UB ENT Scrape
const buildEntScrapeUB = (entHost, intranetHost) => `
(function() {
    if (!window.location.href.includes('${entHost}') && (!'${intranetHost}' || !window.location.href.includes('${intranetHost}'))) return;
    var posted = false;

    function extractName() {
        var selectors = ['.text-brand.home-title-alt', '.home-title-alt', '[class*="home-title-alt"]', '.home-hero-title .text-brand', '[class*="hero-title"] [class*="brand"]'];
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

// INP ENT Scrape
const buildEntScrapeINP = (entHost) => `
(function() {
    if (!window.location.href.includes('${entHost}')) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ENT_DATA', firstName: '' }));
})();
true;
`;

// UB Dossier Web Scrape
const buildDossierScrapeUB = (dossierHost) => `
(function() {
    if (!window.location.href.includes('${dossierHost}')) return;
    var posted = false;

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
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'DOSSIER_DATA',
                    studentNumber: extractField('gwt-uid-41') || '',
                    ine: extractField('gwt-uid-43') || '',
                    emailAddress: extractField('gwt-uid-47') || '',
                    dateOfBirth: extractField('gwt-uid-51') || '',
                }));
            }
        }, 20000);
    }
})();
true;
`;

// INP Dossier Web Scrape (Vaadin)
const buildDossierScrapeINP = (dossierHost) => `
(function() {
    if (!window.location.href.includes('${dossierHost}')) return;
    
    if (!window._inpScrapeState) {
        window._inpScrapeState = { phase: 'etatcivil', data: {} };
    }
    
    function debug(msg) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: '[Scraper] ' + msg }));
    }
    
    function extractLabel(title) {
        var titles = document.querySelectorAll('label.label-titre');
        for (var i = 0; i < titles.length; i++) {
            if (titles[i].textContent.trim().indexOf(title) !== -1) {
                var parent = titles[i].parentElement;
                if(parent) {
                    var val = parent.querySelector('label.label-valeur');
                    if (val) return val.textContent.trim();
                }
            }
        }
        return null;
    }
    
    function extractStudentNumberFallback() {
        var labels = document.querySelectorAll('label');
        for (var i=0; i<labels.length; i++) {
            if (labels[i].textContent.match(/^\\d{8}$/)) return labels[i].textContent.trim();
        }
        return null;
    }
    
    function extractFromDrawer() {
        var layouts = document.querySelectorAll('vaadin-vertical-layout[slot="drawer"]');
        for (var l = 0; l < layouts.length; l++) {
            var labels = layouts[l].querySelectorAll('label');
            if (labels.length >= 2) {
                return {
                    fullName: labels[0].textContent.trim(),
                    studentNumber: labels[1].textContent.trim()
                };
            }
        }
        return null;
    }

    var obs = new MutationObserver(function() {
        var state = window._inpScrapeState;
        if (state.phase === 'done') return;
        
        if (state.phase === 'etatcivil') {
            if (window.location.href.indexOf('etatcivil') === -1 && window.location.pathname !== '/') {
                var link = document.querySelector('a[href="etatcivil"]');
                if (link) link.click();
                return;
            }
            
            var drawerData = extractFromDrawer();
            var nomComplet = drawerData ? drawerData.fullName : (extractLabel('Nom de famille') || extractLabel('Nom'));
            var prenomExistant = extractLabel('Prénom');
            var dob = extractLabel('Date de naissance') || extractLabel('naissance');
            
            debug('etatcivil - nomComplet: ' + nomComplet + ' | dob: ' + dob + ' | prenomExistant: ' + prenomExistant);
            
            if (nomComplet && dob) {
                var lastName = nomComplet;
                var firstName = prenomExistant || '';
                
                // Si le prénom est vide ou un placeholder comme "-", on essaie de le déduire depuis le nom complet
                if (!firstName || !/[A-Za-z]/.test(firstName)) {
                    var cleanName = nomComplet.replace(/[\\u00A0\\u200B\\u200C\\u200D\\uFEFF]/g, ' ');
                    var parts = cleanName.split(/\\s+/).filter(Boolean);
                    var lastArr = [], firstArr = [];
                    for (var i = 0; i < parts.length; i++) {
                        var p = parts[i];
                        if (p === p.toUpperCase() && /[A-Za-z\\u00C0-\\u017E]/.test(p)) {
                            lastArr.push(p);
                        } else {
                            firstArr.push(p);
                        }
                    }
                    if (lastArr.length > 0 && firstArr.length > 0) {
                        lastName = lastArr.join(' ');
                        firstName = firstArr.join(' ');
                    } else if (parts.length > 1) {
                        // Fallback si la casse n'est pas fiable
                        lastName = parts[0];
                        firstName = parts.slice(1).join(' ');
                    } else {
                        firstName = '';
                    }
                } else if (nomComplet.indexOf(firstName) !== -1 && nomComplet !== firstName) {
                    lastName = nomComplet.replace(firstName, '').trim();
                }
                
                state.data.lastName = lastName;
                state.data.firstName = firstName;
                state.data.dateOfBirth = dob;
                
                state.phase = 'coordonnees';
                var nextLink = document.querySelector('a[href="coordonnees"]');
                if (nextLink) nextLink.click();
            }
        }
        else if (state.phase === 'coordonnees') {
            var emailPerso = extractLabel('personnelle');
            var emailEtab = extractLabel('établissement');
            if (emailPerso || emailEtab) {
                state.data.emailAddress = emailEtab || emailPerso;
                state.phase = 'acces';
                var nextLink = document.querySelector('a[href="acces"]');
                if (nextLink) nextLink.click();
            }
        }
        else if (state.phase === 'acces') {
            var ine = extractLabel('INE');
            if (ine) {
                state.data.ine = ine;
                state.data.studentNumber = state.data.studentNumber || drawerData?.studentNumber || extractStudentNumberFallback() || '';
                state.phase = 'done';
                obs.disconnect();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'DOSSIER_DATA',
                    studentNumber: state.data.studentNumber,
                    ine: state.data.ine,
                    emailAddress: state.data.emailAddress,
                    dateOfBirth: state.data.dateOfBirth,
                    firstName: state.data.firstName,
                    lastName: state.data.lastName
                }));
            }
        }
    });
    
    if (window._inpScrapeState.phase !== 'done') {
        obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        
        setTimeout(function() {
            if (window._inpScrapeState.phase !== 'done') {
                window._inpScrapeState.phase = 'done';
                obs.disconnect();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'DOSSIER_DATA',
                    studentNumber: window._inpScrapeState.data.studentNumber || (extractFromDrawer() ? extractFromDrawer().studentNumber : extractStudentNumberFallback()) || '',
                    ine: window._inpScrapeState.data.ine || '',
                    emailAddress: window._inpScrapeState.data.emailAddress || '',
                    dateOfBirth: window._inpScrapeState.data.dateOfBirth || '',
                    firstName: window._inpScrapeState.data.firstName || '',
                    lastName: window._inpScrapeState.data.lastName || ''
                }));
            }
        }, 20000);
    }
})();
true;
`;

const buildMailScrapeUB = (webmelHost) => `
(function() {
    if (!window.location.href.includes('${webmelHost}')) return;
    var posted = false;

    function findCount() {
        var el = document.getElementById('zti__main_Mail__2_textCell');
        if (el) {
            var t = el.textContent.trim();
            var m = t.match(/\\((\\d+)\\)/);
            if (m) return m[1];
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

// eslint-disable-next-line max-lines-per-function
const ScolariteWebSession = ({ credentials, sessionKey, mode = 'cold', onEvent, domain = 'SCIENCES_TECH' }) => {
    const webViewRef = useRef(null);
    const phaseRef = useRef('login');
    const loginReportedRef = useRef(false);

    const endpoints = getEndpoints(domain as InstitutionDomain);
    const isINP = domain === 'BORDEAUX_INP';

    useEffect(() => {
        phaseRef.current = 'login';
        loginReportedRef.current = false;

        // Sécurité globale: si le scraping complet prend plus de 45 secondes, on force la fin
        const timer = setTimeout(() => {
            if (phaseRef.current !== 'done') {
                console.log('[Scolarite] Global timeout reached, forcing completion.');
                phaseRef.current = 'done';
                // Utiliser une référence ou envoyer l'événement s'il est sûr, ici onEvent peut changer mais le ref de timer s'en occupe
                onEvent({ type: 'MAILBOX_DATA', unreadCount: null });
            }
        }, 45000);

        return () => clearTimeout(timer);
    }, [sessionKey]); // Ne pas dépendre de onEvent ici, sinon la phase est reset à chaque render parent

    const handleCasHost = useCallback(() => {
        webViewRef.current?.injectJavaScript(buildCASScript(credentials.username, credentials.password, endpoints.casHost, endpoints.entHost));
    }, [credentials, endpoints]);

    const handleEntHost = useCallback(() => {
        if (!loginReportedRef.current) {
            loginReportedRef.current = true;
            onEvent({ type: 'LOGIN_SUCCESS' });
            onEvent({ type: 'PROGRESS', step: 'profile' });
        }
        if (mode === 'hot') {
            if (phaseRef.current === 'login') {
                phaseRef.current = 'mail';
                onEvent({ type: 'PROGRESS', step: 'mailbox' });
                if (endpoints.webmel) webViewRef.current?.injectJavaScript(`window.location.href = 'https://${endpoints.webmel}'; true;`);
                else onEvent({ type: 'MAILBOX_DATA', unreadCount: null });
            }
            return;
        }
        if (phaseRef.current === 'login' || phaseRef.current === 'ent') {
            phaseRef.current = 'ent';
            webViewRef.current?.injectJavaScript(isINP ? buildEntScrapeINP(endpoints.entHost) : buildEntScrapeUB(endpoints.entHost, endpoints.intranet));
        }
    }, [mode, onEvent, endpoints, isINP]);

    const handleDossierHost = useCallback(() => {
        if (phaseRef.current === 'dossier') {
            onEvent({ type: 'PROGRESS', step: 'dossier' });
            webViewRef.current?.injectJavaScript(isINP ? buildDossierScrapeINP(endpoints.dossierWeb) : buildDossierScrapeUB(endpoints.dossierWeb));
        }
    }, [onEvent, endpoints, isINP]);

    const handleWebmelHost = useCallback(() => {
        if (phaseRef.current === 'mail') {
            webViewRef.current?.injectJavaScript(buildMailScrapeUB(endpoints.webmel));
        }
    }, [endpoints]);

    const handleLoadEnd = useCallback((e) => {
        if (!credentials) return;
        const url = e.nativeEvent.url || '';
        console.log('[Scolarite] onLoadEnd url:', url, '| phase:', phaseRef.current, '| mode:', mode);

        if (url.includes(endpoints.casHost)) return handleCasHost();
        
        // Auto-consent for Shibboleth SSO pages (like INP webmel)
        if (url.includes('sso.bordeaux-inp.fr') || url.includes('sso.u-bordeaux-montaigne.fr')) {
            webViewRef.current?.injectJavaScript(`
                (function() {
                    var btn = document.querySelector('button[name="_eventId_proceed"], input[name="_eventId_proceed"], input[type="submit"], button[type="submit"]');
                    if (btn) btn.click();
                })();
                true;
            `);
        }

        if ((endpoints.intranet && url.includes(endpoints.intranet)) || url.includes(endpoints.entHost)) return handleEntHost();
        if (endpoints.dossierWeb && url.includes(endpoints.dossierWeb)) return handleDossierHost();
        if (endpoints.webmel && url.includes(endpoints.webmel)) return handleWebmelHost();
    }, [credentials, mode, handleCasHost, handleEntHost, handleDossierHost, handleWebmelHost, endpoints]);

    // eslint-disable-next-line complexity
    const handleMessage = useCallback((e) => {
        let data;
        try { data = JSON.parse(e.nativeEvent.data); } catch (_) { return; }

        if (data.type === 'DEBUG') {
            console.log('[Scolarite] DEBUG:', data.message);
            return;
        }

        if (data.type === 'ENT_DATA') {
            onEvent(data);
            if (mode === 'cold' && phaseRef.current !== 'dossier' && phaseRef.current !== 'mail' && phaseRef.current !== 'done') {
                phaseRef.current = 'dossier';
                if (endpoints.dossierWeb) {
                    webViewRef.current?.injectJavaScript(`window.location.href = 'https://${endpoints.dossierWeb}${!isINP ? '/#!etatCivilView' : '/etatcivil'}'; true;`);
                } else {
                    phaseRef.current = 'mail';
                    onEvent({ type: 'PROGRESS', step: 'mailbox' });
                    if (endpoints.webmel) webViewRef.current?.injectJavaScript(`window.location.href = 'https://${endpoints.webmel}'; true;`);
                }
            }
        } else if (data.type === 'DOSSIER_DATA') {
            onEvent(data);
            if (phaseRef.current !== 'mail' && phaseRef.current !== 'done') {
                phaseRef.current = 'mail';
                onEvent({ type: 'PROGRESS', step: 'mailbox' });
                if (endpoints.webmel) {
                    webViewRef.current?.injectJavaScript(`window.location.href = 'https://${endpoints.webmel}'; true;`);
                } else {
                    phaseRef.current = 'done';
                    onEvent({ type: 'MAILBOX_DATA', unreadCount: null });
                }
            }
        } else if (data.type === 'MAILBOX_DATA') {
            phaseRef.current = 'done';
            onEvent(data);
        } else {
            onEvent(data);
        }
    }, [mode, onEvent, endpoints, isINP]);

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
                source={{ uri: `https://${endpoints.entHost}` }}
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

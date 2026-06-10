import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

import SecureStoreService from '../../../shared/services/SecureStoreService';
import Translator from '../../../shared/i18n/Translator';
import ScolariteWebSession from '../components/ScolariteWebSession';
import { SettingsManager } from '../../../shared/services/AppCore';

/**
 * Contexte central de l'onglet Scolarité.
 *
 * Données froides (coldData) : stockées en SecureStore, scrapées une seule fois.
 *   - firstName, studentNumber, ine, emailAddress, dateOfBirth
 * Données chaudes (mailData) : scrapées à chaque lancement.
 *   - unreadCount
 *
 * mode "cold" : premier login, scraping complet (ENT + mondossierweb + webmel)
 * mode "hot"  : coldData déjà stockée, scraping webmel uniquement
 *
 * scrapeStatus : 'idle' | 'connecting' | 'scraping' | 'done' | 'error'
 * scrapeProgress : 'connecting' | 'profile' | 'dossier' | 'mailbox' | null
 */

const CredentialsContext = createContext(null);

export const useCredentials = () => useContext(CredentialsContext);

const SESSION_TIMEOUT_MS = 60000;

const createEventHandler = ({
    setScrapeStatus,
    validationResolver,
    validationCandidate,
    setCredentials,
    setActiveCreds,
    setScrapeProgress,
    setColdData,
    setMailData
}) => (data) => {
    switch (data.type) {
        case 'LOGIN_SUCCESS': {
            setScrapeStatus('scraping');
            if (validationResolver.current) {
                const candidate = validationCandidate.current;
                SecureStoreService.saveCredentials(candidate.username, candidate.password).then(() => {
                    setCredentials(candidate);
                });
                validationResolver.current({ success: true });
                validationResolver.current = null;
                validationCandidate.current = null;
            }
            break;
        }
        case 'LOGIN_FAILED': {
            setScrapeStatus('error');
            if (validationResolver.current) {
                validationResolver.current({ success: false, error: Translator.get('LOGIN_FAILED') });
                validationResolver.current = null;
                validationCandidate.current = null;
            }
            setActiveCreds(null);
            break;
        }
        case 'PROGRESS':
            setScrapeProgress(data.step);
            break;
        case 'ENT_DATA':
            setColdData((prev) => ({ ...prev, firstName: data.firstName || '' }));
            break;
        case 'DOSSIER_DATA': {
            setColdData((prev) => {
                const merged = {
                    ...prev,
                    studentNumber: data.studentNumber,
                    ine: data.ine,
                    emailAddress: data.emailAddress,
                    dateOfBirth: data.dateOfBirth,
                };
                SecureStoreService.saveColdData(merged);
                return merged;
            });
            break;
        }
        case 'MAILBOX_DATA':
            setMailData({ unreadCount: data.unreadCount });
            setScrapeStatus('done');
            setScrapeProgress(null);
            break;
        case 'DEBUG':
            if (__DEV__) console.log('[Scolarite]', data.message);
            break;
        default:
            break;
    }
};

const useCredentialsSession = () => {
    const [credentials, setCredentials] = useState(null);
    const [credentialsLoaded, setCredentialsLoaded] = useState(false);

    const [activeCreds, setActiveCreds] = useState(null);
    const [sessionKey, setSessionKey] = useState(0);
    const [sessionMode, setSessionMode] = useState('cold');

    const [coldData, setColdData] = useState(null);
    const [mailData, setMailData] = useState(null);
    const [scrapeStatus, setScrapeStatus] = useState('idle');
    const [scrapeProgress, setScrapeProgress] = useState(null);

    const validationResolver = useRef(null);
    const validationCandidate = useRef(null);
    const timeoutRef = useRef(null);

    const startSession = useCallback((creds, mode) => {
        setMailData(null);
        setScrapeStatus('connecting');
        setScrapeProgress('connecting');
        setActiveCreds(creds);
        setSessionMode(mode);
        setSessionKey((k) => k + 1);
    }, []);

    // Chargement initial : credentials + cold data
    useEffect(() => {
        let mounted = true;
        Promise.all([
            SecureStoreService.getCredentials(),
            SecureStoreService.getColdData(),
        ]).then(([creds, cold]) => {
            if (!mounted) return;
            setCredentials(creds);
            setCredentialsLoaded(true);
            if (cold) setColdData(cold);
            if (creds) {
                // Si cold data déjà là → mode hot ; sinon → mode cold
                startSession(creds, cold ? 'hot' : 'cold');
            }
        });
        return () => { mounted = false; };
    }, [startSession]);

    // Garde-fou timeout
    useEffect(() => {
        if (scrapeStatus !== 'connecting' && scrapeStatus !== 'scraping') return;
        timeoutRef.current = setTimeout(() => {
            if (validationResolver.current) {
                validationResolver.current({ success: false, error: Translator.get('LOGIN_NETWORK_ERROR') });
                validationResolver.current = null;
                validationCandidate.current = null;
                setScrapeStatus('error');
            } else {
                setScrapeStatus('done');
            }
        }, SESSION_TIMEOUT_MS);
        return () => clearTimeout(timeoutRef.current);
    }, [scrapeStatus, sessionKey]);

    const handleEvent = useCallback(createEventHandler({
        setScrapeStatus,
        validationResolver,
        validationCandidate,
        setCredentials,
        setActiveCreds,
        setScrapeProgress,
        setColdData,
        setMailData
    }), []);

    const validateAndSave = useCallback((username, password) => {
        return new Promise((resolve) => {
            validationResolver.current = resolve;
            validationCandidate.current = { username, password };
            // Nouveau login → cold data à re-scraper
            setColdData(null);
            startSession({ username, password }, 'cold');
        });
    }, [startSession]);

    const logout = useCallback(async () => {
        await SecureStoreService.deleteCredentials();
        await SecureStoreService.deleteColdData();
        setCredentials(null);
        setActiveCreds(null);
        setColdData(null);
        setMailData(null);
        setScrapeStatus('idle');
        setScrapeProgress(null);
    }, []);

    return {
        credentials, credentialsLoaded, activeCreds, sessionKey, sessionMode,
        coldData, mailData, scrapeStatus, scrapeProgress,
        handleEvent, validateAndSave, logout
    };
};

export const CredentialsProvider = ({ children }) => {
    const {
        credentials, credentialsLoaded, activeCreds, sessionKey, sessionMode,
        coldData, mailData, scrapeStatus, scrapeProgress,
        handleEvent, validateAndSave, logout
    } = useCredentialsSession();

    const [domain, setDomain] = useState(SettingsManager.getCollegeId());

    useEffect(() => {
        SettingsManager.on('collegeId', setDomain);
        return () => SettingsManager.unsubscribe('collegeId', setDomain);
    }, []);

    const value = {
        credentials,
        credentialsLoaded,
        coldData,
        mailData,
        scrapeStatus,
        scrapeProgress,
        sessionMode,
        validateAndSave,
        logout,
    };

    return (
        <CredentialsContext.Provider value={value}>
            {children}
            <ScolariteWebSession
                domain={domain}
                credentials={activeCreds}
                sessionKey={sessionKey}
                mode={sessionMode}
                onEvent={handleEvent}
            />
        </CredentialsContext.Provider>
    );
};

export default CredentialsContext;

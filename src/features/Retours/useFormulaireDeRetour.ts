/**
 * L'etat du formulaire de retour (lot 3 ; docs/phase-8/3-formulaire.md) : la nature, le texte, la
 * branche du campus et du volontariat, les captures, les blocs de contexte retires, l'accord de reponse ;
 * le brouillon qui survit a la fermeture de l'ecran ; et l'envoi, qui passe par la boite d'envoi.
 *
 * L'ecran compose et traduit ; tout ce qui decide vit ici ou dans `shared/retours`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { deposerUnRetour, type IssueDuDepot } from '../../shared/retours';
import { choisirUneImage, oublierLeFichier } from '../../shared/retours/captures';
import { blocsDuContexte, contexteAEnvoyer, type Bloc, type CleDeBloc, type EchecJoint } from '../../shared/retours/contexte';
import type { NatureDeRetour } from '../../shared/retours/donnees';
import { ecrireBrouillon, lireBrouillon } from '../../shared/retours/memoire';
import { lireLesIdees, lireLesSoutiens, type Idee } from '../../shared/retours/idees';
import { lireLesProblemes, lireVotes, type ProblemeConnu } from '../../shared/retours/problemes';
import { sourcesDuContexte } from '../../shared/retours/sources';

export interface ParametresDuFormulaire {
    readonly nature?: NatureDeRetour;
    /** L'onglet d'ou le formulaire s'ouvre, au vocabulaire du formulaire Google. */
    readonly onglet?: string;
    /** L'erreur de la carte d'ou l'on vient : l'hote et la famille, rien d'autre. */
    readonly erreur?: EchecJoint;
    /** La capture de l'ecran, refaite apres une capture detectee. */
    readonly capture?: string;
    /** « Moi aussi, et j'ajoute un detail » : le probleme connu auquel le retour se range. */
    readonly probleme?: { readonly id: string; readonly titre: string };
    /** De meme, l'idee publiee (lot 4). */
    readonly idee?: { readonly id: string; readonly titre: string };
}

export const TEXTE_MAX = 2000;
export const CAPTURES_MAX = 3;
const ADRESSE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ATTENTE_DU_BROUILLON_MS = 500;

interface Saisie {
    readonly nature: NatureDeRetour;
    readonly texte: string;
    readonly campus: string;
    readonly volontaire: boolean;
    readonly contact: string;
}

/**
 * Le brouillon : relu a l'ouverture pour un retour libre — un detail sur un probleme, une capture
 * detectee ou une carte d'erreur ouvrent un autre sujet —, ecrit une fois la frappe posee. `oublier`
 * l'efface a l'envoi, et la frappe qui le precedait ne le recree pas.
 */
function useBrouillon(saisie: Saisie, remplir: (b: Saisie) => void, libre: boolean, natureDemandee: NatureDeRetour | undefined) {
    const pret = useRef(false);
    useEffect(() => {
        if (!libre) return;
        void lireBrouillon().then((b) => {
            if (b !== null && (natureDemandee === undefined || natureDemandee === b.nature)) remplir(b);
            pret.current = true;
        });
    // Une fois, a l'ouverture : les parametres de la route ne changent pas pendant la vie de l'ecran.
    }, []);
    useEffect(() => {
        if (!pret.current) return undefined;
        const minuteur = setTimeout(() => {
            if (!pret.current) return;
            const vide = saisie.texte.trim() === '' && saisie.campus.trim() === '' && saisie.contact.trim() === '';
            void ecrireBrouillon(vide ? null : saisie);
        }, ATTENTE_DU_BROUILLON_MS);
        return () => clearTimeout(minuteur);
    }, [saisie]);
    return useCallback(async () => {
        pret.current = false;
        await ecrireBrouillon(null);
    }, []);
}

export function useFormulaireDeRetour(parametres: ParametresDuFormulaire) {
    const [nature, setNature] = useState<NatureDeRetour>(parametres.nature ?? 'bug');
    const [texte, setTexte] = useState('');
    const [campus, setCampus] = useState('');
    const [volontaire, setVolontaire] = useState(false);
    const [contact, setContact] = useState('');
    const [captures, setCaptures] = useState<string[]>(parametres.capture !== undefined ? [parametres.capture] : []);
    const [blocs, setBlocs] = useState<Bloc[]>([]);
    const [retires, setRetires] = useState<ReadonlySet<CleDeBloc>>(new Set());
    const [reponseIci, setReponseIci] = useState(false);
    const [problemes, setProblemes] = useState<ProblemeConnu[]>([]);
    const [votes, setVotes] = useState<string[]>([]);
    const [idees, setIdees] = useState<Idee[]>([]);
    const [soutiens, setSoutiens] = useState<string[]>([]);
    const [envoi, setEnvoi] = useState(false);
    const [ajout, setAjout] = useState(false);
    const probleme = parametres.probleme ?? null;
    const idee = parametres.idee ?? null;
    // Le detail se range sous un probleme ou une idee : un seul a la fois.
    const rattache = probleme ?? idee;
    const saisie = useMemo(() => ({ nature, texte, campus, volontaire, contact }), [nature, texte, campus, volontaire, contact]);
    const oublierLeBrouillon = useBrouillon(saisie, (b) => {
        setNature(b.nature);
        setTexte(b.texte);
        setCampus(b.campus);
        setVolontaire(b.volontaire);
        setContact(b.contact);
    }, rattache === null && parametres.capture === undefined && parametres.erreur === undefined, parametres.nature);

    // Les captures du cache s'effacent avec l'ecran : envoyees, elles ont ete recopiees dans la boite ;
    // abandonnees, elles ne restent pas sur l'appareil.
    const capturesEnCours = useRef<string[]>([]);
    capturesEnCours.current = captures;
    useEffect(() => () => capturesEnCours.current.forEach(oublierLeFichier), []);

    // Le contexte de l'instant, une fois : il dit ce qui se passait a l'ouverture, pas pendant la saisie.
    useEffect(() => {
        void sourcesDuContexte(parametres.onglet ?? null, parametres.erreur ?? null).then((s) => setBlocs(blocsDuContexte(s)));
        void lireLesProblemes().then(setProblemes);
        void lireVotes().then(setVotes);
        void lireLesIdees().then((lues) => setIdees(lues.filter((i) => i.statut !== 'livree')));
        void lireLesSoutiens().then(setSoutiens);
    // Une fois, a l'ouverture : les parametres de la route ne changent pas pendant la vie de l'ecran.
    }, []);

    const basculerBloc = useCallback((cle: CleDeBloc) => {
        setRetires((avant) => {
            const apres = new Set(avant);
            if (apres.has(cle)) apres.delete(cle); else apres.add(cle);
            return apres;
        });
    }, []);

    const ajouterUneCapture = useCallback(async (): Promise<void> => {
        setAjout(true);
        try {
            const uri = await choisirUneImage();
            if (uri !== null) setCaptures((avant) => [...avant, uri].slice(0, CAPTURES_MAX));
        } finally {
            setAjout(false);
        }
    }, []);

    const retirerUneCapture = useCallback((uri: string) => {
        oublierLeFichier(uri);
        setCaptures((avant) => avant.filter((c) => c !== uri));
    }, []);

    const adresseValide = contact.trim() === '' || ADRESSE.test(contact.trim());
    const pret = useMemo(() => {
        if (nature === 'campus') return campus.trim().length >= 2 && (!volontaire || (contact.trim() !== '' && adresseValide));
        return texte.trim().length >= 3;
    }, [nature, texte, campus, volontaire, contact, adresseValide]);

    const envoyer = useCallback(async (): Promise<IssueDuDepot | null> => {
        if (!pret || envoi) return null;
        setEnvoi(true);
        try {
            const deCampus = nature === 'campus';
            const issue = await deposerUnRetour({
                nature,
                texte: texte.trim().slice(0, TEXTE_MAX),
                campus: deCampus ? campus.trim() : null,
                volontaire: deCampus && volontaire,
                contact: deCampus && volontaire ? contact.trim() : null,
                probleme: probleme?.id ?? null,
                idee: probleme === null ? idee?.id ?? null : null,
                contexte: contexteAEnvoyer(blocs, retires),
                captures: deCampus ? [] : captures,
                reponseIci,
            });
            if (issue.etat !== 'refuse') await oublierLeBrouillon();
            return issue;
        } finally {
            setEnvoi(false);
        }
    }, [pret, envoi, nature, texte, campus, volontaire, contact, probleme, idee, blocs, retires, captures, reponseIci, oublierLeBrouillon]);

    return {
        nature, setNature, texte, setTexte, campus, setCampus, volontaire, setVolontaire, contact, setContact, adresseValide,
        captures, ajouterUneCapture, retirerUneCapture, ajout,
        blocs, retires, basculerBloc, reponseIci, setReponseIci,
        problemes, votes, setVotes, probleme, idees, soutiens, setSoutiens, idee, rattache,
        pret, envoi, envoyer,
    };
}

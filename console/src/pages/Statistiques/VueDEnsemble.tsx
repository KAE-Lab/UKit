/**
 * La vue d'ensemble (7-G) : les sessions, la part de la 6.3 a cote — une courbe qui monte d'abord parce
 * que le parc se met a jour ne dit pas une croissance —, le parc actif, les onglets vus, et ce qui se
 * lit par campus, version et plateforme.
 */

import { useMemo } from 'react';

import { CarteDeGraphique } from '../../composants/stats/CarteDeGraphique';
import { CarteDeListe } from '../../composants/stats/CarteDeListe';
import { Chiffre, ChiffreDeCompte, RangeeDeChiffres } from '../../composants/stats/Chiffres';
import { useParc } from '../../requetes/useParc';
import { erreurDe } from '../../requetes/useMesures';
import { par, parJour, serieAffichee, somme, variation } from '../../stats/agregats';
import { casesDe } from '../../stats/cases';
import { formaterPart } from '../../stats/formats';
import type { Parc } from '../../stats/parc';
import { joursDe } from '../../stats/periode';
import { baseDeComparaison, useLignes, type Choix } from './choix';
import { libelleDe, ONGLETS, PLATEFORMES, useNomDuCampus } from './libelles';

const FICHES = { restaurants: 'resto.ouverture', bibliotheques: 'bu.ouverture', salles: 'salles.ouverture' } as const;
const NOMS_DES_FICHES = { restaurants: 'Restaurants', bibliotheques: 'Bibliothèques', salles: 'Salles libres' };
const VUES_DU_PLANNING = { jour: 'Jour', semaine: 'Semaine' };

function useVue(choix: Choix) {
    const { lignes, lecture } = useLignes(choix);
    const { du, au } = choix.periode;
    const vue = useMemo(() => {
        if (lignes === undefined) return undefined;
        const { courantes, precedentes } = lignes;
        const jours = joursDe({ du, au });
        const sessions = somme(courantes, 'session');
        const onglets = somme(courantes, 'onglet.vu');
        return {
            sessions,
            variationSessions: variation(sessions, somme(precedentes, 'session')),
            onglets,
            variationOnglets: variation(onglets, somme(precedentes, 'onglet.vu')),
            parJour: serieAffichee(jours, parJour(courantes, 'session', jours)),
            parCampus: casesDe(par(courantes, 'session', 'campus')),
            parVersion: casesDe(par(courantes, 'session', 'version')),
            parPlateforme: casesDe(par(courantes, 'session', 'plateforme')),
            parOnglet: casesDe(par(courantes, 'onglet.vu', 'cle')),
            vueDuPlanning: casesDe(new Map([['jour', somme(courantes, 'planning.jour')], ['semaine', somme(courantes, 'planning.semaine')]])),
            fiches: casesDe(new Map(Object.entries(FICHES).map(([cle, evenement]) => [cle, somme(courantes, evenement)]))),
        };
    }, [lignes, du, au]);
    return { vue, lecture };
}

type Vue = ReturnType<typeof useVue>['vue'];

type ErreurDeCarte = ReturnType<typeof erreurDe>;

function Listes({ vue, parc, erreurs }: { readonly vue: Vue; readonly parc: Parc | undefined; readonly erreurs: { readonly mesures: ErreurDeCarte; readonly parc: ErreurDeCarte } }) {
    const nomDuCampus = useNomDuCampus();
    return (
        <div className="grille-stats">
            <CarteDeListe titre="Sessions" erreur={erreurs.mesures} vues={[
                { valeur: 'campus', libelle: 'Campus', cases: vue?.parCampus, colonnes: ['Campus', 'Sessions'], libelleDe: nomDuCampus },
                { valeur: 'version', libelle: 'Versions', cases: vue?.parVersion, colonnes: ['Version', 'Sessions'] },
                { valeur: 'plateforme', libelle: 'Plateformes', cases: vue?.parPlateforme, colonnes: ['Plateforme', 'Sessions'], libelleDe: libelleDe(PLATEFORMES) },
            ]} />
            <CarteDeListe titre="Parc actif" erreur={erreurs.parc} vues={[
                { valeur: 'campus', libelle: 'Campus', cases: parc?.parCampus, colonnes: ['Campus', 'Appareils'], libelleDe: nomDuCampus },
                { valeur: 'version', libelle: 'Versions', cases: parc?.parVersion, colonnes: ['Version', 'Appareils'] },
                { valeur: 'plateforme', libelle: 'Plateformes', cases: parc?.parPlateforme, colonnes: ['Plateforme', 'Appareils'], libelleDe: libelleDe(PLATEFORMES) },
            ]} />
            <CarteDeListe titre="Onglets vus" erreur={erreurs.mesures} vues={[
                { valeur: 'onglets', libelle: 'Onglets', cases: vue?.parOnglet, colonnes: ['Onglet', 'Affichages'], libelleDe: libelleDe(ONGLETS) },
                { valeur: 'planning', libelle: 'Vue du Planning', cases: vue?.vueDuPlanning, colonnes: ['Vue', 'Affichages'], libelleDe: libelleDe(VUES_DU_PLANNING) },
            ]} />
            <CarteDeListe titre="Fiches ouvertes" erreur={erreurs.mesures} vues={[
                { valeur: 'fiches', libelle: 'Fiches', cases: vue?.fiches, colonnes: ['Fiche', 'Ouvertures'], libelleDe: libelleDe(NOMS_DES_FICHES) },
            ]} />
        </div>
    );
}

export function VueDEnsemble({ choix }: { readonly choix: Choix }) {
    const { vue, lecture } = useVue(choix);
    const { parc, erreur: erreurDuParc } = useParc(choix.filtre);
    const base = baseDeComparaison(choix.periode);
    const erreur = erreurDe(lecture);
    // Une lecture en echec : un tiret dans les chiffres cles, l'erreur et « Reessayer » dans les cartes.
    const sessions = erreur === null ? vue?.sessions : null;
    return (
        <div className="pile-stats">
            <RangeeDeChiffres etiquette="Chiffres clés">
                <ChiffreDeCompte libelle="Sessions" n={sessions} variation={vue?.variationSessions} base={base} />
                <Chiffre libelle="Part de la 6.3" valeur={erreurDuParc !== null ? '—' : parc === undefined ? undefined : formaterPart(parc.partMesuree)} detail="du parc actif ; les versions antérieures ne comptent rien" />
                <ChiffreDeCompte libelle="Parc actif" n={erreurDuParc !== null ? null : parc?.total} detail="téléphones à notifications, 14 jours" />
                <ChiffreDeCompte libelle="Onglets vus" n={erreur === null ? vue?.onglets : null} variation={vue?.variationOnglets} base={base} />
            </RangeeDeChiffres>
            <CarteDeGraphique titre="Sessions par jour" points={vue?.parJour} forme="courbe" serie="sessions" erreur={erreur} />
            <Listes vue={vue} parc={parc} erreurs={{ mesures: erreur, parc: erreurDuParc }} />
        </div>
    );
}

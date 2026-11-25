/**
 * La page d'arrivee, sur le modele de Plausible (lot 0 de la phase 8) : une rangee de chiffres cles avec
 * leur variation sur la semaine d'avant, une courbe — les sessions des deux semaines comparees —, le
 * parc en listes a barres, puis les sondes, les retours et les annonces en resume. Chaque bloc charge,
 * echoue et se relit seul.
 *
 * Le parc actif n'a pas de variation : `jetons_push` ne garde que le dernier depot de chaque appareil,
 * le parc d'il y a une semaine ne s'y lit pas (stats/parc.ts). Les sessions portent a cote la part de
 * la 6.3 dans le parc : les versions anterieures ne comptent rien (7-G).
 */

import { Activity } from 'lucide-react';
import { useMemo } from 'react';

import { useCampusChoisi } from '../../composants/campus';
import { CarteDeGraphique } from '../../composants/stats/CarteDeGraphique';
import { ChiffreDeCompte, DetailDeTaux, RangeeDeChiffres } from '../../composants/stats/Chiffres';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { ListeABarres } from '../../composants/stats/ListeABarres';
import { Pastille } from '../../composants/ui/Pastille';
import { erreurDe } from '../../requetes/useMesures';
import { useParc } from '../../requetes/useParc';
import { parJour, serieAffichee, somme, variation } from '../../stats/agregats';
import { entonnoir, tauxDOuverture } from '../../stats/annonces';
import { formaterPart } from '../../stats/formats';
import type { Parc } from '../../stats/parc';
import { derniersJours, joursDe, precedente } from '../../stats/periode';
import { ECHEC } from '../../stats/sources';
import { baseDeComparaison, useLignes } from '../Statistiques/choix';
import { libelleDe, PLATEFORMES, useNomDuCampus } from '../Statistiques/libelles';
import { CarteDesAnnonces, CarteDesRetours } from './Cartes';
import { nombreDePannes, TableDesSondes, useSondes } from './Sondes';

function CarteDesSources() {
    const requete = useSondes();
    const pannes = requete.data === undefined ? null : nombreDePannes(requete.data);
    return (
        <section className="carte">
            <h2>
                <span><Activity className="icone" aria-hidden="true" />Sondes{pannes === null ? null : <> <Pastille ton={pannes > 0 ? 'panne' : 'ok'} point>{pannes > 0 ? `${pannes} en panne` : 'tout répond'}</Pastille></>}</span>
                <a href="#/sources">ouvrir</a>
            </h2>
            <div className="corps"><TableDesSondes /></div>
        </section>
    );
}

/** La semaine du tableau de bord : les sept derniers jours complets, et les sept d'avant. */
function useSemaine(campus: string | null) {
    const semaine = derniersJours(7, new Date());
    const avant = precedente(semaine);
    const { lignes, lecture } = useLignes({ periode: semaine, precedente: avant, filtre: { testeurs: false, campus } });
    const vue = useMemo(() => {
        if (lignes === undefined) return undefined;
        const { courantes, precedentes } = lignes;
        const sessions = somme(courantes, 'session');
        const annonces = entonnoir(courantes);
        const echecs = somme(courantes, ECHEC);
        return {
            sessions, variationSessions: variation(sessions, somme(precedentes, 'session')),
            ouvertures: annonces.ouvertures, tauxDOuverture: tauxDOuverture(annonces), variationOuvertures: variation(annonces.ouvertures, entonnoir(precedentes).ouvertures),
            echecs, variationEchecs: variation(echecs, somme(precedentes, ECHEC)),
            // Chaque semaine se protege contre son propre total : le chiffre cle pour celle-ci, la variation pour l'autre.
            parJour: [{ periode: avant, lignes: precedentes }, { periode: semaine, lignes: courantes }].flatMap(({ periode, lignes: deLaPeriode }) => {
                const jours = joursDe(periode);
                return serieAffichee(jours, parJour(deLaPeriode, 'session', jours));
            }),
        };
    }, [lignes, avant.du, semaine.au]);
    return { vue, lecture, base: baseDeComparaison(semaine) };
}

type Semaine = ReturnType<typeof useSemaine>['vue'];

function ChiffresDeLaSemaine({ vue, parc, base, erreurs }: {
    readonly vue: Semaine;
    readonly parc: Parc | undefined;
    readonly base: string;
    /** Une lecture en echec laisse un tiret ; l'erreur et « Reessayer » sont dans la carte qu'elle remplit. */
    readonly erreurs: { readonly mesures: boolean; readonly parc: boolean };
}) {
    const part = parc?.partMesuree ?? null;
    const mesure = <T,>(valeur: T) => (erreurs.mesures ? null : valeur);
    return (
        <RangeeDeChiffres etiquette="Chiffres clés de la semaine">
            <ChiffreDeCompte libelle="Parc actif" vers="#/statistiques" n={erreurs.parc ? null : parc?.total} detail="téléphones à notifications, 14 jours" />
            <ChiffreDeCompte libelle="Sessions sur 7 jours" vers="#/statistiques" n={mesure(vue?.sessions)} variation={vue?.variationSessions} base={base} detail={part === null ? undefined : `6.3 : ${formaterPart(part)} du parc`} />
            <ChiffreDeCompte
                libelle="Ouvertures d’annonces" vers="#/statistiques/annonces" n={mesure(vue?.ouvertures)} variation={vue?.variationOuvertures} base={base}
                detail={<DetailDeTaux taux={vue?.tauxDOuverture} de="des impressions" denominateur="impressions" />}
            />
            <ChiffreDeCompte libelle="Échecs de source" vers="#/statistiques/sources" n={mesure(vue?.echecs)} variation={vue?.variationEchecs} sens="hausse-mauvaise" base={base} />
        </RangeeDeChiffres>
    );
}

export function TableauDeBord() {
    const campus = useCampusChoisi();
    const { vue, lecture, base } = useSemaine(campus);
    const { parc, erreur: erreurDuParc } = useParc({ campus, testeurs: false });
    const nomDuCampus = useNomDuCampus();
    const erreur = erreurDe(lecture);
    return (
        <>
            <div className="entete-page"><div><h1>Tableau de bord</h1></div></div>
            <div className="pile-stats">
                <ChiffresDeLaSemaine vue={vue} parc={parc} base={base} erreurs={{ mesures: erreur !== null, parc: erreurDuParc !== null }} />
                <CarteDeGraphique titre="Sessions par jour, 14 jours" points={vue?.parJour} forme="courbe" serie="sessions" erreur={erreur} />
                <section className="carte carte-stat">
                    <header className="tete-de-carte"><h2>Parc actif</h2><a href="#/jetons">ouvrir</a></header>
                    {erreurDuParc !== null ? <ErreurDeLecture erreur={erreurDuParc.erreur} reessayer={erreurDuParc.relire} /> : (
                        <div className="listes-du-parc">
                            <ListeABarres cases={parc?.parCampus} colonnes={['Campus', 'Appareils']} libelleDe={nomDuCampus} />
                            <ListeABarres cases={parc?.parVersion} colonnes={['Version', 'Appareils']} />
                            <ListeABarres cases={parc?.parPlateforme} colonnes={['Plateforme', 'Appareils']} libelleDe={libelleDe(PLATEFORMES)} />
                        </div>
                    )}
                </section>
                <div className="bord">
                    <CarteDesSources />
                    <div className="bord-colonne">
                        <CarteDesRetours />
                        <CarteDesAnnonces />
                    </div>
                </div>
            </div>
        </>
    );
}

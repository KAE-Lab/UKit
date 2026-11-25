/**
 * Les annonces (7-G) : l'entonnoir de la periode — impressions, ouvertures, actions, et les deux taux —,
 * pour toutes les annonces ou pour celle qu'on choisit dans le classement ; ses impressions par jour,
 * et la comparaison par campus. Le choix va dans l'adresse (`annonce=`), et mene au rapport partenaire.
 */

import { FileText, X } from 'lucide-react';
import { useMemo } from 'react';

import { CarteDeGraphique } from '../../composants/stats/CarteDeGraphique';
import { ChiffreDeCompte, DetailDeTaux, RangeeDeChiffres } from '../../composants/stats/Chiffres';
import { Bouton } from '../../composants/ui/Bouton';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { parJour, serieAffichee, variation } from '../../stats/agregats';
import { classement, entonnoir, entonnoirParCampus, IMPRESSION, protegerLesLignes, tauxDAction, tauxDOuverture } from '../../stats/annonces';
import { joursDe } from '../../stats/periode';
import { useAnnoncesNommees } from './annonces';
import { baseDeComparaison, lienDeStatistiques, paramsCommuns, poserParams, useLignes, type Choix } from './choix';
import { useNomDuCampus } from './libelles';
import { TableDEntonnoir } from './TableDEntonnoir';

function useVueDesAnnonces(choix: Choix, choisie: string | null) {
    const { lignes, lecture } = useLignes(choix);
    const { du, au } = choix.periode;
    const vue = useMemo(() => {
        if (lignes === undefined) return undefined;
        const garder = (cle: string) => choisie === null || cle === choisie;
        const jours = joursDe({ du, au });
        const courant = entonnoir(lignes.courantes, garder);
        const precedent = entonnoir(lignes.precedentes, garder);
        return {
            courant,
            variations: {
                impressions: variation(courant.impressions, precedent.impressions),
                ouvertures: variation(courant.ouvertures, precedent.ouvertures),
                actions: variation(courant.actions, precedent.actions),
            },
            parJour: serieAffichee(jours, parJour(lignes.courantes, IMPRESSION, jours, (m) => garder(m.cle))),
            // Les petites cases seulement : choisir une annonce redonne ses chiffres exacts (annonces.ts).
            classement: protegerLesLignes(classement(lignes.courantes), { secondaire: false }),
            parCampus: protegerLesLignes([...entonnoirParCampus(lignes.courantes, garder)].map(([cle, e]) => ({ cle, ...e })), { secondaire: false }),
        };
    }, [lignes, choisie, du, au]);
    return { vue, lecture };
}

type Vue = ReturnType<typeof useVueDesAnnonces>['vue'];

function Entonnoir({ vue, base }: { readonly vue: Vue; readonly base: string }) {
    const courant = vue?.courant;
    return (
        <RangeeDeChiffres etiquette="L’entonnoir de la période">
            <ChiffreDeCompte libelle="Impressions" n={courant?.impressions} variation={vue?.variations.impressions} base={base} />
            <ChiffreDeCompte libelle="Ouvertures" n={courant?.ouvertures} variation={vue?.variations.ouvertures} base={base} detail={<DetailDeTaux taux={courant === undefined ? undefined : tauxDOuverture(courant)} de="des impressions" denominateur="impressions" />} />
            <ChiffreDeCompte libelle="Actions" n={courant?.actions} variation={vue?.variations.actions} base={base} detail={<DetailDeTaux taux={courant === undefined ? undefined : tauxDAction(courant)} de="des ouvertures" denominateur="ouvertures" />} />
        </RangeeDeChiffres>
    );
}

function Selection({ choix, choisie, titre, retirer }: { readonly choix: Choix; readonly choisie: string; readonly titre: string; readonly retirer: () => void }) {
    const rapport = new URLSearchParams(paramsCommuns(choix.params));
    rapport.set('annonce', choisie);
    return (
        <div className="selection-stat">
            <span className="secondaire">Annonce</span><strong className="tronque">{titre}</strong>
            <Bouton variante="discret" compact icone={<X className="icone" aria-hidden="true" />} onClick={retirer}>Toutes les annonces</Bouton>
            <a className="bouton tonal compact" href={lienDeStatistiques('rapport', rapport)}><FileText className="icone" aria-hidden="true" />Rapport partenaire</a>
        </div>
    );
}

export function Annonces({ choix }: { readonly choix: Choix }) {
    const choisie = choix.params.get('annonce');
    const { vue, lecture } = useVueDesAnnonces(choix, choisie);
    const { titreDe } = useAnnoncesNommees();
    const nomDuCampus = useNomDuCampus();
    const choisir = (cle: string) => poserParams(choix, (params) => { if (cle === choisie) params.delete('annonce'); else params.set('annonce', cle); });
    if (lecture.enErreur) return <div className="carte"><ErreurDeLecture erreur={lecture.erreur} reessayer={lecture.relire} enCours={lecture.enCours} /></div>;
    return (
        <div className="pile-stats">
            {choisie === null ? null : <Selection choix={choix} choisie={choisie} titre={titreDe(choisie)} retirer={() => choisir(choisie)} />}
            <Entonnoir vue={vue} base={baseDeComparaison(choix.periode)} />
            <CarteDeGraphique titre="Impressions par jour" points={vue?.parJour} forme="colonnes" serie="impressions" />
            <section className="carte carte-stat">
                <header className="tete-de-carte"><h2>Classement des annonces</h2></header>
                <TableDEntonnoir
                    premiereColonne="Annonce"
                    lignes={vue?.classement.map((a) => ({ cle: a.cle, libelle: titreDe(a.cle), affiche: a.affiche }))}
                    choisie={choisie}
                    choisir={choisir}
                    vide="Aucune annonce vue sur la période."
                />
            </section>
            <section className="carte carte-stat">
                <header className="tete-de-carte"><h2>Par campus</h2></header>
                <TableDEntonnoir premiereColonne="Campus" lignes={vue?.parCampus.map((c) => ({ cle: c.cle, libelle: nomDuCampus(c.cle), affiche: c.affiche }))} vide="Rien sur la période." />
            </section>
        </div>
    );
}

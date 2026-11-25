/**
 * Les echecs de source que l'application mesure (`source.echec`) : par jour, par hote, par famille.
 * La page Sources de la console en montre la semaine, a cote des sondes ; la page Sources des
 * statistiques, la periode choisie. Un hote se choisit (`hote=`) : la courbe et les familles le suivent.
 */

import { useMemo } from 'react';

import { CarteDeGraphique } from '../../composants/stats/CarteDeGraphique';
import { CarteDeListe } from '../../composants/stats/CarteDeListe';
import { parJour, serieAffichee, somme, variation } from '../../stats/agregats';
import { casesDe } from '../../stats/cases';
import { joursDe, precedente, type Periode } from '../../stats/periode';
import { dHote, ECHEC, echecsPar, FAMILLES } from '../../stats/sources';
import { erreurDe, type LectureDeMesures } from '../../requetes/useMesures';
import type { Lignes } from './choix';

export function useEchecs(lignes: Lignes | undefined, periode: Periode, hote: string | null) {
    const { du, au } = periode;
    return useMemo(() => {
        if (lignes === undefined) return undefined;
        const jours = joursDe({ du, au });
        const garder = dHote(hote);
        const total = somme(lignes.courantes.filter(garder), ECHEC);
        return {
            total,
            variation: variation(total, somme(lignes.precedentes.filter(garder), ECHEC), precedente({ du, au })),
            parJour: serieAffichee(jours, parJour(lignes.courantes, ECHEC, jours, garder)),
            parHote: casesDe(echecsPar(lignes.courantes, 'hote')),
            parFamille: casesDe(echecsPar(lignes.courantes, 'famille', hote)),
        };
    }, [lignes, du, au, hote]);
}

function libelleDeFamille(famille: string) {
    const dite = FAMILLES[famille];
    return dite === undefined ? <code>{famille}</code> : <>{dite} <code className="secondaire">{famille}</code></>;
}

export function CartesDesEchecs({ echecs, lecture, hote, choisirHote, titre }: {
    readonly echecs: ReturnType<typeof useEchecs>;
    readonly lecture: LectureDeMesures;
    readonly hote: string | null;
    readonly choisirHote?: (hote: string) => void;
    readonly titre: string;
}) {
    const erreur = erreurDe(lecture);
    return (
        <>
            <CarteDeGraphique titre={hote === null ? titre : <>{titre}, <code>{hote}</code></>} points={echecs?.parJour} forme="colonnes" serie="échecs" erreur={erreur} />
            <div className="grille-stats">
                <CarteDeListe titre="Par hôte" erreur={erreur} vues={[{ valeur: 'hote', libelle: 'Hôte', cases: echecs?.parHote, colonnes: ['Hôte', 'Échecs'], libelleDe: (h) => <code>{h}</code>, choisie: hote, choisir: choisirHote, vide: 'Aucun échec sur la période.' }]} />
                <CarteDeListe titre={hote === null ? 'Par famille' : 'Par famille, pour cet hôte'} erreur={erreur} vues={[{ valeur: 'famille', libelle: 'Famille', cases: echecs?.parFamille, colonnes: ['Famille', 'Échecs'], libelleDe: libelleDeFamille, vide: 'Aucun échec sur la période.' }]} />
            </div>
        </>
    );
}

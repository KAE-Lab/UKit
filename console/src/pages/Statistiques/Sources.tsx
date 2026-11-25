/**
 * Les sources, cote pilotage (7-G) : les echecs que l'application a comptes, et les connexions
 * universitaires, poses contre l'etat des sondes du matin. Une connexion refusee ne dit pas si le mot
 * de passe etait faux ou le portail muet : c'est ici qu'elle se lit a cote des sondes.
 */

import { useMemo } from 'react';

import { Chiffre, ChiffreDeCompte, DetailDeTaux, RangeeDeChiffres } from '../../composants/stats/Chiffres';
import { erreurDe } from '../../requetes/useMesures';
import { somme, variation } from '../../stats/agregats';
import { tauxAffiche } from '../../stats/annonces';
import { proteger } from '../../stats/cases';
import type { Periode } from '../../stats/periode';
import { CONNEXION } from '../../stats/sources';
import { nombreDePannes, TableDesSondes, useSondes } from '../TableauDeBord/Sondes';
import { baseDeComparaison, poserParams, useLignes, type Choix, type Lignes } from './choix';
import { CartesDesEchecs, useEchecs } from './Echecs';

function useConnexions(lignes: Lignes | undefined, avant: Periode) {
    return useMemo(() => {
        if (lignes === undefined) return undefined;
        const ok = somme(lignes.courantes, CONNEXION, 'ok');
        const refusees = somme(lignes.courantes, CONNEXION, 'echec');
        // La part des refus se lit avec les deux comptes : elle ne se dit que s'ils s'affichent tous les deux.
        const [okAffiche = null, refuseesAffiche = null] = proteger([ok, refusees]);
        const tentatives = typeof okAffiche === 'number' && typeof refuseesAffiche === 'number' ? ok + refusees : null;
        return {
            ok, refusees, partDesRefus: tauxAffiche(refuseesAffiche, tentatives),
            variationOk: variation(ok, somme(lignes.precedentes, CONNEXION, 'ok'), avant),
            variationRefusees: variation(refusees, somme(lignes.precedentes, CONNEXION, 'echec'), avant),
        };
    }, [lignes, avant.du]);
}

export function Sources({ choix }: { readonly choix: Choix }) {
    const { lignes, lecture } = useLignes(choix);
    const sondes = useSondes();
    const hote = choix.params.get('hote');
    const echecs = useEchecs(lignes, choix.periode, hote);
    const connexions = useConnexions(lignes, choix.precedente);
    const base = baseDeComparaison(choix.periode);
    const enErreur = erreurDe(lecture) !== null;
    const pannes = sondes.data === undefined ? undefined : nombreDePannes(sondes.data);
    const choisirHote = (h: string) => poserParams(choix, (params) => { if (h === hote) params.delete('hote'); else params.set('hote', h); });

    return (
        <div className="pile-stats">
            <RangeeDeChiffres etiquette="Chiffres clés des sources">
                <ChiffreDeCompte libelle="Échecs de source" n={enErreur ? null : echecs?.total} variation={echecs?.variation} sens="hausse-mauvaise" base={base} />
                <ChiffreDeCompte libelle="Connexions abouties" n={enErreur ? null : connexions?.ok} variation={connexions?.variationOk} base={base} />
                <ChiffreDeCompte
                    libelle="Connexions refusées" n={enErreur ? null : connexions?.refusees} variation={connexions?.variationRefusees} sens="hausse-mauvaise" base={base}
                    detail={<DetailDeTaux taux={connexions?.partDesRefus} de="des tentatives" denominateur="tentatives" />}
                />
                <Chiffre libelle="Sondes en panne" valeur={pannes === undefined ? undefined : String(pannes)} detail="au dernier passage du matin" />
            </RangeeDeChiffres>
            <CartesDesEchecs echecs={echecs} lecture={lecture} hote={hote} choisirHote={choisirHote} titre="Échecs par jour" />
            <section className="carte carte-stat">
                <header className="tete-de-carte"><h2>Les sondes du matin</h2><a href="#/sources">ouvrir</a></header>
                <TableDesSondes />
            </section>
        </div>
    );
}

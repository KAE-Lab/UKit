/**
 * La page Retours : les retours ouverts par defaut — c'est la question qu'on se pose en ouvrant la
 * page —, des compteurs par etat, nature, campus et semaine, des filtres sur les memes axes, la
 * recherche sur le texte, et une fiche par retour.
 */

import { useMemo } from 'react';

import { BandeauDeDroits } from '../../composants/BandeauDeDroits';
import { ListeDeRessource } from '../../composants/liste/ListeDeRessource';
import { etatDepuisParams, paramsDepuisEtat, type Defauts } from '../../composants/liste/etatUrl';
import { Encart } from '../../composants/ui/Encart';
import { SANS_FILTRE, useTout } from '../../requetes/useListe';
import { ETATS_OUVERTS, RETOURS } from '../../schema/tables/retours';
import { naviguer, useRoute } from '../../routeur';
import { BlocDeCompteurs } from './Compteurs';
import { compteurs, type RetourLeger } from './compteurs';
import { FicheDeRetour } from './Fiche';

const COLONNES_LEGERES = 'id,recu_le,nature,etat,campus';
const DEFAUTS: Defauts = { etat: ETATS_OUVERTS };
const FILTRES = [...(RETOURS.filtres ?? []), 'campus'];
const OPTIONS_EN_PLUS = { etat: [{ valeur: `liste:${ETATS_OUVERTS.join(',')}`, libelle: 'Ouverts' }] };

export function Retours({ reste }: { readonly reste: string | null }) {
    const { params } = useRoute();
    const requete = useTout('retours', COLONNES_LEGERES, SANS_FILTRE);
    const calcules = useMemo(() => (requete.data === undefined ? null : compteurs(requete.data as unknown as readonly RetourLeger[], new Date(), ETATS_OUVERTS)), [requete.data]);
    const optionsDeCampus = (calcules?.parCampus ?? []).map((c) => ({ valeur: c.campus, libelle: c.campus }));

    const etat = etatDepuisParams(params, FILTRES, DEFAUTS);
    const filtreEtat = etat.columnFilters.find((f) => f.id === 'etat')?.value;
    const poserEtat = (etats: readonly string[] | null) => {
        const autres = etat.columnFilters.filter((f) => f.id !== 'etat');
        const suivant = { ...etat, columnFilters: etats === null ? autres : [...autres, { id: 'etat', value: etats }], pagination: { ...etat.pagination, pageIndex: 0 } };
        naviguer('/retours', paramsDepuisEtat(suivant, FILTRES, DEFAUTS), { remplacer: true });
    };

    return (
        <>
            <div className="entete-page">
                <div><h1>Retours</h1><p className="sous-titre">{RETOURS.description}</p></div>
            </div>
            <BandeauDeDroits table="retours" />
            {reste !== null ? <FicheDeRetour id={reste} retour={() => naviguer('/retours', params)} /> : (
                <>
                    <div className="carte">
                        <BlocDeCompteurs compteurs={calcules} filtreEtat={Array.isArray(filtreEtat) ? filtreEtat : (typeof filtreEtat === 'string' ? [filtreEtat] : null)} poserEtat={poserEtat} />
                        {requete.isError ? <Encart ton="erreur">Les compteurs n’ont pas pu être lus ; la liste, elle, se relit seule.</Encart> : null}
                    </div>
                    <div className="carte compacte" style={{ marginBottom: 'var(--espace-md)' }}><Encart ton="avert">{RETOURS.avertissement}</Encart></div>
                    <div className="carte">
                        <ListeDeRessource
                            descripteur={RETOURS}
                            defauts={DEFAUTS}
                            complements={[{ id: 'campus', libelle: 'Campus demandé', options: optionsDeCampus }]}
                            optionsEnPlus={OPTIONS_EN_PLUS}
                            lienDe={(ligne) => `/retours/${String(ligne.id)}${params.size > 0 ? `?${params.toString()}` : ''}`}
                        />
                    </div>
                </>
            )}
        </>
    );
}

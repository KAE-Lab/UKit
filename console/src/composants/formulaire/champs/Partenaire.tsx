/**
 * Le partenaire d'une annonce : son nom, son logo televerse, son lien. Propose pour les cartes de
 * type partenaire ou bon plan ; sur un autre type, le champ reste saisissable mais le dit, parce que
 * la carte ne le rendra pas.
 */

import { Upload, X } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';

import { messageDErreur } from '../../../lib/erreurs';
import { lirePartenaire, type PartenaireSaisi } from '../../../schema/schemas';
import { Bouton } from '../../ui/Bouton';
import type { ChampProps } from './types';

const TYPES_AVEC_PARTENAIRE: readonly string[] = ['partenaire', 'bon_plan'];

export function ChampPartenaire({ champ, id, saisie, onChange, ligne, desactive }: ChampProps) {
    const [enCours, setEnCours] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const partenaire = lirePartenaire(saisie);
    const dossier = champ.type.type === 'partenaire' ? champ.type.dossier : 'partenaires';
    const poser = (partiel: Partial<PartenaireSaisi>) => onChange({ ...partenaire, ...partiel });
    const horsType = !TYPES_AVEC_PARTENAIRE.includes(String(ligne.type ?? ''));

    const televerserLogo = async (evenement: ChangeEvent<HTMLInputElement>) => {
        const fichier = evenement.target.files?.[0];
        evenement.target.value = '';
        if (fichier === undefined) return;
        setEnCours(true);
        setErreur(null);
        try {
            const { televerser } = await import('../../../lib/televerser');
            poser({ logo_url: (await televerser(dossier, fichier)).url });
        } catch (echec) {
            setErreur(messageDErreur(echec));
        } finally {
            setEnCours(false);
        }
    };

    return (
        <div className="partenaire">
            {horsType ? <span className="petit secondaire">Rendu par la carte pour les types « partenaire » et « bon plan » seulement.</span> : null}
            <div className="partenaire-champs">
                <label className="sous-champ">Nom
                    <input id={id} type="text" value={partenaire.nom} disabled={desactive} onChange={(e) => poser({ nom: e.target.value })} />
                </label>
                <label className="sous-champ">Lien
                    <input type="text" inputMode="url" value={partenaire.lien} placeholder="https://" disabled={desactive} onChange={(e) => poser({ lien: e.target.value })} />
                </label>
            </div>
            <div className="partenaire-logo">
                <div className="cadre">{partenaire.logo_url !== '' ? <img src={partenaire.logo_url} alt="" /> : <span className="petit secondaire">Logo</span>}</div>
                <div className="boutons">
                    <label className={`bouton tonal compact ${desactive || enCours ? 'attente' : ''}`} htmlFor={`${id}-logo`}>
                        <span className="contenu-bouton"><Upload className="icone" aria-hidden="true" />{enCours ? 'Téléversement…' : 'Téléverser le logo'}</span>
                        <input id={`${id}-logo`} type="file" accept="image/*" hidden disabled={desactive || enCours} onChange={(evenement) => { void televerserLogo(evenement); }} />
                    </label>
                    <Bouton variante="discret" compact disabled={desactive || partenaire.logo_url === ''} onClick={() => poser({ logo_url: '' })} icone={<X className="icone" aria-hidden="true" />}>Retirer</Bouton>
                </div>
                {erreur !== null ? <span className="erreur" role="alert">{erreur}</span> : null}
            </div>
        </div>
    );
}

/**
 * Un champ du formulaire, selon son type. Le formulaire ne connait aucun type : il delegue ici.
 */

import { useId, useState, type ChangeEvent } from 'react';

import type { Ligne } from '../supabase';
import { messageDErreur, type EtablissementConnu } from '../lib/base';
import { televerser } from '../lib/televerser';
import { versionDeUrl } from '../lib/versionnerUrl';
import type { Champ } from '../schema/descripteurs';
import type { Saisie } from '../schema/conversion';
import { Bouton } from './Bouton';

export interface ChampEditeurProps {
    readonly champ: Champ;
    readonly saisie: Saisie;
    readonly onChange: (saisie: Saisie) => void;
    /** La ligne en cours de saisie, pour ce qui depend d'un autre champ (le dossier d'une image). */
    readonly ligne: Ligne;
    readonly etablissements: readonly EtablissementConnu[];
    readonly erreur?: string;
    readonly desactive?: boolean;
}

function ChampImage({ champ, saisie, onChange, ligne, desactive }: ChampEditeurProps) {
    const [enCours, setEnCours] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const adresse = typeof saisie === 'string' ? saisie : '';
    const dossier = champ.type.type === 'image' ? (typeof champ.type.dossier === 'function' ? champ.type.dossier(ligne) : champ.type.dossier) : 'media';

    const choisir = async (evenement: ChangeEvent<HTMLInputElement>) => {
        const fichier = evenement.target.files?.[0];
        if (fichier === undefined) return;
        setEnCours(true);
        setErreur(null);
        try {
            onChange(await televerser(dossier, fichier, adresse === '' ? null : adresse));
        } catch (echec) {
            setErreur(messageDErreur(echec));
        } finally {
            setEnCours(false);
            evenement.target.value = '';
        }
    };

    return (
        <div className="formulaire">
            <div className="apercu-image">
                {adresse !== '' ? <img src={adresse} alt="" /> : <div className="vignette" />}
                <div>
                    <div className="adresse">{adresse === '' ? (champ.videEstValeur === true ? 'Aucune image (la chaine vide)' : 'Aucune adresse') : adresse}</div>
                    {adresse !== '' ? <div className="petit secondaire">version {versionDeUrl(adresse) || 'sans parametre'} — dossier {dossier}</div> : null}
                </div>
            </div>
            <div className="boutons">
                <label className={`bouton tonal ${desactive === true || enCours ? 'desactive' : ''}`}>
                    {enCours ? 'Televersement…' : 'Televerser une image'}
                    <input type="file" accept="image/*" hidden disabled={desactive === true || enCours} onChange={(evenement) => { void choisir(evenement); }} />
                </label>
                <Bouton variante="discret" disabled={desactive === true || adresse === ''} onClick={() => onChange('')}>Retirer</Bouton>
            </div>
            {erreur !== null ? <span className="erreur">{erreur}</span> : null}
        </div>
    );
}

function ChampEtablissements({ saisie, onChange, etablissements, desactive }: ChampEditeurProps) {
    const coches = Array.isArray(saisie) ? saisie : [];
    const basculer = (code: string) => onChange(coches.includes(code) ? coches.filter((c) => c !== code) : [...coches, code]);
    if (etablissements.length === 0) return <span className="secondaire">Le catalogue ne repond pas ; le ciblage par campus est indisponible.</span>;
    return (
        <div className="ligne-cases">
            {etablissements.map((etablissement) => (
                <label key={etablissement.code} className="case">
                    <input type="checkbox" checked={coches.includes(etablissement.code)} disabled={desactive} onChange={() => basculer(etablissement.code)} />
                    {etablissement.nom} <span className="secondaire petit">({etablissement.code})</span>
                </label>
            ))}
        </div>
    );
}

function Saisisseur(props: ChampEditeurProps & { readonly id: string }) {
    const { champ, saisie, onChange, id, desactive } = props;
    const texte = typeof saisie === 'string' ? saisie : '';
    switch (champ.type.type) {
        case 'booleen':
            return <label className="case"><input id={id} type="checkbox" checked={saisie === true} disabled={desactive} onChange={(e) => onChange(e.target.checked)} /> {champ.libelle}</label>;
        case 'zone':
            return <textarea id={id} className={champ.type.code === true ? 'code' : undefined} value={texte} disabled={desactive} onChange={(e) => onChange(e.target.value)} />;
        case 'json':
            return <textarea id={id} className="code" value={texte} disabled={desactive} spellCheck={false} onChange={(e) => onChange(e.target.value)} />;
        case 'choix':
            return (
                <select id={id} value={texte} disabled={desactive} onChange={(e) => onChange(e.target.value)}>
                    {champ.obligatoire === true ? null : <option value="">—</option>}
                    {champ.type.options.map((option) => <option key={option.valeur} value={option.valeur}>{option.libelle}</option>)}
                </select>
            );
        case 'date':
            return <input id={id} type="datetime-local" value={texte} disabled={desactive} onChange={(e) => onChange(e.target.value)} />;
        case 'nombre':
            return <input id={id} type="number" step="any" value={texte} disabled={desactive} onChange={(e) => onChange(e.target.value)} />;
        case 'image':
            return <ChampImage {...props} />;
        case 'etablissements':
            return <ChampEtablissements {...props} />;
        default:
            return <input id={id} type="text" value={texte} disabled={desactive} spellCheck={champ.type.type === 'texte'} onChange={(e) => onChange(e.target.value)} />;
    }
}

export function ChampEditeur(props: ChampEditeurProps) {
    const id = useId();
    const { champ, erreur } = props;
    const libelleAPart = champ.type.type !== 'booleen';
    return (
        <div className="champ">
            {libelleAPart ? <label htmlFor={id}>{champ.libelle}{champ.obligatoire === true ? ' *' : ''}</label> : null}
            <Saisisseur {...props} id={id} />
            {champ.aide !== undefined ? <span className="aide">{champ.aide}</span> : null}
            {erreur !== undefined ? <span className="erreur">{erreur}</span> : null}
        </div>
    );
}

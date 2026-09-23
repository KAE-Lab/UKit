/**
 * Le champ d'une image : l'apercu au ratio reel, le televersement (compresse, nomme, blurhash), le
 * retrait. Le blurhash se pose dans la colonne soeur que le descripteur nomme, s'il y en a une.
 */

import { Image as IconeImage, Upload, X } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';

import { messageDErreur } from '../../../lib/erreurs';
import { nomDeFichierDAdresse } from '../../../lib/nommage';
import { Bouton } from '../../ui/Bouton';
import type { Ligne } from '../../../supabase';
import type { ChampProps } from './types';

const KO = 1024;

function bilan(octets: number, blurhash: string | null): string {
    return `Téléversé : ${Math.round(octets / KO)} Ko${blurhash === null ? '' : ', blurhash calculé'}.`;
}

/** Le fichier, pas l'adresse entiere : elle faisait trois lignes de bruit ; elle reste en infobulle. */
function libelleDAdresse(adresse: string, videEstValeur: boolean): string {
    if (adresse !== '') return nomDeFichierDAdresse(adresse);
    return videEstValeur ? 'Aucune image (la chaîne vide)' : 'Aucune adresse';
}

function dossierDe(type: { readonly dossier: string | ((ligne: Ligne) => string) } | null, ligne: Ligne): string {
    if (type === null) return 'media';
    return typeof type.dossier === 'function' ? type.dossier(ligne) : type.dossier;
}

export function ChampImage({ champ, id, saisie, onChange, poserAutre, ligne, desactive }: ChampProps) {
    const [enCours, setEnCours] = useState(false);
    const [retour, setRetour] = useState<{ readonly ton: 'ok' | 'erreur'; readonly texte: string } | null>(null);
    const adresse = typeof saisie === 'string' ? saisie : '';
    const type = champ.type.type === 'image' ? champ.type : null;
    const dossier = dossierDe(type, ligne);

    const choisir = async (evenement: ChangeEvent<HTMLInputElement>) => {
        const fichier = evenement.target.files?.[0];
        evenement.target.value = '';
        if (fichier === undefined) return;
        setEnCours(true);
        setRetour(null);
        try {
            // Charge a la demande : la compression et le blurhash pesent, et un editeur qui ne televerse rien n'a pas a les attendre.
            const { televerser } = await import('../../../lib/televerser');
            const resultat = await televerser(dossier, fichier);
            onChange(resultat.url);
            if (type?.blurhash !== undefined) poserAutre(type.blurhash, resultat.blurhash ?? '');
            setRetour({ ton: 'ok', texte: bilan(resultat.octets, resultat.blurhash) });
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        } finally {
            setEnCours(false);
        }
    };

    const retirer = () => {
        onChange('');
        if (type?.blurhash !== undefined) poserAutre(type.blurhash, '');
    };

    return (
        <div className="apercu-image">
            <div className="cadre">{adresse !== '' ? <img src={adresse} alt="" /> : <IconeImage className="icone" aria-hidden="true" />}</div>
            <div className="details">
                <div className="adresse" title={adresse === '' ? undefined : adresse}>{libelleDAdresse(adresse, champ.videEstValeur === true)}</div>
                <div className="petit secondaire">dossier {dossier} — réduite et compressée avant l’envoi, cache d’un an</div>
                <div className="boutons">
                    <label className={`bouton tonal ${desactive || enCours ? 'attente' : ''}`} htmlFor={id}>
                        <span className="contenu-bouton"><Upload className="icone" aria-hidden="true" />{enCours ? 'Téléversement…' : 'Téléverser une image'}</span>
                        <input id={id} type="file" accept="image/*" hidden disabled={desactive || enCours} onChange={(evenement) => { void choisir(evenement); }} />
                    </label>
                    <Bouton variante="discret" disabled={desactive || adresse === ''} onClick={retirer} icone={<X className="icone" aria-hidden="true" />}>Retirer</Bouton>
                </div>
                {retour !== null ? <span className={retour.ton === 'erreur' ? 'erreur' : 'petit secondaire'} role={retour.ton === 'erreur' ? 'alert' : 'status'}>{retour.texte}</span> : null}
            </div>
        </div>
    );
}

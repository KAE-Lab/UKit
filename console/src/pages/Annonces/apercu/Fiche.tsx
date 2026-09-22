/**
 * La fiche d'une annonce, en HTML : le visuel au ratio de l'image, borne entre 3:4 et 16:9 ; le
 * heros — le filigrane, le kicker, le titre, le chapeau — ; la description par la grammaire
 * partagee ; la galerie dans le meme cadre ; la place de la carte « S'y rendre » ; et le bouton
 * d'action qui flotte sur le contenu, comme `PiedDAction`. Les mesures sont celles de
 * `BdeDetailsScreen.tsx`.
 */

import { useState } from 'react';

import { urlDeRendu } from '../../../../../src/shared/visuels/rendu';
import { DescriptionApercu } from './Description';
import { LARGEUR_VISUEL, ratioDeCadre, type AnnonceApercu } from './modele';

const DENSITE = 2;

/** Un visuel dans son cadre adaptatif : le ratio se lit a son chargement, le carre est le format attendu avant. */
function CadreVisuel({ url }: { readonly url: string }) {
    const [ratio, setRatio] = useState(1);
    return (
        <div className="ap-visuel" style={{ aspectRatio: ratio }}>
            <img
                src={urlDeRendu(url, { largeur: LARGEUR_VISUEL * DENSITE, qualite: 80 })}
                alt=""
                onLoad={(evenement) => setRatio(ratioDeCadre(evenement.currentTarget.naturalWidth, evenement.currentTarget.naturalHeight))}
            />
        </div>
    );
}

export function Fiche({ annonce, teinte }: { readonly annonce: AnnonceApercu; readonly teinte: string }) {
    const bouton = annonce.ctaTexte !== null && annonce.ctaLien !== null;
    return (
        <div className="ap-fiche">
            <div className={`ap-fiche-defilement ${bouton ? 'avec-bouton' : ''}`}>
                {annonce.imageUrl !== null ? <CadreVisuel url={annonce.imageUrl} /> : null}
                <div className="ap-heros">
                    <i className="mdi mdi-bullhorn ap-filigrane" style={{ color: teinte }} aria-hidden="true" />
                    <div className="ap-kicker">{annonce.emetteur}</div>
                    <h3 className="ap-grand-titre">{annonce.titre}</h3>
                    {annonce.accroche !== null ? <p className="ap-chapeau">{annonce.accroche}</p> : null}
                </div>
                {annonce.description !== null ? <DescriptionApercu texte={annonce.description} teinte={teinte} /> : null}
                {annonce.images.length > 0 ? (
                    <div className="ap-galerie">
                        {annonce.images.map((url, rang) => <CadreVisuel key={`${rang}-${url}`} url={url} />)}
                    </div>
                ) : null}
                {annonce.aUnLieu ? (
                    <div className="ap-lieu">
                        <div className="ap-tete"><span className="ap-tete-icone" style={{ background: `${teinte}1A`, color: teinte }}><i className="mdi mdi-map-marker" aria-hidden="true" /></span><h4>S’y rendre</h4></div>
                        <div className="ap-plan"><i className="mdi mdi-map" aria-hidden="true" /></div>
                    </div>
                ) : null}
            </div>
            {bouton ? <div className="ap-pied-action"><span className="ap-bouton">{annonce.ctaTexte}</span></div> : null}
        </div>
    );
}

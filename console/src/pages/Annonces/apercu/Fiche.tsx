/**
 * La fiche d'une annonce, en HTML : le visuel au ratio de l'image, borne entre 3:4 et 16:9 ; le
 * heros — le filigrane, le kicker, le titre, le chapeau — ; la description par la grammaire
 * partagee ; la galerie dans le meme cadre ; la place de la carte « S'y rendre » ; et le bouton
 * d'action qui flotte sur le contenu, comme `PiedDAction`. Les mesures sont celles de
 * `BdeDetailsScreen.tsx`, sur l'ecran d'un iPhone 13 Pro : la fiche n'en montre pas plus.
 *
 * Elle se cale sur ce qu'on edite : le heros pour le titre et l'accroche, la section du curseur pour
 * la description, la galerie, le lieu — sans defiler si l'endroit est deja a l'ecran.
 */

import { useEffect, useRef, useState } from 'react';

import { urlDeRendu } from '../../../../../src/shared/visuels/rendu';
import { DescriptionApercu } from './Description';
import { LARGEUR_VISUEL, ratioDeCadre, type AnnonceApercu, type ZoneDeFiche } from './modele';

const DENSITE = 2;
/** L'air laisse au-dessus de l'endroit ou la fiche se cale. */
const MARGE_DE_CALAGE = 24;

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

/**
 * Amene l'endroit vise dans la fiche, s'il n'y est pas deja en entier ; sans animation si le poste la
 * refuse. `contenu` change quand l'endroit apparait — la galerie apres un televersement, le lieu apres
 * un collage — pour que la fiche s'y cale alors, et pas seulement quand le champ change.
 */
function useCalage(defilement: React.RefObject<HTMLDivElement | null>, selecteur: string | null, contenu: string): void {
    useEffect(() => {
        const conteneur = defilement.current;
        const cible = selecteur === null ? null : conteneur?.querySelector<HTMLElement>(selecteur) ?? null;
        if (conteneur === null || cible === null) return;
        const vue = conteneur.getBoundingClientRect();
        const boite = cible.getBoundingClientRect();
        const dejaVisible = boite.top >= vue.top && boite.bottom <= vue.bottom;
        if (dejaVisible) return;
        const sansMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        conteneur.scrollTo({ top: conteneur.scrollTop + boite.top - vue.top - MARGE_DE_CALAGE, behavior: sansMouvement ? 'auto' : 'smooth' });
    }, [defilement, selecteur, contenu]);
}

export interface FicheProps {
    readonly annonce: AnnonceApercu;
    readonly teinte: string;
    readonly zone: ZoneDeFiche | null;
    /** La section de la description ou est le curseur, quand on l'edite. */
    readonly sectionActive: number | null;
}

export function Fiche({ annonce, teinte, zone, sectionActive }: FicheProps) {
    const defilement = useRef<HTMLDivElement>(null);
    const bouton = annonce.ctaTexte !== null && annonce.ctaLien !== null;
    const selecteur = zone === 'description' && sectionActive !== null ? `[data-bloc="${sectionActive}"]` : (zone === null ? null : `[data-zone="${zone}"]`);
    useCalage(defilement, selecteur, `${annonce.images.length}|${annonce.aUnLieu ? 1 : 0}|${annonce.description === null ? 0 : 1}`);
    return (
        <div className="ap-fiche">
            <div ref={defilement} className={`ap-fiche-defilement ${bouton ? 'avec-bouton' : ''}`}>
                {annonce.imageUrl !== null ? <CadreVisuel url={annonce.imageUrl} /> : null}
                <div className="ap-heros" data-zone="heros">
                    <i className="mdi mdi-bullhorn ap-filigrane" style={{ color: teinte }} aria-hidden="true" />
                    <div className="ap-kicker">{annonce.emetteur}</div>
                    <h3 className="ap-grand-titre">{annonce.titre}</h3>
                    {annonce.accroche !== null ? <p className="ap-chapeau">{annonce.accroche}</p> : null}
                </div>
                {annonce.description !== null ? (
                    <div data-zone="description"><DescriptionApercu texte={annonce.description} teinte={teinte} sectionActive={zone === 'description' ? sectionActive : null} /></div>
                ) : null}
                {annonce.images.length > 0 ? (
                    <div className="ap-galerie" data-zone="galerie">
                        {annonce.images.map((url, rang) => <CadreVisuel key={`${rang}-${url}`} url={url} />)}
                    </div>
                ) : null}
                {annonce.aUnLieu ? (
                    <div className="ap-lieu" data-zone="lieu">
                        <div className="ap-tete"><span className="ap-tete-icone" style={{ background: `${teinte}1A`, color: teinte }}><i className="mdi mdi-map-marker" aria-hidden="true" /></span><h4>S’y rendre</h4></div>
                        <div className="ap-plan"><i className="mdi mdi-map" aria-hidden="true" /></div>
                    </div>
                ) : null}
            </div>
            {bouton ? <div className="ap-pied-action"><span className="ap-bouton">{annonce.ctaTexte}</span></div> : null}
        </div>
    );
}

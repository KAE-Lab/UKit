/**
 * La carte v2 d'une annonce, telle que la 6.3 la rend (7-I) : un cadre 4:5, l'image qui le couvre
 * autour de sa focale ou qui s'y contient sur une copie floutee d'elle-meme, le badge du type — rien
 * pour un evenement, la norme ne s'etiquette pas —, le logo du partenaire, l'emetteur en kicker, le
 * titre. Sans visuel, l'accroche fait l'affiche, en grand dans la teinte d'identite ; sans accroche
 * non plus, le pictogramme teinte. Un seul gabarit, deux largeurs : le carrousel et la grille.
 */

import { urlDeRendu } from '../../../../../src/shared/visuels/rendu';
import { positionDeFocale } from '../../../lib/cadrage';
import { badgeDeType, type AnnonceApercu } from './modele';

/** La densite de l'ecran de reference : un rendu deux fois plus large que ses points. */
const DENSITE = 2;

export function Carte({ annonce, largeur, teinte }: { readonly annonce: AnnonceApercu; readonly largeur: number; readonly teinte: string }) {
    const source = annonce.imageUrl === null ? null : urlDeRendu(annonce.imageUrl, { largeur: largeur * DENSITE, qualite: 70 });
    const badge = badgeDeType(annonce.type);
    return (
        <div className="ap-carte" style={{ width: largeur }}>
            <div className="ap-cadre" style={{ background: source === null ? `${teinte}14` : undefined }}>
                {source !== null ? (
                    annonce.ajustement === 'couvrir' ? (
                        <img className="ap-couvre" src={source} alt="" style={{ objectPosition: positionDeFocale(annonce.focale) }} />
                    ) : (
                        <>
                            <img className="ap-flou" src={source} alt="" aria-hidden="true" />
                            <img className="ap-contient" src={source} alt="" />
                        </>
                    )
                ) : annonce.accroche !== null ? (
                    <div className="ap-affiche-typo" style={{ color: teinte }}>{annonce.accroche}</div>
                ) : (
                    <i className="mdi mdi-party-popper ap-picto" style={{ color: teinte }} aria-hidden="true" />
                )}
                {badge !== null ? (
                    <span className="ap-badge" style={{ color: teinte }}>
                        {annonce.partenaire?.logoUrl != null ? <img src={annonce.partenaire.logoUrl} alt="" /> : null}
                        {badge}
                    </span>
                ) : null}
            </div>
            <div className="ap-pied">
                <div className="ap-kicker">{annonce.emetteur}</div>
                <div className="ap-titre">{annonce.titre}</div>
            </div>
        </div>
    );
}

/** Une voisine sans contenu, a la meme hauteur : ce qui montre qu'un carrousel continue. */
export function CarteVoisine({ largeur }: { readonly largeur: number }) {
    return (
        <div className="ap-carte ap-voisine" style={{ width: largeur }} aria-hidden="true">
            <div className="ap-cadre" />
            <div className="ap-pied"><div className="ap-kicker"><span className="ap-trait-texte court" /></div><div className="ap-titre"><span className="ap-trait-texte" /></div></div>
        </div>
    );
}

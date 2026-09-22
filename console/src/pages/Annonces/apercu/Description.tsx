/**
 * La description rendue en HTML, dans le vocabulaire des fiches : l'arbre est celui de
 * `shared/annonces/grammaire.ts` — le meme que l'application dessine —, les tetes de section
 * portent l'icone MaterialCommunityIcons nommee (la meme police, `@mdi/font` 7.4.47, chargee ici,
 * avec l'apercu, jamais avant), les puces, l'exergue, la transition, la signature et la marque de
 * fin suivent les mesures de `DescriptionAnnonce.tsx`.
 */

import '@mdi/font/css/materialdesignicons.min.css';

import { arbreDeDescription, estLeLead, ICONE_PAR_DEFAUT, porteLaSignature, segmentsDeTexte, type ElementDeBloc } from '../../../../../src/shared/annonces/grammaire';

function Riche({ texte }: { readonly texte: string }) {
    return <>{segmentsDeTexte(texte).map((segment, rang) => (segment.gras ? <strong key={rang}>{segment.texte}</strong> : <span key={rang}>{segment.texte}</span>))}</>;
}

const GLYPHES_DE_PUCE: Readonly<Record<number, string>> = { 1: 'circle-medium', 2: 'circle-small', 3: 'minus' };

function Element({ element, lead, teinte }: { readonly element: ElementDeBloc; readonly lead: boolean; readonly teinte: string }) {
    switch (element.type) {
        case 'puce':
            return (
                <div className={`ap-puce niveau-${element.niveau}`}>
                    <i className={`mdi mdi-${GLYPHES_DE_PUCE[element.niveau] ?? 'circle-medium'}`} style={{ color: teinte }} aria-hidden="true" />
                    <span><Riche texte={element.texte} /></span>
                </div>
            );
        case 'exergue':
            return <blockquote className="ap-exergue" style={{ borderLeftColor: teinte }}>{element.texte}</blockquote>;
        case 'transition':
            return <div className="ap-transition"><span className="ap-trait" style={{ background: teinte }} /><p>{element.texte}</p></div>;
        case 'signature':
            return <p className="ap-signature" style={{ color: teinte }}>{element.texte}</p>;
        default:
            return <p className={lead ? 'ap-lead' : 'ap-paragraphe'}><Riche texte={element.texte} /></p>;
    }
}

export function DescriptionApercu({ texte, teinte }: { readonly texte: string; readonly teinte: string }) {
    const { blocs, signatureClot } = arbreDeDescription(texte);
    return (
        <div className="ap-description">
            {blocs.map((bloc, index) => (
                <section key={index} className="ap-bloc">
                    {porteLaSignature(bloc) ? <i className="mdi mdi-feather ap-filigrane" style={{ color: teinte }} aria-hidden="true" /> : null}
                    {bloc.titre !== null ? (
                        <header className="ap-tete">
                            <span className="ap-tete-icone" style={{ background: `${teinte}1A`, color: teinte }}><i className={`mdi mdi-${bloc.icone ?? ICONE_PAR_DEFAUT}`} aria-hidden="true" /></span>
                            <h4>{bloc.titre}</h4>
                        </header>
                    ) : null}
                    {bloc.contenu.length > 0 ? (
                        <div className="ap-contenu">
                            {bloc.contenu.map((element, rang) => <Element key={rang} element={element} lead={estLeLead(index, bloc)} teinte={teinte} />)}
                        </div>
                    ) : null}
                </section>
            ))}
            {signatureClot ? null : <div className="ap-fin"><span style={{ background: teinte }} /></div>}
        </div>
    );
}

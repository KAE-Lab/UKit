/**
 * La coque : la navigation laterale, le pied avec le compte, et le contenu.
 */

import type { ReactNode } from 'react';

import type { Session } from '../auth/useSession';
import { RESSOURCES } from '../schema/tables';
import { NOM_DU_PROJET } from '../supabase';

function Lien({ vers, chemin, children }: { readonly vers: string; readonly chemin: string; readonly children: ReactNode }) {
    return <a href={`#${vers}`} className={`lien-nav ${chemin === vers ? 'actif' : ''}`}>{children}</a>;
}

export interface CoqueProps {
    readonly session: Session;
    readonly chemin: string;
    readonly children: ReactNode;
}

export function Coque({ session, chemin, children }: CoqueProps) {
    return (
        <div className="coque">
            <nav className="laterale">
                <div className="marque"><strong>UKit</strong><span>console</span></div>
                <div className="section">Suivre</div>
                <Lien vers="/" chemin={chemin}>Sources</Lien>
                <Lien vers="/journal" chemin={chemin}>Journal</Lien>
                <div className="section">Publier</div>
                {RESSOURCES.map((ressource) => (
                    <Lien key={ressource.chemin} vers={`/${ressource.chemin}`} chemin={chemin}>{ressource.titre}</Lien>
                ))}
                <div className="section">Compte</div>
                <Lien vers="/compte" chemin={chemin}>
                    {session.email}
                    {session.editeur === false ? <span className="pastille panne"> sans droits</span> : null}
                </Lien>
                <div className="pied">{NOM_DU_PROJET}</div>
            </nav>
            <main className="contenu">{children}</main>
        </div>
    );
}

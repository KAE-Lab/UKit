/**
 * L'application : la garde de session, la coque — presente des la verification —, et la page que
 * le fragment d'URL designe.
 */

import { useCallback, useState } from 'react';

import { Compte } from './auth/Compte';
import { Connexion } from './auth/Connexion';
import { SessionContexte, type Session } from './auth/session';
import { useSession } from './auth/useSession';
import { CampusContexte } from './composants/campus';
import { Coque } from './composants/Coque';
import { EtatVide } from './composants/ui/EtatVide';
import { SqueletteBloc, SqueletteTexte } from './composants/ui/Squelette';
import { campusRetenu, retenirCampus } from './lib/preferences';
import { Annonces } from './pages/Annonces';
import { Journal } from './pages/Journal';
import { Ressource } from './pages/Ressource';
import { Retours } from './pages/Retours';
import { Sources } from './pages/Sources';
import { TableauDeBord } from './pages/TableauDeBord';
import { segmentsDe, useRoute } from './routeur';
import { ressourceDe } from './schema/tables';

function Page({ chemin, session }: { readonly chemin: string; readonly session: Session }) {
    const segments = segmentsDe(chemin);
    if (segments === null) return <TableauDeBord />;
    switch (segments.tete) {
        case 'sources': return <Sources />;
        case 'journal': return <Journal reste={segments.reste} />;
        case 'retours': return <Retours reste={segments.reste} />;
        case 'annonces': return <Annonces reste={segments.reste} />;
        case 'compte': return <Compte session={session} />;
        default: {
            const ressource = ressourceDe(segments.tete);
            if (ressource !== undefined) return <Ressource key={ressource.chemin} descripteur={ressource} reste={segments.reste} />;
            return <div className="carte"><EtatVide>Cette page n’existe pas.</EtatVide></div>;
        }
    }
}

/** Le contenu pendant la verification de session : la forme d'une page, jamais une page blanche. */
function SquelettePage() {
    return (
        <div aria-busy="true" aria-label="Vérification de la session">
            <div className="entete-page"><div style={{ width: '100%' }}><SqueletteTexte largeur="30%" /><div style={{ height: 8 }} /><SqueletteTexte largeur="55%" /></div></div>
            <div className="carte"><SqueletteBloc hauteur={220} /></div>
        </div>
    );
}

export function App() {
    const etat = useSession();
    const { chemin } = useRoute();
    const [campus, setCampus] = useState<string | null>(campusRetenu);
    const choisir = useCallback((code: string | null) => { setCampus(code); retenirCampus(code); }, []);

    if (etat.etat === 'anonyme') return <Connexion />;
    const session = etat.etat === 'connecte' ? etat.session : null;

    return (
        <SessionContexte.Provider value={session}>
            <CampusContexte.Provider value={{ code: campus, choisir }}>
                <Coque session={session} chemin={chemin}>
                    {session === null ? <SquelettePage /> : <Page chemin={chemin} session={session} />}
                </Coque>
            </CampusContexte.Provider>
        </SessionContexte.Provider>
    );
}

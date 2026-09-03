/**
 * L'application : la garde de session, puis la coque et la page que le fragment d'URL designe.
 */

import { Compte } from './auth/Compte';
import { Connexion } from './auth/Connexion';
import { useSession, type Session } from './auth/useSession';
import { Coque } from './composants/Coque';
import { EtatVide } from './composants/EtatVide';
import { Journal } from './pages/Journal';
import { Ressource } from './pages/Ressource';
import { Sources } from './pages/Sources';
import { useChemin } from './routeur';
import { ressourceDe } from './schema/tables';

function Page({ chemin, session }: { readonly chemin: string; readonly session: Session }) {
    if (chemin === '/' || chemin === '/sources') return <Sources />;
    if (chemin === '/journal') return <Journal />;
    if (chemin === '/compte') return <Compte session={session} />;
    const ressource = ressourceDe(chemin);
    if (ressource !== undefined) return <Ressource key={ressource.chemin} descripteur={ressource} />;
    return <EtatVide>Cette page n’existe pas.</EtatVide>;
}

export function App() {
    const etat = useSession();
    const chemin = useChemin();

    if (etat.etat === 'chargement') return null;
    if (etat.etat === 'anonyme') return <Connexion />;

    return (
        <Coque session={etat.session} chemin={chemin}>
            <Page chemin={chemin} session={etat.session} />
        </Coque>
    );
}

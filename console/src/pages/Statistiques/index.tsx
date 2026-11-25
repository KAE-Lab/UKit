/**
 * Les statistiques (7-G, reprises par le lot 0 de la phase 8) : quatre pages et le rapport partenaire,
 * une periode choisie une fois pour toutes, les testeurs exclus par defaut. Les agregats se calculent
 * dans la console (`src/stats/`), sur les lignes de `mesures` lues par semaines.
 *
 * Charge a part, comme Recharts : les autres pages de la console n'en portent pas le poids.
 */

import { EtatVide } from '../../composants/ui/EtatVide';
import { estComparable, libelleDePeriode } from '../../stats/periode';
import { Annonces } from './Annonces';
import { useChoix } from './choix';
import { Filtres } from './Filtres';
import { Onglets, PAGES } from './Onglets';
import { Rapport } from './Rapport';
import { Reglages } from './Reglages';
import { Sources } from './Sources';
import { VueDEnsemble } from './VueDEnsemble';

const CONTENUS = { '': VueDEnsemble, annonces: Annonces, sources: Sources, reglages: Reglages, rapport: Rapport } as const;

export default function Statistiques({ reste }: { readonly reste: string | null }) {
    const choix = useChoix();
    const page = PAGES.find((p) => p.chemin === (reste ?? ''));
    if (page === undefined) return <div className="carte"><EtatVide>Cette page n’existe pas.</EtatVide></div>;
    const Contenu = CONTENUS[page.chemin];
    return (
        <>
            <div className="entete-page">
                <div>
                    <h1>Statistiques</h1>
                    {page.chemin === ''
                        ? <p className="sous-titre">Les chiffres commencent avec la 6.3, et le parc actif ne compte que les téléphones qui gardent les notifications : c’est un minimum.</p>
                        : null}
                </div>
            </div>
            <Onglets actif={page.chemin} params={choix.params} />
            <Filtres choix={choix} />
            <p className="periode-choisie non-imprime">
                {libelleDePeriode(choix.periode)}{page.variation && estComparable(choix.precedente) ? `, comparée à ${libelleDePeriode(choix.precedente)}` : ''}
            </p>
            <Contenu choix={choix} />
        </>
    );
}

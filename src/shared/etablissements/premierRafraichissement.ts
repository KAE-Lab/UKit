/**
 * Le premier rafraichissement du catalogue a-t-il **repondu** ?
 *
 * Le canal « le catalogue a change » existe deja (`AppContext.catalogue`, bouscule par rootContainer
 * quand la surcouche differe du cache). Il ne dit pas si la base a repondu : un premier
 * rafraichissement qui aboutit **sans changement** — cache deja a jour — ne bouscule rien, et rien ne
 * distingue alors « pas encore repondu » de « repondu, rien de neuf ». L'etape d'etablissement de
 * l'accueil a besoin de cette distinction pour attendre la liste complete sans attendre pour rien.
 *
 * Un signal, une seule fois, et une attente plafonnee : une base injoignable **a repondu** (par un
 * echec), et un reseau qui ne repond jamais ne doit pas retenir un ecran — d'ou le plafond, apres
 * lequel la liste connue s'affiche et se complete si la reponse finit par arriver.
 *
 * Une fabrique plutot qu'un etat de module : c'est ce qui le rend jouable sous vitest sans fuite
 * entre les tests. `index.ts` en tient l'unique instance.
 */

export interface PremierRafraichissement {
    /** La premiere reponse est arrivee, bonne ou mauvaise. */
    readonly repondu: () => boolean;
    /** A appeler a la fin de chaque rafraichissement. Sans effet apres la premiere fois. */
    readonly signaler: () => void;
    /** Attend la premiere reponse, ou le plafond, le premier des deux. */
    readonly attendre: (plafondMs: number) => Promise<'repondu' | 'plafond'>;
}

export function creerPremierRafraichissement(): PremierRafraichissement {
    let repondu = false;
    let resoudre: () => void = () => undefined;
    const premiere = new Promise<void>((resolve) => {
        resoudre = resolve;
    });

    return {
        repondu: () => repondu,
        signaler: () => {
            if (repondu) return;
            repondu = true;
            resoudre();
        },
        attendre: (plafondMs) => {
            if (repondu) return Promise.resolve('repondu');
            return new Promise((resolve) => {
                const minuteur = setTimeout(() => resolve('plafond'), plafondMs);
                void premiere.then(() => {
                    clearTimeout(minuteur);
                    resolve('repondu');
                });
            });
        },
    };
}

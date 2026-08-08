/**
 * Les annonces de vie etudiante, lues dans la base de publication.
 *
 * Premiere fonctionnalite alimentee par la base (jalon 6-B). Elle etait, au jalon 6-A, la premiere
 * source migree vers un Blueprint : le fichier reste dans blueprints/ comme temoin du format, mais il
 * n'est plus le chemin de production. **Ce qui vient de notre base se lit avec le client de notre
 * base** — un Blueprint sert a parler a une source *tierce* dont on ne controle ni le format ni la
 * disponibilite, et pour notre propre table l'indirection n'acheterait rien.
 *
 * Le repli sur jsDelivr est parti avec la bascule, et c'est une decision : le depot `ukit-data` cesse
 * d'etre ecrit, donc un repli servirait du contenu perime — et surtout il masquait toute panne, ce
 * qui rendait « la source est morte » et « il n'y a rien a afficher » indistinguables a l'ecran. La
 * parite du cas annonces est retiree du harnais en meme temps.
 *
 * Voir docs/features/campus-vie-etudiante.md et docs/phase-6/6-b-supabase.md.
 */

import {
    baseNonConfiguree,
    describeSupabaseFailure,
    getSupabase,
    reportSupabaseFailure,
} from '../../../shared/supabase';
import type { UkitFailure } from '../../../shared/aetherius';
import { estValide, projeterAnnonce, type BdeAnnonce } from './BdeMapping';

export type { BdeAnnonce } from './BdeMapping';

const TABLE = 'annonces';

/** Les colonnes que les ecrans lisent, nommees plutot que `*` : le schema peut grossir sans cout. */
const COLONNES = 'id,titre,emetteur,accroche,description,image_url,cta_texte,cta_lien,publiee_le,expire_le,active,creee_le';

/**
 * Ce qu'un ecran recoit : une liste, ou un echec deja traduit.
 *
 * Forme calquee sur `BlueprintRun` du socle Aetherius — meme union discriminee, meme `UkitFailure`.
 * Une seule grammaire d'echec dans l'application, quel que soit ce qui a echoue.
 *
 * **Se teste avec `resultat.ok === false`, jamais avec `!resultat.ok`** : sans `strictNullChecks`,
 * TypeScript ne restreint pas une union sur la simple veracite du discriminant. Voir
 * shared/aetherius/runBlueprint.ts.
 */
export type BdeAnnoncesResult =
    | { readonly ok: true; readonly annonces: BdeAnnonce[] }
    | { readonly ok: false; readonly failure: UkitFailure };

function echec(failure: UkitFailure): BdeAnnoncesResult {
    reportSupabaseFailure(TABLE, failure);
    return { ok: false, failure };
}

const BdeService = {
    /**
     * Les annonces publiees, les plus recentes d'abord.
     *
     * Le tri est explicite : une table n'a pas d'ordre, et s'en remettre a celui que la base rend
     * ferait varier l'affichage sans raison. `id` departage a horodatage egal, pour que deux lectures
     * successives donnent la meme liste.
     *
     * La peremption est filtree deux fois — par la politique de lecture, qui protege la donnee, et
     * par `estValide`, qui protegera l'affichage le jour ou la donnee viendra d'un cache local.
     */
    fetchAnnonces: async (): Promise<BdeAnnoncesResult> => {
        const supabase = getSupabase();
        if (supabase === null) {
            return echec(baseNonConfiguree());
        }

        const { data, error } = await supabase
            .from(TABLE)
            .select(COLONNES)
            .order('publiee_le', { ascending: false })
            .order('id', { ascending: true });

        if (error) {
            return echec(describeSupabaseFailure(error));
        }

        // Une liste vide est un resultat, pas un echec : la base a bien repondu, elle n'a rien a
        // publier aujourd'hui. C'est la distinction que toute la Phase 6 existe pour rendre visible.
        const now = new Date();
        return {
            ok: true,
            annonces: (data ?? []).map(projeterAnnonce).filter((annonce) => estValide(annonce, now)),
        };
    },
};

export default BdeService;

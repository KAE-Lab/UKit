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
import { ordonner } from '../../../shared/annonces/ordre';
import { contexteDeCiblage, estCible } from '../../../shared/ciblage';
import { maintenant } from '../../../shared/services/Temps';
import { appliquerVisuel } from '../../../shared/visuels';
import { avecImage, estValide, projeterAnnonce, type BdeAnnonce } from './BdeMapping';

export type { BdeAnnonce } from './BdeMapping';

const TABLE = 'annonces';

/**
 * Les colonnes que les ecrans lisent, nommees plutot que `*` : le schema peut grossir sans cout.
 * `statut` n'y est pas, ni rien de la programmation : la politique de lecture ne laisse sortir que
 * ce qui est publie et deja date (supabase/policies.sql), l'application n'a rien a en decider.
 */
const COLONNES = 'id,titre,emetteur,accroche,description,image_url,images,lat,lng,couleur,cta_texte,cta_lien,publiee_le,expire_le,active,creee_le,audience,etablissements,version_min,version_max,plateformes,type,emplacements,ajustement,focale,priorite,epinglee,creneaux,blurhash,partenaire';

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
     * Les annonces publiees, dans l'ordre ou le carrousel les montre a cet instant.
     *
     * L'ordre est celui de `shared/annonces/ordre.ts` — les epinglees, un creneau actif, la priorite,
     * une rotation par heure —, le module avec lequel la console montre « l'ordre vu a telle heure ».
     * Il ne depend pas de l'ordre ou la base rend les lignes : a rang egal, l'identifiant departage
     * avant la rotation. La requete ne trie donc pas.
     *
     * La peremption est filtree deux fois — par la politique de lecture, qui protege la donnee, et
     * par `estValide`, qui protegera l'affichage le jour ou la donnee viendra d'un cache local.
     *
     * Le ciblage (jalon 6.1-B) se filtre **ici**, pas dans la base : la base ne sait ni la version de
     * l'application, ni l'etablissement choisi, ni si l'appareil est un testeur — et c'est voulu,
     * l'appareil ne lui dit rien de lui (shared/ciblage). Les ecrans ignorent qu'un filtre existe.
     */
    fetchAnnonces: async (): Promise<BdeAnnoncesResult> => {
        const supabase = getSupabase();
        if (supabase === null) {
            return echec(baseNonConfiguree());
        }

        const { data, error } = await supabase.from(TABLE).select(COLONNES);

        if (error) {
            return echec(describeSupabaseFailure(error));
        }

        // Une liste vide est un resultat, pas un echec : la base a bien repondu, elle n'a rien a
        // publier aujourd'hui. C'est la distinction que toute la Phase 6 existe pour rendre visible.
        // `maintenant()` suit la simulation de date : c'est ce qui rend une annonce expiree
        // verifiable sans attendre son echeance (docs/qualite.md).
        const now = maintenant();
        const contexte = contexteDeCiblage();
        const visibles = (data ?? [])
            .map(projeterAnnonce)
            .map((annonce) => avecImage(annonce, appliquerVisuel('annonce', annonce.id, annonce.image_url)))
            .filter((annonce) => estValide(annonce, now) && estCible(annonce.ciblage, contexte));
        // Ordonner apres les filtres, et au meme instant : la rotation tourne chaque groupe de
        // « l'heure modulo sa taille », et le panneau de la console (console/src/pages/Annonces/
        // visibles.ts) ordonne lui aussi ce qui reste une fois la visibilite et le ciblage appliques.
        // Ordonner avant changerait la taille des groupes, donc l'ordre.
        return { ok: true, annonces: ordonner(visibles, now, (annonce) => annonce.ordre) };
    },
};

export default BdeService;

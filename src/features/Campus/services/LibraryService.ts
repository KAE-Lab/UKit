/**
 * Les bibliotheques universitaires, jouees par le moteur embarque.
 *
 * Ce service n'emet plus aucune requete : il joue trois Blueprints — les sites autour d'un point, une
 * affluence, une semaine d'horaires — et travaille la donnee recue.
 *
 * **Le balayage reste applicatif, et c'est le point du jalon.** L'endpoint de decouverte ne rend que
 * les sites proches du point interroge ; couvrir la region demande un run par point de balayage. De
 * tout cela, une seule chose descend dans un fichier : la requete. La liste des points est une
 * decision produit, le filtre de categorie demanderait d'indexer une liste dans un predicat — refuse
 * par les deux moteurs, volontairement — et Haversine est du calcul.
 *
 * Cette liste **vient du catalogue** depuis le jalon 6-G : elle etait en dur ici, ce qui est
 * exactement le genre de constante qui devient fausse au second etablissement. Ce n'est pas une
 * propriete de la source — le fournisseur est national — mais une propriete de l'universite : quelles
 * villes elle couvre.
 *
 * Voir docs/features/campus-bibliotheques.md, docs/phase-6/6-d-campus.md et
 * docs/phase-6/6-g-etablissements.md.
 */

import Translator from '../../../shared/i18n/Translator';
import { BLUEPRINT, reportFailure, runBlueprint, type UkitFailure } from '../../../shared/aetherius';
import type { SemanticTone } from '../../../shared/theme/Theme';
import { getEtablissementActif } from '../../../shared/etablissements';
import { appliquerVisuel } from '../../../shared/visuels';
import {
    estBibliotheque,
    projeterAffluence,
    projeterHoraire,
    projeterSite,
    type AffluenceExtraite,
    type AffluencesData,
    type HoraireExtrait,
    type LibraryInfo,
    type SiteExtrait,
    type SiteProjete,
    type TimetableEntry,
} from './LibraryMapping';
import { getDistanceInKm } from './distance';

export type { AffluencesData, LibraryInfo, TimetableEntry } from './LibraryMapping';

/**
 * Ce qu'un ecran recoit.
 *
 * `secteursMuets` est la reponse a une question que l'ancien code ne se posait pas : que fait-on
 * quand deux points de balayage echouent sur les douze ? Il repondait « rien, on n'en sait rien ».
 * Desormais on le sait, et l'ecran affiche ce qu'on a **en le disant**. Le nombre depend maintenant
 * du catalogue — onze points plus la position de l'etudiant pour Bordeaux — d'ou `secteurs`, rendu a
 * cote plutot que suppose par l'ecran.
 *
 * **Se teste avec `resultat.ok === false`** (voir shared/aetherius/runBlueprint.ts).
 */
export type LibrariesResult =
    | {
          readonly ok: true;
          readonly libraries: LibraryInfo[];
          readonly secteursMuets: number;
          readonly secteurs: number;
      }
    | { readonly ok: false; readonly failure: UkitFailure };

export type AffluenceResult =
    | { readonly ok: true; readonly affluence: AffluencesData }
    | { readonly ok: false; readonly failure: UkitFailure };

export type TimetableResult =
    | { readonly ok: true; readonly entries: TimetableEntry[] }
    | { readonly ok: false; readonly failure: UkitFailure };

/**
 * Le **ton** et le libelle d'un etat d'affluence.
 *
 * Reste dans le service et non dans le module de projection : c'est de la presentation, elle lit la
 * langue choisie, et les composants l'importent d'ici depuis toujours. Seule source de verite de
 * cette semantique — ne pas la reimplementer dans un composant.
 *
 * Un taux inconnu est traite comme « de la place » : afficher un avertissement sans donnee serait
 * trompeur.
 *
 * **Un ton, pas une couleur** (jalon 6-K). Cette fonction rendait un hexadecimal clair en dur, donc
 * la meme couleur dans les deux themes, et deux rouges presque identiques pour « ferme » et
 * « sature » — `#f44336` contre `#ff4436`, une frappe inversee que personne ne pouvait voir. Un
 * service ne sait pas quel theme est actif : il nomme l'etat, le composant le resout par
 * `toneColor` (docs/theme.md).
 */
export function getLibraryStatus(affluenceData?: AffluencesData) {
    const rate = affluenceData?.occupancyRate ?? null;
    const isOpen = affluenceData?.isOpen ?? true;

    let statusTone: SemanticTone = 'danger';
    if (isOpen) {
        if (rate === null || rate < 50) statusTone = 'success';
        else if (rate < 80) statusTone = 'warning';
        else statusTone = 'danger';
    }

    const statusText = isOpen ? Translator.get('BU_OPEN') : Translator.get('BU_CLOSED');

    /**
     * La precision du fournisseur, **a cote** du statut et non collee dedans.
     *
     * Elle etait concatenee : « Closed - Ouvre demain a 09:00 », un libelle traduit soude a une phrase
     * que la source ne publie **qu'en francais**. Le resultat se lisait comme une phrase cassee. Elle
     * reste affichee — l'heure est l'information utile, et la jeter serait pire — mais comme une note
     * secondaire, dans la couleur du texte secondaire : ce qui vient de nous et ce qui vient d'eux ne
     * se ressemblent plus (jalon 6-K).
     */
    const statusNote = !isOpen && affluenceData?.openingText ? affluenceData.openingText : null;

    return { isOpen, rate, statusTone, statusText, statusNote };
}

function commeListe(valeur: unknown): unknown[] {
    return Array.isArray(valeur) ? valeur : [];
}

/**
 * La distance reellement affichee.
 *
 * Celle du fournisseur est relative au **point de balayage**, pas a l'etudiant : elle ne sert que de
 * repli quand le site ne porte pas ses coordonnees.
 */
function distanceDepuis(site: SiteProjete, userLat: number, userLng: number): number | undefined {
    if (site.lat !== undefined && site.lng !== undefined && userLat !== undefined && userLng !== undefined) {
        return getDistanceInKm(userLat, userLng, site.lat, site.lng);
    }
    return site.distanceEstimee === undefined ? undefined : site.distanceEstimee / 1000;
}

export default class LibraryService {
    /**
     * Les bibliotheques de la region, dedoublonnees et triees par distance reelle.
     *
     * Autant de runs concurrents que de points — les runs Act I n'ont aucun etat partage. Un point
     * muet n'emporte pas les autres : on garde ce qui a repondu et on compte le reste. Zero reponse,
     * en revanche, est un echec plein, avec la famille du premier run en erreur.
     *
     * La position de l'etudiant est **toujours** le premier point, quels que soient ceux du
     * catalogue : c'est le seul qui garantit qu'une bibliotheque a cote de lui remonte, y compris
     * s'il est loin de sa fac.
     */
    static async fetchNearbyLibraries(userLat: number, userLng: number): Promise<LibrariesResult> {
        const points = [{ lat: userLat, lng: userLng }, ...getEtablissementActif().bibliothequesPoints];

        const runs = await Promise.all(
            points.map((point) =>
                runBlueprint(BLUEPRINT.CAMPUS_BIBLIOTHEQUES, {
                    inputs: { latitude: point.lat, longitude: point.lng },
                }),
            ),
        );

        const echecs = runs.filter((run) => run.ok === false);
        if (echecs.length === runs.length) {
            const failure = (echecs[0] as { failure: UkitFailure }).failure;
            reportFailure(BLUEPRINT.CAMPUS_BIBLIOTHEQUES, failure);
            return { ok: false, failure };
        }
        if (echecs.length > 0) {
            reportFailure(BLUEPRINT.CAMPUS_BIBLIOTHEQUES, (echecs[0] as { failure: UkitFailure }).failure);
        }

        const repliCampus = Translator.get('CAMPUS');
        const uniques = new Map<string, SiteProjete>();

        for (const run of runs) {
            if (run.ok === false) continue;
            for (const brut of commeListe(run.outputs.sites)) {
                const site = brut as SiteExtrait;
                if (!estBibliotheque(site)) continue;

                const projete = projeterSite(site, repliCampus);
                if (!uniques.has(projete.id)) uniques.set(projete.id, projete);
            }
        }

        const libraries: LibraryInfo[] = Array.from(uniques.values())
            .map((site) => ({
                id: site.id,
                name: site.name,
                campus: site.campus,
                lat: site.lat,
                lng: site.lng,
                slug: site.slug,
                // La photo publiee gagne sur celle du fournisseur, quand il y en a une : la galerie
                // d'Affluences illustre parfois un site avec le hall d'un autre, et rien dans
                // l'application ne permettait de le corriger (docs/backend.md).
                imageUrl: appliquerVisuel('bibliotheque', site.id, site.imageUrl),
                distance: distanceDepuis(site, userLat, userLng),
            }))
            .sort((gauche, droite) => (gauche.distance || 0) - (droite.distance || 0));

        return { ok: true, libraries, secteursMuets: echecs.length, secteurs: runs.length };
    }

    /** L'affluence en direct d'un site. Un site ferme est un resultat, pas un echec. */
    static async getAffluencesData(slug: string): Promise<AffluenceResult> {
        const run = await runBlueprint(BLUEPRINT.CAMPUS_BIBLIOTHEQUE_AFFLUENCE, { inputs: { site: slug } });
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CAMPUS_BIBLIOTHEQUE_AFFLUENCE, run.failure);
            return { ok: false, failure: run.failure };
        }

        return { ok: true, affluence: projeterAffluence(run.outputs as AffluenceExtraite) };
    }

    /** Les horaires d'une semaine. `weekOffset` vaut 0 pour la semaine courante, et se decale. */
    static async fetchLibraryTimetable(slug: string, weekOffset: number = 0): Promise<TimetableResult> {
        const run = await runBlueprint(BLUEPRINT.CAMPUS_BIBLIOTHEQUE_HORAIRES, {
            inputs: { site: slug, semaine: weekOffset },
        });
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CAMPUS_BIBLIOTHEQUE_HORAIRES, run.failure);
            return { ok: false, failure: run.failure };
        }

        return {
            ok: true,
            entries: commeListe(run.outputs.entrees).map((entree) => projeterHoraire(entree as HoraireExtrait)),
        };
    }
}

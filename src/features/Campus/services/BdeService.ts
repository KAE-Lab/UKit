/**
 * Les annonces de vie etudiante.
 *
 * Premiere source migree vers un Blueprint (jalon 6-A) : la plus simple du lot — un fichier
 * statique, une requete, un filtre declaratif — donc celle dont l'echec ne peut venir que du socle.
 *
 * La signature ne bouge pas : les ecrans ne savent pas ce qui se passe derriere, et c'est ce qui
 * garde la migration reversible. L'ancien chemin reste en repli jusqu'a ce que la parite soit verte
 * sur des donnees reelles ; il sort au jalon 6-H, pas avant et pas plus tard.
 *
 * Voir docs/features/campus-vie-etudiante.md et docs/phase-6/6-a-socle.md.
 */

import { BLUEPRINT, reportFailure, runBlueprint, ukitFailure } from '../../../shared/aetherius';

export interface BdeAnnonce {
    id: string;
    is_active: boolean;
    expires_at: string;
    title: string;
    issuer_name: string;
    image_url?: string;
    info_label?: string;
    long_desc?: string;
    cta_text?: string;
    cta_link?: string;
}

/** Une annonce telle que le Blueprint la rend : champs nommes en francais, `is_active` deja filtre. */
interface AnnoncePubliee {
    id?: unknown;
    titre?: unknown;
    emetteur?: unknown;
    expire_le?: unknown;
    accroche?: unknown;
    desc_longue?: unknown;
    image?: unknown;
    cta_texte?: unknown;
    cta_lien?: unknown;
}

/** Une extraction qui ne trouve pas un champ rend `null` ; le contrat applicatif, lui, l'omet. */
function texte(value: unknown): string | undefined {
    return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Projette une annonce publiee sur le contrat applicatif.
 *
 * `is_active` est vrai par construction : le predicat `where` du Blueprint ne laisse passer que les
 * annonces actives. Le champ reste dans le contrat parce que les ecrans le lisent, et le mentir
 * serait pire que le calculer.
 */
function projeter(item: AnnoncePubliee): BdeAnnonce {
    return {
        id: String(item.id ?? ''),
        is_active: true,
        expires_at: typeof item.expire_le === 'string' ? item.expire_le : '',
        title: texte(item.titre) ?? '',
        issuer_name: texte(item.emetteur) ?? '',
        image_url: texte(item.image),
        info_label: texte(item.accroche),
        long_desc: texte(item.desc_longue),
        cta_text: texte(item.cta_texte),
        cta_link: texte(item.cta_lien),
    };
}

/**
 * La peremption est appliquee **ici**, jamais dans le Blueprint.
 *
 * Un predicat d'extraction ne connait que son element, jamais l'heure de l'appareil. Ce n'est pas un
 * manque : la meme donnee peut ainsi etre affichee grisee plutot que masquee, ce qu'un filtre cote
 * extraction interdirait.
 */
function estValide(annonce: BdeAnnonce, now: Date): boolean {
    return new Date(annonce.expires_at) > now;
}

/**
 * Le chemin historique, conserve **tel quel** en repli — URL en dur comprise.
 *
 * Le centraliser dans `constants/urls.ts` etalerait sur deux fichiers du code qui doit disparaitre
 * d'un bloc ; l'URL vit desormais dans les `vars` du Blueprint, qui est son bon endroit.
 *
 * TODO(6-H) : retirer cette fonction et son appel.
 */
async function legacyFetchAnnonces(): Promise<BdeAnnonce[]> {
    try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/annonces.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        const now = new Date();

        if (data && data.annonces) {
            return data.annonces.filter((item: BdeAnnonce) => {
                if (!item.is_active) return false;
                const expiresAt = new Date(item.expires_at);
                return expiresAt > now;
            });
        }
        return [];
    } catch (error) {
        console.error('Error fetching annonces:', error);
        return [];
    }
}

const BdeService = {
    fetchAnnonces: async (): Promise<BdeAnnonce[]> => {
        const run = await runBlueprint(BLUEPRINT.CAMPUS_ANNONCES);

        // `=== false` et non `!run.ok` : sans `strictNullChecks`, la seconde forme ne restreint pas
        // l'union. Voir runBlueprint.ts.
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CAMPUS_ANNONCES, run.failure);
            return legacyFetchAnnonces();
        }

        const publiees = run.outputs.annonces;
        if (!Array.isArray(publiees)) {
            // Le moteur rend toujours une liste pour une extraction JSON ; si ce n'est pas le cas,
            // c'est le Blueprint qui a change de forme, pas la source. On le dit plutot que de
            // rendre une liste vide qui passerait pour une absence d'annonces.
            const echec = ukitFailure('blueprint', "la sortie 'annonces' n'est pas une liste");
            reportFailure(BLUEPRINT.CAMPUS_ANNONCES, echec);
            return legacyFetchAnnonces();
        }

        const now = new Date();
        return publiees.map(projeter).filter((annonce) => estValide(annonce, now));
    },
};

export default BdeService;

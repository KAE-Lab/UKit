/**
 * Cas de parite : l'affluence en direct.
 *
 * Deux sites, choisis pour que le cas reste vrai a toute heure : quel que soit celui qui est ouvert,
 * les deux chemins doivent rendre le meme etat. C'est justement ce que la sonde « site ferme » verifie
 * — un site ferme rend `liveAttendance` nul, donc aucun taux, et ce n'est pas un echec.
 *
 * Voir tools/parity/README.md.
 */

import { ENTETES_AFFLUENCES, jouer } from './commun.mjs';

export const NAME = 'bu-affluence';

const SITES = ['bu-droit-lettres-pessac', 'bust-talence'];

/** Le chemin migre : joue le Blueprint pour chaque site et rend la donnee au format applicatif. */
export async function viaBlueprint() {
    const releves = [];
    for (const site of SITES) {
        const outputs = await jouer('ukit-campus-bibliotheque-affluence.blueprint.json', { site });
        releves.push({
            site,
            isOpen: outputs.ouvert === true,
            // Les deux formes coexistent selon les sites : le Blueprint extrait les deux, le choix
            // reste applicatif — un `??` n'est pas exprimable dans une extraction.
            occupancyRate: outputs.pourcentage ?? outputs.occupation ?? null,
            closingTime: outputs.ferme_a || undefined,
            openingText: outputs.texte_ouverture || undefined,
        });
    }
    return releves;
}

/** Le chemin historique, tel qu'il etait avant la migration — recopie ici volontairement. */
export async function viaLegacy() {
    const releves = [];
    for (const site of SITES) {
        const response = await fetch(`https://api.affluences.com/app/v4/sites/${site}/live-data`, {
            method: 'GET',
            headers: ENTETES_AFFLUENCES,
        });
        if (!response.ok) throw new Error(`legacy: statut ${response.status} pour ${site}`);

        const json = await response.json();
        const payload = json.data;

        let occupancyRate = null;
        if (payload?.liveAttendance) {
            occupancyRate = payload.liveAttendance.percentage ?? payload.liveAttendance.occupancy ?? null;
        }

        releves.push({
            site,
            isOpen: payload?.status?.isOpen ?? false,
            occupancyRate,
            closingTime: payload?.status?.closingAt,
            openingText: payload?.status?.openingText,
        });
    }
    return releves;
}

/**
 * Ce que la comparaison regarde.
 *
 * `openingText` porte une date relative (« Ouvre le lun. 17/08 a 09:00 ») : elle vient de la source
 * et est identique des deux cotes au meme instant, donc elle se compare. Ce qu'il ne faut pas
 * comparer, c'est une valeur que **notre** code calculerait a partir de l'heure de la machine.
 */
export function project(item) {
    return {
        site: item.site,
        isOpen: item.isOpen,
        occupancyRate: item.occupancyRate ?? null,
        closingTime: item.closingTime || null,
        openingText: item.openingText || null,
    };
}

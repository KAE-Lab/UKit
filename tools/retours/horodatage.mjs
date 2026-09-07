/**
 * L'horodatage d'une reponse, ramene a un instant UTC.
 *
 * Google ecrit la meme cellule de deux facons selon le chemin de sortie :
 *
 *   - l'adresse d'export de la feuille rend `9/1/2026 7:46:43` — l'heure murale de la feuille, sans
 *     fuseau ; celle de UKit est reglee sur Europe/Paris ;
 *   - le fichier telecharge depuis l'interface rend `2026/09/01 8:46:43 AM GMT+3` — l'heure de
 *     l'exportateur, avec son decalage.
 *
 * Les deux designent le meme instant, et c'est cet instant qui entre dans la cle d'un retour
 * (projection.mjs). Le decalage d'un fuseau nomme se lit dans `Intl` : aucune bibliotheque, et
 * l'heure d'ete est celle du calendrier, pas une constante.
 */

const FORME_EXPORTATEUR = /^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM) GMT([+-])(\d{1,2})(?::(\d{2}))?$/;
const FORME_FEUILLE = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/;
const FORME_ISO = /^\d{4}-\d{2}-\d{2}T/;

const MINUTE_MS = 60_000;

/**
 * Le decalage, en minutes, entre l'heure murale d'un fuseau et UTC a un instant donne.
 *
 * @param {number} instantMs
 * @param {string} fuseau un nom IANA (`Europe/Paris`)
 * @returns {number}
 */
export function decalageMinutes(instantMs, fuseau) {
    const instant = Math.floor(instantMs / 1000) * 1000;
    const format = new Intl.DateTimeFormat('en-US', {
        timeZone: fuseau,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const parties = Object.fromEntries(format.formatToParts(new Date(instant)).map((partie) => [partie.type, partie.value]));
    const mur = Date.UTC(
        Number(parties.year), Number(parties.month) - 1, Number(parties.day),
        Number(parties.hour), Number(parties.minute), Number(parties.second),
    );
    return Math.round((mur - instant) / MINUTE_MS);
}

function calendrierValide(annee, mois, jour, heure, minute, seconde) {
    return mois >= 1 && mois <= 12 && jour >= 1 && jour <= 31 && heure <= 23 && minute <= 59 && seconde <= 59
        && annee >= 2000 && annee <= 2100;
}

/**
 * Un horodatage tel que Google l'ecrit, ou un ISO 8601, vers un instant UTC en ISO. `null` quand
 * la forme n'est pas reconnue : l'appelant decide, et pour un import c'est un refus.
 *
 * @param {string} brut
 * @param {string} [fuseauFeuille] le fuseau de la feuille, pour la forme sans fuseau
 * @returns {string | null}
 */
export function versUtc(brut, fuseauFeuille = 'Europe/Paris') {
    const texte = brut.trim();

    const exportateur = FORME_EXPORTATEUR.exec(texte);
    if (exportateur !== null) {
        const [, annee, mois, jour, heure12, minute, seconde, meridien, signe, heures, minutes] = exportateur;
        const heure = (Number(heure12) % 12) + (meridien === 'PM' ? 12 : 0);
        if (Number(heure12) < 1 || Number(heure12) > 12) return null;
        if (!calendrierValide(Number(annee), Number(mois), Number(jour), heure, Number(minute), Number(seconde))) return null;
        const decalage = (signe === '-' ? -1 : 1) * (Number(heures) * 60 + Number(minutes ?? 0));
        const utc = Date.UTC(Number(annee), Number(mois) - 1, Number(jour), heure, Number(minute), Number(seconde)) - decalage * MINUTE_MS;
        return new Date(utc).toISOString();
    }

    const feuille = FORME_FEUILLE.exec(texte);
    if (feuille !== null) {
        const [, mois, jour, annee, heure, minute, seconde] = feuille.map(Number);
        if (!calendrierValide(annee, mois, jour, heure, minute, seconde)) return null;
        const naif = Date.UTC(annee, mois - 1, jour, heure, minute, seconde);
        // Deux passages : le decalage se lit a un instant, et le premier essai est a l'heure murale.
        // Au bord d'un changement d'heure, le second passage corrige le premier.
        const essai = naif - decalageMinutes(naif, fuseauFeuille) * MINUTE_MS;
        const utc = naif - decalageMinutes(essai, fuseauFeuille) * MINUTE_MS;
        return new Date(utc).toISOString();
    }

    if (FORME_ISO.test(texte)) {
        const instant = Date.parse(texte);
        return Number.isNaN(instant) ? null : new Date(instant).toISOString();
    }

    return null;
}

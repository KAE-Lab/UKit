/**
 * La boite a idees (lot 4 ; docs/phase-8/4-sondages-idees-notation.md) : les idees que l'equipe retient,
 * reformule et publie, avec « moi aussi » — un vote par appareil, sans rien de l'appareil — et la sortie
 * d'une idee soutenue, que l'appareil annonce en comparant ses soutiens aux statuts publies.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ResultatDeContribution } from '../communaute';
import { ideeAAnnoncer, lireIdee, type Idee } from './donnees';
import { lireVotes, noterVote } from './memoire';
import { direMoiAussiSur, lireLesLignes, lireLesVotes, type GenreDeSuivi } from './suivis';

const IDEES: GenreDeSuivi = {
    table: 'idees',
    colonnes: 'id, titre, detail, statut, version_livree, maj_le',
    statuts: ['proposee', 'en_cours', 'livree'],
    cache: 'idees@1',
    votes: 'idees-votes@1',
    sujet: 'idee.moi_aussi',
};
const CLE_ANNONCEES = 'idees-annoncees@1';
const CLE_LECTURE = 'idees-lecture@1';
/** La sortie d'une idee se guette au plus toutes les six heures, comme les reponses aux retours. */
const INTERVALLE_MS = 6 * 60 * 60_000;

export type { Idee };

export async function lireLesIdees(): Promise<Idee[]> {
    return (await lireLesLignes(IDEES)).map(lireIdee).filter((i): i is Idee => i !== null);
}

export function lireLesSoutiens(): Promise<string[]> {
    return lireLesVotes(IDEES);
}

export function soutenir(id: string): Promise<ResultatDeContribution> {
    return direMoiAussiSur(IDEES, id, 'oui');
}

/**
 * Une idee soutenue par cet appareil et livree depuis, a annoncer une fois ; `null` sinon. Ne lit la
 * base que si l'appareil a soutenu une idee, et au plus toutes les six heures. Ne leve jamais.
 */
export async function guetterUneSortie(maintenant: number = Date.now()): Promise<Idee | null> {
    try {
        const soutiens = await lireLesSoutiens();
        if (soutiens.length === 0) return null;
        const derniere = Number(await AsyncStorage.getItem(CLE_LECTURE).catch(() => null));
        if (Number.isFinite(derniere) && maintenant - derniere < INTERVALLE_MS) return null;
        const idees = await lireLesIdees();
        await AsyncStorage.setItem(CLE_LECTURE, String(maintenant)).catch(() => undefined);
        return ideeAAnnoncer(idees, soutiens, await lireVotes(CLE_ANNONCEES));
    } catch {
        return null;
    }
}

export async function marquerAnnoncee(id: string): Promise<void> {
    await noterVote(id, CLE_ANNONCEES);
}

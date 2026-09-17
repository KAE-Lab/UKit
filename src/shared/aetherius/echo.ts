/**
 * L'echo des en-tetes : un document de Blueprint **inline**, pour le menu de developpement seulement.
 *
 * Les six Blueprints Celcat posent un `User-Agent` qui nous nomme (jalon 7-C). Le moteur passe les
 * en-tetes tels quels ; ce qui reste a prouver, c'est que le `fetch` natif d'Expo laisse partir
 * celui-la, sur chaque build. Ce document demande a un service d'echo de renvoyer les en-tetes recus,
 * et le panneau Blueprints affiche le `User-Agent` qui est arrive.
 *
 * Inline, et non un fichier de `blueprints/` : ce dossier est publie en entier par
 * `npm run blueprints:publish`, et le registre ne resout que des noms du socle. Il n'a pas de
 * version non plus — le meme choix que les Blueprints des sondes (sondes/*.blueprint.json).
 *
 * Si l'en-tete ne part pas : `EXPO_PUBLIC_USE_RN_FETCH=1` a la construction (docs/plateforme.md).
 */

import { describeFailure, type Blueprint } from '@aetherius/engine';

import { getAetheriusClient } from './client';
import { describeUkitFailure } from './failures';

export const USER_AGENT_UKIT = 'UKit (+https://github.com/KAE-Lab/UKit; contact@kaelab.dev)';

export const ECHO_EN_TETES: Blueprint = {
    aetherius: '1.0',
    name: 'ukit.dev.echo-en-tetes',
    description: "L'echo des en-tetes envoyes par le moteur, pour verifier le User-Agent sur un build.",
    act: 'vector',
    vars: { api: 'https://httpbin.org', user_agent: USER_AGENT_UKIT },
    steps: [
        {
            id: 'echo',
            action: 'http.request',
            method: 'GET',
            url: '{{ vars.api }}/headers',
            headers: { Accept: 'application/json', 'User-Agent': '{{ vars.user_agent }}' },
            expect: { status: 200 },
            extract: { en_tetes: { from: 'json', path: '$.headers' } },
        },
    ],
    outputs: { en_tetes: '{{ steps.echo.en_tetes }}' },
};

export type EchoEnTetes = { readonly ok: true; readonly userAgent: string | null } | { readonly ok: false; readonly detail: string };

/** Joue l'echo et rend le `User-Agent` recu par le service, ou `null` s'il n'est pas arrive. */
export async function jouerEcho(): Promise<EchoEnTetes> {
    try {
        const result = await getAetheriusClient().run(ECHO_EN_TETES, { inputs: {} });
        if (describeFailure(result) !== undefined) {
            const echec = describeUkitFailure(result);
            return { ok: false, detail: echec.detail ?? echec.kind };
        }
        const enTetes = result.outputs.en_tetes;
        const userAgent = typeof enTetes === 'object' && enTetes !== null ? (enTetes as Record<string, unknown>)['User-Agent'] : undefined;
        return { ok: true, userAgent: typeof userAgent === 'string' ? userAgent : null };
    } catch (erreur) {
        return { ok: false, detail: erreur instanceof Error ? erreur.message : String(erreur) };
    }
}

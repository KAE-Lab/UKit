/**
 * La livraison : le socle, la surcouche, et les gardes qui decident entre les deux.
 *
 * Jouable hors appareil parce que le registre ne depend d'aucune plateforme — un alias de
 * `vitest.config.ts` le resout vers le sous-module qui le porte, la racine du paquet montant une
 * WebView. Le magasin de cache est `memoryCache()`, le reseau un `globalThis.fetch` simule.
 *
 * Ces tests sont la seule facon raisonnable de verifier les neuf gardes du plan de test de
 * docs/phase-6/6-c-livraison.md : les jouer sur un appareil demanderait de publier neuf manifestes
 * volontairement casses en production. L'appareil garde ce qu'il est seul a pouvoir dire — que la
 * correction arrive et se joue.
 *
 *     npm test
 */

import { memoryCache, sha256Hex } from '@aetherius/react-native';
import { afterEach, expect, test } from 'vitest';

import { ALLOWED_SECRETS, BLUEPRINT, BUNDLED, type BlueprintName } from '../../../blueprints';
import { createRegistry, manifestUrl } from './delivery';

const BASE = 'https://exemple.supabase.co';
const NOM = BLUEPRINT.CAMPUS_ANNONCES;
const FICHIER = 'ukit-campus-annonces.blueprint.json';
const NOMS = Object.values(BLUEPRINT) as BlueprintName[];

/** La table est figee par le typage, pas au runtime : quelques tests la detournent puis la rendent. */
type TableMutable = Record<string, { version: string; document: unknown }>;
const INTACT: TableMutable = { ...(BUNDLED as unknown as TableMutable) };
const VRAI_FETCH = globalThis.fetch;

afterEach(() => {
    Object.assign(BUNDLED as unknown as TableMutable, INTACT);
    globalThis.fetch = VRAI_FETCH;
});

/** Un serveur de fichiers minimal, indexe par chemin : tout le reste repond 404. */
function servir(fichiers: Readonly<Record<string, string>>): void {
    globalThis.fetch = ((url: string) => {
        const texte = fichiers[new URL(url).pathname];
        return Promise.resolve(
            texte === undefined ? new Response('', { status: 404 }) : new Response(texte, { status: 200 }),
        );
    }) as unknown as typeof fetch;
}

function chemin(nom: string): string {
    return `/storage/v1/object/public/blueprints/${nom}`;
}

/** Le document embarque, eventuellement retouche : le corpus de reference de ces tests. */
function document(patch: Record<string, unknown> = {}): string {
    return JSON.stringify({ ...(BUNDLED[NOM].document as Record<string, unknown>), ...patch });
}

function manifeste(entree: Record<string, unknown> | null, racine: Record<string, unknown> = {}): string {
    return JSON.stringify({
        manifest: '1',
        generated_at: '2026-08-08T12:00:00.000Z',
        disabled: false,
        blueprints: entree === null ? {} : { [NOM]: entree },
        ...racine,
    });
}

function entree(texte: string, version: string, extra: Record<string, unknown> = {}) {
    return { version, url: FICHIER, sha256: sha256Hex(texte), disabled: false, ...extra };
}

function registre(options: { cache?: ReturnType<typeof memoryCache>; remote?: boolean } = {}) {
    return createRegistry({
        cache: options.cache ?? memoryCache(),
        baseUrl: BASE,
        ...(options.remote !== undefined ? { remote: options.remote } : {}),
    });
}

/** Publie *texte* en *version*, rafraichit, et rend le rapport et le registre. */
async function publier(texte: string, version: string, extra: Record<string, unknown> = {}, racine = {}) {
    servir({
        [chemin('manifest.json')]: manifeste(entree(texte, version, extra), racine),
        [chemin(FICHIER)]: texte,
    });
    const registry = registre();
    return { registry, report: await registry.refresh() };
}

// ---------------------------------------------------------------------------------------------
// Le socle : ce que le jalon 6-A avait etabli et que 6-C doit continuer d'honorer avec deux sources.
// ---------------------------------------------------------------------------------------------

test('les six Blueprints du socle resolvent et sont valides', async () => {
    const registry = registre();

    for (const nom of NOMS) {
        const resolved = await registry.resolve(nom);

        expect(resolved.name).toBe(nom);
        expect(resolved.origin).toBe('bundled');
        expect(resolved.version).toBe(BUNDLED[nom].version);
        expect(resolved.blueprint.name).toBe(nom);
    }
});

test('la resolution ne touche jamais au reseau', async () => {
    globalThis.fetch = (() => {
        throw new Error('la resolution a appele le reseau');
    }) as unknown as typeof fetch;

    // Un run n'attend pas un CDN pour savoir quoi jouer. La regle est la raison d'etre du decoupage
    // entre `resolve()` et `refresh()`.
    const registry = registre();
    await Promise.all(NOMS.map((nom) => registry.resolve(nom)));
});

test('un document embarque invalide echoue a la resolution', async () => {
    (BUNDLED as unknown as TableMutable)[NOM] = {
        version: '99',
        document: { aetherius: '1.0', name: NOM, act: 'vector' },
    };

    await expect(registre().resolve(NOM)).rejects.toThrow();
});

test('aucun Blueprint embarque ne declare un secret hors du perimetre de l application', async () => {
    const registry = registre();

    for (const nom of NOMS) {
        const { blueprint } = await registry.resolve(nom);
        for (const secret of blueprint.secrets ?? []) {
            expect(
                (ALLOWED_SECRETS as readonly string[]).includes(secret),
                `${nom} declare un secret hors perimetre : ${secret}`,
            ).toBe(true);
        }
    }
});

test('les annonces embarquent la version corrigee au jalon 6-A', async () => {
    const { blueprint, version } = await registre().resolve(NOM);

    // La version decide de tout : le distant ne gagne que s'il est strictement superieur.
    expect(version).toBe('2');
    expect(blueprint.steps.some((step) => step.action === 'assert')).toBe(true);
});

// ---------------------------------------------------------------------------------------------
// L'URL du manifeste.
// ---------------------------------------------------------------------------------------------

test('l URL du manifeste derive de celle de la base', () => {
    expect(manifestUrl(BASE)).toBe(`${BASE}/storage/v1/object/public/blueprints/manifest.json`);
    expect(manifestUrl(`${BASE}/`)).toBe(manifestUrl(BASE));
});

test('une application sans base n a pas d URL de manifeste, et le dit', async () => {
    expect(manifestUrl(null)).toBeUndefined();
    expect(manifestUrl('')).toBeUndefined();

    const report = await createRegistry({ cache: memoryCache(), baseUrl: null }).refresh();
    // Une base absente n'est pas une panne de transport : le diagnostic doit distinguer les deux.
    expect(report.ok).toBe(false);
    expect(report.reason).toContain('no manifest URL');
});

// ---------------------------------------------------------------------------------------------
// Le chemin nominal.
// ---------------------------------------------------------------------------------------------

test('une correction plus recente prend la main sur le socle', async () => {
    const texte = document({ description: 'la correction publiee' });
    const { registry, report } = await publier(texte, '3');

    expect(report.ok).toBe(true);
    expect(report.entries).toContainEqual({ name: NOM, outcome: 'updated', version: '3' });

    const resolved = await registry.resolve(NOM);
    expect(resolved.origin).toBe('remote');
    expect(resolved.version).toBe('3');
    expect(resolved.blueprint.description).toBe('la correction publiee');
});

test('un manifeste inchange ne retelecharge rien', async () => {
    const cache = memoryCache();
    const texte = document({ description: 'stable' });
    servir({ [chemin('manifest.json')]: manifeste(entree(texte, '3')), [chemin(FICHIER)]: texte });

    await registre({ cache }).refresh();
    const report = await registre({ cache }).refresh();

    expect(report.entries).toContainEqual({ name: NOM, outcome: 'kept', version: '3' });
});

// ---------------------------------------------------------------------------------------------
// Les gardes. Chacune doit **conserver l'embarque** et le dire.
// ---------------------------------------------------------------------------------------------

test('une empreinte fausse fait refuser l entree', async () => {
    const texte = document({ description: 'corrompue' });
    servir({
        [chemin('manifest.json')]: manifeste({ version: '3', url: FICHIER, sha256: 'a'.repeat(64) }),
        [chemin(FICHIER)]: texte,
    });
    const registry = registre();
    const report = await registry.refresh();

    expect(report.entries[0].outcome).toBe('rejected');
    expect(report.entries[0].reason).toContain('integrity');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un fichier modifie apres la publication du manifeste est refuse', async () => {
    // L'empreinte est celle du fichier publie ; le bucket en sert un autre. C'est exactement ce
    // qu'un intermediaire compromis ferait, et c'est la sonde qui le prouve.
    const publie = document({ description: 'relu en revue' });
    const servi = document({ description: 'substitue apres coup' });
    servir({
        [chemin('manifest.json')]: manifeste(entree(publie, '3')),
        [chemin(FICHIER)]: servi,
    });
    const registry = registre();

    expect((await registry.refresh()).entries[0].outcome).toBe('rejected');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('une version qui ne bat pas l embarquee est ignoree', async () => {
    const { registry, report } = await publier(document({ description: 'trop vieille' }), '2');

    expect(report.entries[0].outcome).toBe('ignored');
    expect(report.entries[0].reason).toContain('not newer');
    expect((await registry.resolve(NOM)).version).toBe('2');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un min_engine trop eleve est ignore, sans erreur visible', async () => {
    const texte = document({ description: 'pour un moteur futur' });
    const { registry, report } = await publier(texte, '3', { min_engine: '99.0.0' });

    expect(report.ok).toBe(true);
    expect(report.entries[0].outcome).toBe('ignored');
    expect(report.entries[0].reason).toContain('needs engine');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un manifeste malforme est refuse en entier, et rien n est remplace', async () => {
    const cache = memoryCache();
    const texte = document({ description: 'deja livree' });
    servir({ [chemin('manifest.json')]: manifeste(entree(texte, '3')), [chemin(FICHIER)]: texte });
    await registre({ cache }).refresh();

    servir({
        [chemin('manifest.json')]: JSON.stringify({
            manifest: '1',
            blueprints: { [NOM]: { version: '4', url: FICHIER, sha256: 'b'.repeat(64), inconnu: true } },
        }),
        [chemin(FICHIER)]: texte,
    });
    const registry = registre({ cache });
    const report = await registry.refresh();

    expect(report.ok).toBe(false);
    expect(report.entries).toHaveLength(0);
    // L'interpretation la plus sure d'un manifeste illisible est de ne rien toucher.
    expect((await registry.resolve(NOM)).version).toBe('3');
});

test('un Blueprint distant qui reclame un secret hors perimetre est refuse avant le cache', async () => {
    const texte = document({ secrets: ['bordeaux_pass', 'trousseau_entier'] });
    const { registry, report } = await publier(texte, '3');

    expect(report.entries[0].outcome).toBe('rejected');
    expect(report.entries[0].reason).toContain('trousseau_entier');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un Blueprint distant invalide au schema est refuse avant le cache', async () => {
    const texte = JSON.stringify({ aetherius: '1.0', name: NOM, act: 'vector' });
    const { registry, report } = await publier(texte, '3');

    expect(report.entries[0].outcome).toBe('rejected');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un document publie sous un nom qui n est pas le sien est refuse', async () => {
    const texte = document({ name: BLUEPRINT.CELCAT_SEMAINE });
    const { report } = await publier(texte, '3');

    expect(report.entries[0].outcome).toBe('rejected');
    expect(report.entries[0].reason).toContain('is named');
});

test('un bucket injoignable laisse l application sur son socle', async () => {
    servir({});
    const registry = registre();
    const report = await registry.refresh();

    expect(report.ok).toBe(false);
    expect(report.reason).toContain('404');
    expect(report.entries).toHaveLength(0);
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un cache local corrompu est purge, sans plantage', async () => {
    const cache = memoryCache();
    await cache.setItem('aetherius/blueprints@1', '{ ceci n est pas du JSON');

    const registry = registre({ cache });
    const resolved = await registry.resolve(NOM);

    // Un document illisible fait perdre la surcouche entiere et retombe sur le socle : c'est le sens
    // du repli, et c'est preferable a un index qui pourrait se contredire.
    expect(resolved.origin).toBe('bundled');
    expect(await registry.list()).toHaveLength(NOMS.length);
});

// ---------------------------------------------------------------------------------------------
// Les trois interrupteurs d'arret.
// ---------------------------------------------------------------------------------------------

test('une entree desactivee par le publieur rend la main au socle', async () => {
    const texte = document({ description: 'a retirer' });
    const { registry, report } = await publier(texte, '3', { disabled: true });

    expect(report.entries[0].outcome).toBe('ignored');
    expect(report.entries[0].reason).toContain('disabled');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('l arret global ramene tout au socle', async () => {
    const texte = document({ description: 'a retirer' });
    const { registry, report } = await publier(texte, '3', {}, { disabled: true });

    expect(report.entries[0].outcome).toBe('ignored');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('une entree disparue du manifeste ramene son Blueprint au socle', async () => {
    const cache = memoryCache();
    const texte = document({ description: 'livree puis retiree' });
    servir({ [chemin('manifest.json')]: manifeste(entree(texte, '3')), [chemin(FICHIER)]: texte });
    await registre({ cache }).refresh();

    servir({ [chemin('manifest.json')]: manifeste(null) });
    const registry = registre({ cache });
    const report = await registry.refresh();

    expect(report.entries[0].outcome).toBe('ignored');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('revert purge la surcouche tout de suite, sans reseau', async () => {
    const texte = document({ description: 'a annuler' });
    const { registry } = await publier(texte, '3');
    expect((await registry.resolve(NOM)).origin).toBe('remote');

    globalThis.fetch = (() => {
        throw new Error('revert a appele le reseau');
    }) as unknown as typeof fetch;
    await registry.revert();

    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('remote false ignore durablement la surcouche, sans la detruire', async () => {
    const cache = memoryCache();
    const texte = document({ description: 'en cache mais ignoree' });
    servir({ [chemin('manifest.json')]: manifeste(entree(texte, '3')), [chemin(FICHIER)]: texte });
    await registre({ cache }).refresh();

    const coupe = registre({ cache, remote: false });
    const report = await coupe.refresh();

    expect(report.ok).toBe(false);
    expect(report.reason).toContain('switched off');
    expect((await coupe.resolve(NOM)).origin).toBe('bundled');
    // Sans la detruire : le meme cache, relu par un registre ordinaire, rend la surcouche.
    expect((await registre({ cache }).resolve(NOM)).origin).toBe('remote');
});
